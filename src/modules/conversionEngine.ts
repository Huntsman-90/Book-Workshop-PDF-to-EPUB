import {
  BookSettings,
  ConversionProgressState,
  ConversionResult,
  PageScanInfo,
} from '../types/converter';
import { PdfProcessor } from './pdfProcessor';
import { OcrAdapter } from './ocrAdapter';
import { detectLanguage } from './languageDetector';
import { cleanAndRestoreText } from './textCleaner';
import { buildBookChapters, findRepeatingHeaders, stripHeadersAndFooters } from './bookStructure';
import { evaluateQuality } from './qualityChecker';
import { buildEpub3 } from './epubBuilder';
import { validateEpub } from './epubValidator';

export class ConversionEngine {
  private pdfProcessor: PdfProcessor | null = null;
  private ocrAdapter: OcrAdapter | null = null;
  private isCancelled: boolean = false;

  public cancel(): void {
    this.isCancelled = true;
    if (this.pdfProcessor) {
      this.pdfProcessor.cancel();
    }
    if (this.ocrAdapter) {
      this.ocrAdapter.cancel();
    }
  }

  public async run(
    fileData: ArrayBuffer,
    settings: BookSettings,
    filename: string,
    onProgress: (state: ConversionProgressState) => void
  ): Promise<ConversionResult> {
    const startTime = performance.now();
    this.isCancelled = false;

    this.pdfProcessor = new PdfProcessor();
    this.ocrAdapter = new OcrAdapter();

    const warningsAccumulator: string[] = [];

    // Helper to calculate genuine weighted progress across 7 stages
    // Stage weights:
    // 1 (load): 5%
    // 2 (analyze): 15%
    // 3 (extract/ocr): 45%
    // 4 (clean): 15%
    // 5 (structure): 10%
    // 6 (epub): 5%
    // 7 (validate): 5%
    const updateProgress = (
      stageId: ConversionProgressState['stageId'],
      stageNumber: number,
      stageTitle: string,
      currentOperation: string,
      processedPages: number,
      totalPages: number,
      subPercent = 0,
      ocrStatus?: string
    ) => {
      let basePercent = 0;
      let stageWeight = 0;

      switch (stageNumber) {
        case 1:
          basePercent = 0;
          stageWeight = 5;
          break;
        case 2:
          basePercent = 5;
          stageWeight = 15;
          break;
        case 3:
          basePercent = 20;
          stageWeight = 45;
          break;
        case 4:
          basePercent = 65;
          stageWeight = 15;
          break;
        case 5:
          basePercent = 80;
          stageWeight = 10;
          break;
        case 6:
          basePercent = 90;
          stageWeight = 5;
          break;
        case 7:
          basePercent = 95;
          stageWeight = 5;
          break;
      }

      const calculatedPercent = Math.min(99, Math.round(basePercent + stageWeight * Math.min(1, Math.max(0, subPercent))));

      onProgress({
        stageId,
        stageNumber,
        totalStages: 7,
        stageTitle,
        percent: calculatedPercent,
        processedPages,
        totalPages,
        currentOperation,
        ocrStatus,
        warnings: [...warningsAccumulator],
        canCancel: true,
      });
    };

    try {
      // ----------------------------------------------------
      // STAGE 1: Загрузка и подготовка документа
      // ----------------------------------------------------
      updateProgress('loading', 1, 'Загрузка и подготовка', 'Открытие структуры PDF документа...', 0, 0, 0.3);

      const docInfo = await this.pdfProcessor.loadDocument(fileData);
      const totalPages = docInfo.totalPages;

      if (totalPages === 0) {
        throw new Error('PDF документ не содержит страниц');
      }

      updateProgress(
        'loading',
        1,
        'Загрузка и подготовка',
        `Документ готов: ${totalPages} страниц`,
        0,
        totalPages,
        1.0
      );

      // Extract cover if requested
      let coverDataUrl: string | undefined;
      if (settings.extractCover) {
        coverDataUrl = await this.pdfProcessor.extractCover(1);
      }

      if (this.isCancelled) throw new Error('Операция была отменена');

      // ----------------------------------------------------
      // STAGE 2: Анализ страниц и наличия текстового слоя
      // ----------------------------------------------------
      updateProgress('analyzing', 2, 'Анализ страниц', 'Сканирование текстовых слоев...', 0, totalPages, 0);

      const pagesScan: PageScanInfo[] = [];
      let pagesNeedingOcr = 0;

      for (let p = 1; p <= totalPages; p++) {
        if (this.isCancelled) throw new Error('Операция была отменена');

        updateProgress(
          'analyzing',
          2,
          'Анализ страниц',
          `Проверка страницы ${p} из ${totalPages}...`,
          p,
          totalPages,
          p / totalPages
        );

        const scan = await this.pdfProcessor.scanPageText(p);
        pagesScan.push(scan);

        // Determine if OCR will be needed
        if (settings.ocrMode === 'force') {
          pagesNeedingOcr++;
        } else if (settings.ocrMode === 'auto' && !scan.hasTextLayer) {
          pagesNeedingOcr++;
        }
      }

      // Detect language if auto
      let detectedLang = settings.language;
      let outputLang = settings.outputLang;
      const combinedSampleText = pagesScan
        .map(p => p.rawText)
        .join(' ')
        .slice(0, 5000);

      if (settings.language === 'auto' && combinedSampleText.length > 50) {
        const langResult = detectLanguage(combinedSampleText);
        detectedLang = langResult.language;
        outputLang = langResult.bcp47;
      }

      // ----------------------------------------------------
      // STAGE 3: Извлечение текста и OCR
      // ----------------------------------------------------
      updateProgress(
        'extracting',
        3,
        'Извлечение текста и OCR',
        pagesNeedingOcr > 0 ? `Подготовка OCR для ${pagesNeedingOcr} страниц...` : 'Извлечение текстового слоя...',
        0,
        totalPages,
        0
      );

      if (pagesNeedingOcr > 0 && settings.ocrMode !== 'disabled') {
        await this.ocrAdapter.init(detectedLang, (ocrText, ocrProgress) => {
          updateProgress(
            'extracting',
            3,
            'Извлечение текста и OCR',
            ocrText,
            0,
            totalPages,
            ocrProgress * 0.1,
            ocrText
          );
        });
      }

      let processedInStage3 = 0;
      for (let i = 0; i < pagesScan.length; i++) {
        if (this.isCancelled) throw new Error('Операция была отменена');

        const scan = pagesScan[i];
        const pageNum = scan.pageNumber;
        const needsOcr =
          settings.ocrMode === 'force' ||
          (settings.ocrMode === 'auto' && !scan.hasTextLayer);

        if (needsOcr && settings.ocrMode !== 'disabled') {
          updateProgress(
            'extracting',
            3,
            'Извлечение текста и OCR',
            `Страница ${pageNum} из ${totalPages}: оптическое распознавание текста...`,
            processedInStage3,
            totalPages,
            processedInStage3 / totalPages,
            `OCR страницы ${pageNum}`
          );

          try {
            // Render canvas sequentially and recognize
            const canvas = await this.pdfProcessor.renderPageToCanvas(pageNum, 1.6);
            const ocrResult = await this.ocrAdapter.recognizeCanvas(canvas, () => {});

            // Free canvas immediately
            canvas.width = 1;
            canvas.height = 1;

            scan.rawText = ocrResult.text;
            scan.charCount = ocrResult.text.replace(/\s+/g, '').length;
            scan.ocrApplied = true;
            scan.ocrConfidence = ocrResult.confidence;

            if (scan.charCount < 30) {
              warningsAccumulator.push(`Страница ${pageNum}: OCR распознал мало символов (${scan.charCount})`);
            }
          } catch (ocrErr: unknown) {
            if (this.isCancelled) throw ocrErr;
            warningsAccumulator.push(`Страница ${pageNum}: ошибка OCR: ${ocrErr instanceof Error ? ocrErr.message : 'Сбой'}`);
          }
        }

        processedInStage3++;
        updateProgress(
          'extracting',
          3,
          'Извлечение текста и OCR',
          `Страница ${pageNum} из ${totalPages}: обработка завершена`,
          processedInStage3,
          totalPages,
          processedInStage3 / totalPages
        );
      }

      // Terminate OCR worker as soon as extraction finishes to release RAM on mobile
      await this.ocrAdapter.terminate();

      // ----------------------------------------------------
      // STAGE 4: Очистка текста, колонтитулов и восстановление переносов
      // ----------------------------------------------------
      updateProgress('cleaning', 4, 'Очистка текста и переносов', 'Поиск повторяющихся колонтитулов...', 0, totalPages, 0);

      const { headerPatterns, footerPatterns } = findRepeatingHeaders(pagesScan);
      let totalHeadersRemoved = 0;
      let totalHyphensRepaired = 0;

      const cleanedPages: Array<{ pageNumber: number; cleanedText: string }> = [];

      for (let i = 0; i < pagesScan.length; i++) {
        if (this.isCancelled) throw new Error('Операция была отменена');
        const scan = pagesScan[i];

        updateProgress(
          'cleaning',
          4,
          'Очистка текста и переносов',
          `Очистка страницы ${scan.pageNumber} из ${totalPages}...`,
          i + 1,
          totalPages,
          (i + 1) / totalPages
        );

        // 1. Remove running headers & page numbers
        const stripped = stripHeadersAndFooters(scan.rawText, headerPatterns, footerPatterns);
        totalHeadersRemoved += stripped.removedCount;

        // 2. Repair hyphens and restore paragraphs
        const cleanRes = cleanAndRestoreText(stripped.cleanedPageText, settings.cleanLevel);
        totalHyphensRepaired += cleanRes.hyphensRepaired;

        cleanedPages.push({
          pageNumber: scan.pageNumber,
          cleanedText: cleanRes.cleanedText,
        });
      }

      // ----------------------------------------------------
      // STAGE 5: Восстановление структуры книги
      // ----------------------------------------------------
      updateProgress('structuring', 5, 'Восстановление структуры', 'Поиск глав и оглавления...', totalPages, totalPages, 0.3);

      const structureResult = buildBookChapters(cleanedPages);
      totalHeadersRemoved += structureResult.headersRemoved;

      updateProgress(
        'structuring',
        5,
        'Восстановление структуры',
        `Сформировано глав: ${structureResult.chapters.length}`,
        totalPages,
        totalPages,
        1.0
      );

      // Quality assessment
      const qualityReport = evaluateQuality(
        pagesScan,
        totalHyphensRepaired,
        totalHeadersRemoved,
        structureResult.chapters.length
      );

      // ----------------------------------------------------
      // STAGE 6: Формирование EPUB 3 контейнера
      // ----------------------------------------------------
      updateProgress('building_epub', 6, 'Формирование EPUB 3', 'Сборка XHTML глав и манифеста...', totalPages, totalPages, 0.4);

      const updatedSettings: BookSettings = {
        ...settings,
        language: detectedLang,
        outputLang: outputLang || 'ru',
      };

      const epubBlob = await buildEpub3(updatedSettings, structureResult.chapters, coverDataUrl);

      updateProgress('building_epub', 6, 'Формирование EPUB 3', 'EPUB контейнер упакован', totalPages, totalPages, 1.0);

      // ----------------------------------------------------
      // STAGE 7: Проверка структуры созданного файла
      // ----------------------------------------------------
      updateProgress('validating', 7, 'Проверка результата', 'Валидация манифеста и оглавления...', totalPages, totalPages, 0.5);

      const validation = await validateEpub(epubBlob);

      // Final complete progress state (100% only NOW)
      onProgress({
        stageId: 'completed',
        stageNumber: 7,
        totalStages: 7,
        stageTitle: 'Конвертация завершена',
        percent: 100,
        processedPages: totalPages,
        totalPages,
        currentOperation: 'Книга готова к чтению и скачиванию',
        warnings: [...warningsAccumulator],
        canCancel: false,
      });

      const endTime = performance.now();
      const executionTimeSec = Math.round((endTime - startTime) / 1000);

      const fileSizeBytes = epubBlob.size;
      const fileSizeFormatted = fileSizeBytes > 1024 * 1024
        ? `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} МБ`
        : `${Math.round(fileSizeBytes / 1024)} КБ`;

      const epubFilename = filename.replace(/\.pdf$/i, '') + '.epub';

      return {
        epubBlob,
        epubFilename,
        fileSizeBytes,
        fileSizeFormatted,
        chapters: structureResult.chapters,
        coverDataUrl,
        qualityReport,
        validation,
        executionTimeSec,
        settings: updatedSettings,
      };
    } finally {
      if (this.pdfProcessor) {
        this.pdfProcessor.destroy();
        this.pdfProcessor = null;
      }
      if (this.ocrAdapter) {
        await this.ocrAdapter.terminate();
        this.ocrAdapter = null;
      }
    }
  }
}
