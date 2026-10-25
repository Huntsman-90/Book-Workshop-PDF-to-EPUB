import { CleanLevel } from '../types/converter';

// Well-known Russian and Ukrainian compound word prefixes/suffixes that keep hyphen
const PRESERVE_HYPHEN_PREFIXES = new Set([
  'по', 'кое', 'пів', 'напів', 'экс', 'вице', 'обер', 'унтер', 'лейб', 'штаб',
  'премьер', 'мини', 'макси', 'миди', 'топ', 'онлайн', 'офлайн', 'веб',
  'пресс', 'бизнес', 'арт', 'шоу', 'рок', 'поп', 'джаз', 'эко', 'макро', 'микро',
  'стерео', 'видео', 'аудио', 'фото', 'кино', 'теле', 'радио', 'авиа', 'авто',
  'мото', 'вело', 'био', 'гео', 'гидро', 'агро', 'зоо', 'психо', 'социо', 'хроно'
]);

const PRESERVE_HYPHEN_SUFFIXES = new Set([
  'то', 'либо', 'нибудь', 'таки', 'ка', 'де', 'с', 'небудь', 'таки', 'но'
]);

/**
 * Checks if a hyphenated word across line break is genuinely a compound word (should retain hyphen)
 * or a soft hyphenation split (should be rejoined without hyphen).
 */
function isGenuineCompoundWord(part1: string, part2: string): boolean {
  const p1 = part1.toLowerCase().trim();
  const p2 = part2.toLowerCase().trim();

  // If part1 is a prefix like "по-", "кое-", "пів-"
  if (PRESERVE_HYPHEN_PREFIXES.has(p1)) {
    return true;
  }

  // If part2 is a particle like "-то", "-либо", "-нибудь", "-таки", "-небудь"
  if (PRESERVE_HYPHEN_SUFFIXES.has(p2)) {
    return true;
  }

  // Common prepositions: из-за, из-под
  if ((p1 === 'из' && (p2 === 'за' || p2 === 'под')) || (p1 === 'з' && (p2 === 'за' || p2 === 'під'))) {
    return true;
  }

  // Both parts are capitalized proper nouns, e.g. "Северная-Двина", "Нью-Йорк"
  if (/^[А-ЯЁІЇЄҐA-Z]/.test(part1) && /^[А-ЯЁІЇЄҐA-Z]/.test(part2)) {
    return true;
  }

  // Repeating words like "чуть-чуть", "едва-едва", "ледве-ледве"
  if (p1 === p2) {
    return true;
  }

  // If one part has digits, e.g. "Т-34", "Ил-76", "10-й", "20-летие"
  if (/\d/.test(p1) || /\d/.test(p2)) {
    return true;
  }

  return false;
}

export interface CleanTextResult {
  cleanedText: string;
  hyphensRepaired: number;
  linesJoined: number;
}

/**
 * Cleans extracted PDF/OCR text, repairs word breaks and restores paragraphs.
 */
