import { BookChapter, PageScanInfo } from '../types/converter';

export interface StructureResult {
  chapters: BookChapter[];
  headersRemoved: number;
}

// Regex to detect running page numbers at top or bottom of pages
const PAGE_NUMBER_REGEX = /^(?:стр\.?|страница|стор\.?|сторінка|page)?\s*[-–—~]?\s*\d+\s*[-–—~]?$/i;

// Regex to detect chapter headings in Russian, Ukrainian and English
const CHAPTER_HEADING_REGEX = /^\s*(?:(?:ГЛАВА|Глава|РОЗДІЛ|Розділ|ЧАСТЬ|Часть|ЧАСТИНА|Частина|КНИГА|Книга|ТОМ|Том|АКТ|Акт|ДІЯ|Дія|ЭПИЛОГ|Эпилог|ЕПІЛОГ|Епілог|ПРОЛОГ|Пролог|ВВЕДЕНИЕ|Введение|ВСТУП|Вступ|ПРЕДИСЛОВИЕ|Предисловие|ПЕРЕДМОВА|Передмова|ЗАКЛЮЧЕНИЕ|Заключение|ВИСНОВКИ|Висновки|ПОСЛЕСЛОВИЕ|Послесловие|ПІСЛЯМОВА|Післямова|CHAPTER|Chapter|PART|Part|BOOK|Book)\b(?:\s+(?:[0-9IVXLCDM]+|[А-ЯЁІЇЄҐA-Z]+))?|(?:[IVXLCDM]{1,6}\.?)|(?:[0-9]{1,3}\.\s+[А-ЯЁІЇЄҐA-Z]))/i;

/**
 * Normalizes a potential header string for frequency comparison
 */
