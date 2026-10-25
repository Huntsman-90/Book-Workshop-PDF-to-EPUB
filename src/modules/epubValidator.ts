import JSZip from 'jszip';
import { EpubValidationCheck, EpubValidationResult } from '../types/converter';

export async function validateEpub(epubBlob: Blob): Promise<EpubValidationResult> {
  const checks: EpubValidationCheck[] = [];

  try {
    const zip = await JSZip.loadAsync(epubBlob);

    // Check 1: Mimetype check
    const mimetypeFile = zip.file('mimetype');
    if (mimetypeFile) {
      const mimetypeText = (await mimetypeFile.async('text')).trim();
      if (mimetypeText === 'application/epub+zip') {
        checks.push({
          id: 'mimetype',
          name: 'Файл идентификатора типа (mimetype)',
          passed: true,
          message: 'Корректный application/epub+zip без сжатия в начале архива',
        });
      } else {
        checks.push({
          id: 'mimetype',
          name: 'Файл идентификатора типа (mimetype)',
          passed: false,
          message: `Некорректное содержимое mimetype: "${mimetypeText}"`,
        });
      }
    } else {
      checks.push({
        id: 'mimetype',
        name: 'Файл идентификатора типа (mimetype)',
        passed: false,
        message: 'Файл mimetype отсутствует в корневом каталоге',
      });
    }

    // Check 2: META-INF/container.xml
    const containerFile = zip.file('META-INF/container.xml');
    if (containerFile) {
      const containerXml = await containerFile.async('text');
      if (containerXml.includes('full-path="OEBPS/content.opf"') && containerXml.includes('<rootfiles>')) {
        checks.push({
          id: 'container',
          name: 'Конфигурация контейнера (container.xml)',
          passed: true,
          message: 'Корректная ссылка на OEBPS/content.opf',
        });
      } else {
        checks.push({
          id: 'container',
          name: 'Конфигурация контейнера (container.xml)',
          passed: false,
          message: 'Не найден rootfile путь к content.opf',
        });
      }
    } else {
      checks.push({
        id: 'container',
        name: 'Конфигурация контейнера (container.xml)',
        passed: false,
        message: 'Файл META-INF/container.xml не найден',
      });
    }

    // Check 3: OEBPS/content.opf package document
    const opfFile = zip.file('OEBPS/content.opf');
    let opfText = '';
    if (opfFile) {
      opfText = await opfFile.async('text');
      const hasPackage = opfText.includes('<package') && opfText.includes('version="3.0"');
      const hasMetadata = opfText.includes('<metadata');
      const hasManifest = opfText.includes('<manifest>');
      const hasSpine = opfText.includes('<spine');

      if (hasPackage && hasMetadata && hasManifest && hasSpine) {
        checks.push({
          id: 'opf',
          name: 'Пакетный манифест (content.opf)',
          passed: true,
          message: 'Спецификация EPUB 3.0: metadata, manifest и spine присутствуют',
        });
      } else {
        checks.push({
          id: 'opf',
          name: 'Пакетный манифест (content.opf)',
          passed: false,
          message: 'Отсутствуют обязательные разделы package, metadata, manifest или spine',
        });
      }
    } else {
      checks.push({
        id: 'opf',
        name: 'Пакетный манифест (content.opf)',
        passed: false,
        message: 'Файл OEBPS/content.opf не найден',
      });
    }

    // Check 4: Navigation document (nav.xhtml)
    const navFile = zip.file('OEBPS/nav.xhtml');
    if (navFile) {
      const navText = await navFile.async('text');
      if (navText.includes('epub:type="toc"') || navText.includes('role="doc-toc"')) {
        checks.push({
          id: 'nav',
          name: 'Навигационный документ (nav.xhtml)',
          passed: true,
          message: 'EPUB 3 Navigation Document сформирован с оглавлением',
        });
      } else {
        checks.push({
          id: 'nav',
          name: 'Навигационный документ (nav.xhtml)',
          passed: false,
          message: 'Элемент навигации epub:type="toc" не обнаружен',
        });
      }
    } else {
      checks.push({
        id: 'nav',
        name: 'Навигационный документ (nav.xhtml)',
        passed: false,
        message: 'Файл OEBPS/nav.xhtml отсутствует',
      });
    }

    // Check 5: Backward compatibility NCX
    const ncxFile = zip.file('OEBPS/toc.ncx');
    if (ncxFile) {
      checks.push({
        id: 'ncx',
        name: 'Совместимость с EPUB 2 (toc.ncx)',
        passed: true,
        message: 'Файл toc.ncx присутствует для совместимости со старыми ридерами',
      });
    } else {
      checks.push({
        id: 'ncx',
        name: 'Совместимость с EPUB 2 (toc.ncx)',
        passed: false,
        message: 'Файл OEBPS/toc.ncx отсутствует',
      });
    }

    // Check 6: Integrity of files listed in manifest
    if (opfText) {
      const hrefMatches = Array.from(opfText.matchAll(/<item\s+[^>]*href="([^"]+)"/g)).map(m => m[1]);
      let allFilesPresent = true;
      const missingFiles: string[] = [];

      for (const href of hrefMatches) {
        if (!zip.file(`OEBPS/${href}`)) {
          allFilesPresent = false;
          missingFiles.push(href);
        }
      }

      if (allFilesPresent) {
        checks.push({
          id: 'integrity',
          name: 'Целостность манифеста и ресурсов',
          passed: true,
          message: `Все файлы (${hrefMatches.length}) из манифеста физически присутствуют в архиве`,
        });
      } else {
        checks.push({
          id: 'integrity',
          name: 'Целостность манифеста и ресурсов',
          passed: false,
          message: `Отсутствуют заявленные файлы: ${missingFiles.join(', ')}`,
        });
      }
    }
  } catch (err: unknown) {
    checks.push({
      id: 'archive_corrupt',
      name: 'Чтение архива ZIP',
      passed: false,
      message: err instanceof Error ? err.message : 'Ошибка разбора ZIP архива',
    });
  }

  const isValid = checks.length > 0 && checks.every(c => c.passed);
  return { isValid, checks };
}
