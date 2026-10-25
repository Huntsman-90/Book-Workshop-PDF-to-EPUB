import { BookLanguage } from '../types/converter';

/**
 * Detects Russian, Ukrainian, or Mixed Cyrillic language based on character frequency
 */
export function detectLanguage(text: string): {
  language: BookLanguage;
  bcp47: string;
  ukrMarkers: number;
  rusMarkers: number;
  totalCyrillic: number;
} {
  const ukrMatches = text.match(/[іїєґІЇЄҐ]/g) || [];
  const rusMatches = text.match(/[ыэъЫЭЪ]/g) || [];
  const allCyrillic = text.match(/[а-яА-ЯёЁі-їІ-Їє-ґЄ-Ґ]/g) || [];

  const ukrCount = ukrMatches.length;
  const rusCount = rusMatches.length;
  const cyrillicCount = allCyrillic.length;

  if (cyrillicCount < 10) {
    // English or unknown default
    return {
      language: 'rus',
      bcp47: 'ru',
      ukrMarkers: ukrCount,
      rusMarkers: rusCount,
      totalCyrillic: cyrillicCount,
    };
  }

  // Mixed criteria: both languages have significant markers
  if (ukrCount >= 5 && rusCount >= 5) {
    return {
      language: 'rus+ukr',
      bcp47: 'ru-RU, uk-UA',
      ukrMarkers: ukrCount,
      rusMarkers: rusCount,
      totalCyrillic: cyrillicCount,
    };
  }

  if (ukrCount > rusCount * 2 || (ukrCount > 0 && rusCount === 0)) {
    return {
      language: 'ukr',
      bcp47: 'uk',
      ukrMarkers: ukrCount,
      rusMarkers: rusCount,
      totalCyrillic: cyrillicCount,
    };
  }

  return {
    language: 'rus',
    bcp47: 'ru',
    ukrMarkers: ukrCount,
    rusMarkers: rusCount,
    totalCyrillic: cyrillicCount,
  };
}

export function getBcp47ForLanguage(lang: BookLanguage): string {
  switch (lang) {
    case 'ukr':
      return 'uk';
    case 'rus':
      return 'ru';
    case 'rus+ukr':
      return 'ru, uk';
    case 'auto':
    default:
      return 'ru';
  }
}