export function cleanAndRestoreText(rawText: string, level: CleanLevel = 'conservative'): CleanTextResult {
  if (!rawText || !rawText.trim()) {
    return { cleanedText: '', hyphensRepaired: 0, linesJoined: 0 };
  }

  let text = rawText;
  let hyphensRepaired = 0;
  let linesJoined = 0;

  // 1. Normalize line endings and non-standard whitespace
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Replace non-breaking spaces, zero-width spaces, thin spaces
  text = text.replace(/[\u00A0\u2000-\u200B\u202F\u205F]/g, ' ');
  // Remove soft hyphens \u00AD
  text = text.replace(/\u00AD/g, '');

  // 2. Normalize ellipses
  text = text.replace(/\.{3,}/g, '…');

  // 3. Normalize quotes and dashes
  // Straight quotes to typographer quotes where appropriate
  text = text.replace(/"([^"]+)"/g, '«$1»');

  // Handle hyphenations at end of line:
  // Regex looks for a word part ending with hyphen/dash/minus followed by newline and next word part
  // Matches: ([А-Яа-яA-Za-zЁёІ-Їі-їЄ-Ґє-ґ]+)[-–—]\s*\n\s*([А-Яа-яA-Za-zЁёІ-Їі-їЄ-Ґє-ґ]+)
  const hyphenRegex = /([А-Яа-яA-Za-zЁёІ-Їі-їЄ-Ґє-ґ0-9]+)[-–—¬]\s*\n\s*([А-Яа-яA-Za-zЁёІ-Їі-їЄ-Ґє-ґ0-9]+)/g;

  text = text.replace(hyphenRegex, (match, part1, part2) => {
    hyphensRepaired++;
    if (isGenuineCompoundWord(part1, part2)) {
      return `${part1}-${part2}`;
    }
    // Rejoin smoothly
    return `${part1}${part2}`;
  });

  // 4. Rejoin lines that were broken only by PDF wrap width
  // Split into raw lines
  const lines = text.split('\n');
  const paragraphBlocks: string[] = [];
  let currentParagraphLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      if (currentParagraphLines.length > 0) {
        paragraphBlocks.push(currentParagraphLines.join(' '));
        currentParagraphLines = [];
      }
      continue;
    }

    // Check if line looks like dialogue start (em-dash or en-dash followed by space)
    const isDialogue = /^[—–-]\s+/.test(line);

    // Check if previous line ended with a sentence terminator (. ! ? … : » ")
    const prevLine = currentParagraphLines.length > 0 ? currentParagraphLines[currentParagraphLines.length - 1] : '';
    const prevEndsSentence = /[.!?…:»"”]\s*$/.test(prevLine);

    // Check if current line starts with an indent or capital letter after a sentence
    const startsWithCapital = /^[А-ЯЁІЇЄҐA-Z]/.test(line);

    if (currentParagraphLines.length === 0) {
      currentParagraphLines.push(line);
    } else if (isDialogue) {
      // Dialogue starts a new paragraph
      paragraphBlocks.push(currentParagraphLines.join(' '));
      currentParagraphLines = [line];
    } else if (prevEndsSentence && (rawLine.startsWith('   ') || rawLine.startsWith('\t'))) {
      // Indented line after sentence ends is definitely a new paragraph
      paragraphBlocks.push(currentParagraphLines.join(' '));
      currentParagraphLines = [line];
    } else if (prevEndsSentence && startsWithCapital && currentParagraphLines.length >= 2) {
      // If previous line ended with a full stop and this line starts with capital,
      // it might be a new paragraph if the previous line was sufficiently short (e.g. less than 40 chars)
      if (prevLine.length < 50) {
        paragraphBlocks.push(currentParagraphLines.join(' '));
        currentParagraphLines = [line];
      } else {
        linesJoined++;
        currentParagraphLines.push(line);
      }
    } else {
      // Normal line continuation
      linesJoined++;
      currentParagraphLines.push(line);
    }
  }

  if (currentParagraphLines.length > 0) {
    paragraphBlocks.push(currentParagraphLines.join(' '));
  }

  // 5. Extended cleaning if selected
  let cleanedParagraphs = paragraphBlocks;
  if (level === 'extended') {
    cleanedParagraphs = cleanedParagraphs.filter(p => {
      // Remove isolated lone punctuation or single characters on a line
      if (p.length <= 2 && !/[0-9]/.test(p)) return false;
      // Remove lines that are purely garbage symbols (e.g. OCR noise ~~~ _ | \ /)
      const garbageSymbols = (p.match(/[^А-Яа-яЁёІ-Їі-їЄ-Ґє-ґA-Za-z0-9\s.,!?:;«»—–()"'…\-]/g) || []).length;
      if (p.length > 5 && garbageSymbols / p.length > 0.4) {
        return false;
      }
      return true;
    }).map(p => {
      // Remove common OCR noise sequences: e.g. "l" misrecognized as "|", "..."
      return p
        .replace(/([а-яёіїєґ])\s*\|\s*([а-яёіїєґ])/gi, '$1 $2')
        .replace(/\s{2,}/g, ' ')
        .trim();
    });
  }

  // Clean double spaces inside paragraphs
  cleanedParagraphs = cleanedParagraphs.map(p => p.replace(/\s{2,}/g, ' ').trim());

  return {
    cleanedText: cleanedParagraphs.join('\n\n'),
    hyphensRepaired,
    linesJoined,
  };
}
