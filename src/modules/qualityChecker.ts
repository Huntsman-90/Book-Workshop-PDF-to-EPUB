import { PageScanInfo, QualityCategory, QualityIssue, QualityReportData } from '../types/converter';

export function evaluateQuality(
  pages: PageScanInfo[],
  hyphensRepaired: number,
  headersRemoved: number,
  detectedChapters: number
): QualityReportData {
  const issues: QualityIssue[] = [];
  const warnings: string[] = [];

  let textLayerCount = 0;
  let ocrCount = 0;
  let emptyPagesCount = 0;
  let totalConfidenceSum = 0;
  let ocrPagesWithConfidence = 0;
  let totalWords = 0;

  // Compute average characters for non-empty pages
  const nonZeroLengths = pages.map(p => p.charCount).filter(c => c > 0);
  const avgChars = nonZeroLengths.length > 0 ? nonZeroLengths.reduce((a, b) => a + b, 0) / nonZeroLengths.length : 0;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const pageNum = page.pageNumber;

    if (page.ocrApplied) {
      ocrCount++;
      totalConfidenceSum += page.ocrConfidence;
      ocrPagesWithConfidence++;
    } else if (page.hasTextLayer) {
      textLayerCount++;
    }

    // Word count estimation
    const words = page.rawText.trim().split(/\s+/).filter(w => w.length > 0);
    totalWords += words.length;

    // Check 1: Completely empty page
    if (page.charCount === 0) {
      emptyPagesCount++;
      // If it's first or last page it might be a cover or blank end-page
      if (pageNum === 1 || pageNum === pages.length) {
        issues.push({
          pageNumber: pageNum,
          severity: 'warning',
          message: 'Пустая страница (возможно, обложка или форзац)',
        });
      } else {
        issues.push({
          pageNumber: pageNum,
          severity: 'error',
          message: 'Страница не содержит распознанного текста',
        });
      }
      continue;
    }

    // Check 2: Unusually short text (less than 40 chars or < 10% of document average)
    if (page.charCount < 45 && avgChars > 400 && pageNum !== 1 && pageNum !== pages.length) {
      issues.push({
        pageNumber: pageNum,
        severity: 'warning',
        message: `Необычно короткий текст: всего ${page.charCount} симв. (в среднем ${Math.round(avgChars)})`,
        snippet: page.rawText.slice(0, 100),
      });
    }

    // Check 3: Low OCR confidence
    if (page.ocrApplied && page.ocrConfidence < 65) {
      issues.push({
        pageNumber: pageNum,
        severity: 'warning',
        message: `Низкая уверенность OCR: ${Math.round(page.ocrConfidence)}%`,
        snippet: page.rawText.slice(0, 100),
      });
    }

    // Check 4: High ratio of suspicious / non-alphanumeric noise symbols
    const garbageSymbols = (page.rawText.match(/[^А-Яа-яЁёІ-Їі-їЄ-Ґє-ґA-Za-z0-9\s.,!?:;«»—–()"'…\-–]/g) || []).length;
    if (page.charCount > 30 && garbageSymbols / page.charCount > 0.15) {
      issues.push({
        pageNumber: pageNum,
        severity: 'warning',
        message: `Подозрительно высокая доля нетипичных символов (${Math.round((garbageSymbols / page.charCount) * 100)}%)`,
        snippet: page.rawText.slice(0, 100),
      });
    }

    // Check 5: Dangling broken hyphens left at page borders
    if (/[-–—]\s*$/.test(page.rawText.trim())) {
      issues.push({
        pageNumber: pageNum,
        severity: 'warning',
        message: 'Незавершённый перенос слова на границе страницы',
        snippet: page.rawText.trim().slice(-60),
      });
    }
  }

  // Determine overall category
  const errorIssues = issues.filter(i => i.severity === 'error');
  const warningIssues = issues.filter(i => i.severity === 'warning');

  let category: QualityCategory = 'good';
  let categoryLabel = 'Хорошее качество';

  if (errorIssues.length > 0 || emptyPagesCount > Math.max(1, pages.length * 0.15)) {
    category = 'attention';
    categoryLabel = 'Требуется внимание';
    warnings.push('Обнаружены страницы без текста или с критическими дефектами распознавания.');
  } else if (warningIssues.length > 0) {
    category = 'doubts';
    categoryLabel = 'Есть сомнения';
    warnings.push(`Найдено ${warningIssues.length} фрагментов, которые желательно бегло проверить.`);
  } else {
    category = 'good';
    categoryLabel = 'Отличное качество';
  }

  const averageOcrConfidence = ocrPagesWithConfidence > 0 ? Math.round(totalConfidenceSum / ocrPagesWithConfidence) : undefined;

  return {
    category,
    categoryLabel,
    summary: {
      totalPages: pages.length,
      textLayerPages: textLayerCount,
      ocrPages: ocrCount,
      warningPagesCount: issues.length,
      emptyPagesCount,
      hyphensRepaired,
      headersRemoved,
      detectedChapters,
      wordCount: totalWords,
      averageOcrConfidence,
    },
    issues,
    warnings,
  };
}