function normalizeHeaderCandidate(str: string): string {
  return str.toLowerCase().replace(/[0-9\s.,!?:;«»—–()"'…\-]/g, '');
}

/**
 * Finds repeated running headers/footers appearing across pages
 */
export function findRepeatingHeaders(pages: PageScanInfo[]): {
  headerPatterns: Set<string>;
  footerPatterns: Set<string>;
} {
  const headerCandidates = new Map<string, number>();
  const footerCandidates = new Map<string, number>();

  for (const page of pages) {
    if (page.firstLine) {
      const norm = normalizeHeaderCandidate(page.firstLine);
      if (norm.length > 3) {
        headerCandidates.set(norm, (headerCandidates.get(norm) || 0) + 1);
      }
    }
    if (page.lastLine) {
      const norm = normalizeHeaderCandidate(page.lastLine);
      if (norm.length > 3) {
        footerCandidates.set(norm, (footerCandidates.get(norm) || 0) + 1);
      }
    }
  }

  // A line appearing on 3 or more pages (or > 15% of pages) is considered a running header/footer
  const threshold = Math.max(3, Math.floor(pages.length * 0.15));
  const headerPatterns = new Set<string>();
  const footerPatterns = new Set<string>();

  headerCandidates.forEach((count, pattern) => {
    if (count >= threshold) {
      headerPatterns.add(pattern);
    }
  });

  footerCandidates.forEach((count, pattern) => {
    if (count >= threshold) {
      footerPatterns.add(pattern);
    }
  });

  return { headerPatterns, footerPatterns };
}

/**
 * Cleans running headers & page numbers from page text
 */
export function stripHeadersAndFooters(
  pageText: string,
  headerPatterns: Set<string>,
  footerPatterns: Set<string>
): { cleanedPageText: string; removedCount: number } {
  const lines = pageText.split('\n');
  if (lines.length <= 1) {
    return { cleanedPageText: pageText, removedCount: 0 };
  }

  let removedCount = 0;
  const filteredLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check if line is purely a page number
    if (PAGE_NUMBER_REGEX.test(line)) {
      removedCount++;
      continue;
    }

    const norm = normalizeHeaderCandidate(line);

    // If near top of page and matches header pattern
    if (i < 3 && headerPatterns.has(norm)) {
      removedCount++;
      continue;
    }

    // If near bottom of page and matches footer pattern
    if (i >= lines.length - 3 && footerPatterns.has(norm)) {
      removedCount++;
      continue;
    }

    filteredLines.push(lines[i]);
  }

  return {
    cleanedPageText: filteredLines.join('\n'),
    removedCount,
  };
}

/**
 * Escapes text for valid XHTML
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Segments cleaned book pages into structured chapters
 */
export function buildBookChapters(
  pages: Array<{ pageNumber: number; cleanedText: string }>
): StructureResult {
  let headersRemovedTotal = 0;
  const rawChapters: Array<{
    title: string;
    pageStart: number;
    pageEnd: number;
    paragraphs: string[];
  }> = [];

  let currentChapterTitle = 'Начало';
  let currentStartPage = pages.length > 0 ? pages[0].pageNumber : 1;
  let currentParagraphs: string[] = [];

  for (let pIndex = 0; pIndex < pages.length; pIndex++) {
    const page = pages[pIndex];
    const paragraphs = page.cleanedText.split(/\n\n+/);

    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i].trim();
      if (!para) continue;

      // Check if paragraph is a chapter title
      const lines = para.split('\n');
      const firstLine = lines[0].trim();

      const isHeadingPattern = CHAPTER_HEADING_REGEX.test(firstLine);
      const isShortUppercase =
        firstLine.length >= 3 &&
        firstLine.length < 55 &&
        firstLine === firstLine.toUpperCase() &&
        /[А-ЯЁІЇЄҐA-Z]/.test(firstLine);

      if (isHeadingPattern || isShortUppercase) {
        // If we already have accumulated paragraphs, finalize previous chapter
        if (currentParagraphs.length > 0) {
          rawChapters.push({
            title: currentChapterTitle,
            pageStart: currentStartPage,
            pageEnd: page.pageNumber,
            paragraphs: currentParagraphs,
          });
          currentParagraphs = [];
        }

        currentChapterTitle = firstLine;
        currentStartPage = page.pageNumber;

        // If there are subsequent lines in this paragraph, treat them as chapter text
        if (lines.length > 1) {
          const rest = lines.slice(1).join(' ').trim();
          if (rest) currentParagraphs.push(rest);
        }
      } else {
        currentParagraphs.push(para);
      }
    }
  }

  // Push final chapter
  if (currentParagraphs.length > 0) {
    rawChapters.push({
      title: currentChapterTitle,
      pageStart: currentStartPage,
      pageEnd: pages.length > 0 ? pages[pages.length - 1].pageNumber : currentStartPage,
      paragraphs: currentParagraphs,
    });
  }

  // If no chapters detected or only 1 chapter with default title
  if (rawChapters.length === 0) {
    rawChapters.push({
      title: 'Текст книги',
      pageStart: 1,
      pageEnd: pages.length || 1,
      paragraphs: ['(Текст книги не содержит абзацев)'],
    });
  } else if (rawChapters.length === 1 && rawChapters[0].title === 'Начало') {
    rawChapters[0].title = 'Основной текст';
  }

  // Convert to formatted BookChapter with valid XHTML
  const chapters: BookChapter[] = rawChapters.map((ch, idx) => {
    const id = `chapter_${idx + 1}`;
    const escapedTitle = escapeXml(ch.title);

    const xhtmlParagraphs = ch.paragraphs
      .map(p => {
        const escaped = escapeXml(p);
        if (/^[—–-]\s+/.test(p)) {
          return `<p class="dialogue">${escaped}</p>`;
        }
        return `<p>${escaped}</p>`;
      })
      .join('\n');

    const contentHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ru">
<head>
  <meta charset="utf-8" />
  <title>${escapedTitle}</title>
  <link rel="stylesheet" type="text/css" href="styles.css" />
</head>
<body class="chapter">
  <section epub:type="chapter" role="doc-chapter">
    <h2 class="chapter-title">${escapedTitle}</h2>
${xhtmlParagraphs}
  </section>
</body>
</html>`;

    return {
      id,
      title: ch.title,
      pageStart: ch.pageStart,
      pageEnd: ch.pageEnd,
      contentHtml,
      plainText: ch.paragraphs.join('\n\n'),
    };
  });

  return {
    chapters,
    headersRemoved: headersRemovedTotal,
  };
}
