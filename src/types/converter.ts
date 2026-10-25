/**
 * Types and interfaces for the Book Workshop (PDF -> EPUB 3 Converter)
 */

export type BookLanguage = 'auto' | 'rus' | 'ukr' | 'rus+ukr';
export type OcrMode = 'auto' | 'force' | 'disabled';
export type CleanLevel = 'conservative' | 'extended';

export interface BookSettings {
  title: string;
  author: string;
  language: BookLanguage;
  outputLang: string; // 'ru', 'uk', etc.
  ocrMode: OcrMode;
  cleanLevel: CleanLevel;
  extractCover: boolean;
}

export interface PageScanInfo {
  pageNumber: number;
  hasTextLayer: boolean;
  charCount: number;
  rawText: string;
  ocrApplied: boolean;
  ocrConfidence: number; // 0 - 100
  warnings: string[];
  firstLine?: string;
  lastLine?: string;
  width: number;
  height: number;
}

export type ConversionStageId =
  | 'idle'
  | 'loading'
  | 'analyzing'
  | 'extracting'
  | 'cleaning'
  | 'structuring'
  | 'building_epub'
  | 'validating'
  | 'completed'
  | 'error'
  | 'cancelled';

export interface ConversionProgressState {
  stageId: ConversionStageId;
  stageNumber: number;
  totalStages: number;
  stageTitle: string;
  percent: number;
  processedPages: number;
  totalPages: number;
  currentOperation: string;
  ocrStatus?: string;
  warnings: string[];
  canCancel: boolean;
}

export type QualityCategory = 'good' | 'doubts' | 'attention';

export interface QualityIssue {
  pageNumber: number;
  severity: 'warning' | 'error';
  message: string;
  snippet?: string;
}

export interface QualityReportData {
  category: QualityCategory;
  categoryLabel: string;
  summary: {
    totalPages: number;
    textLayerPages: number;
    ocrPages: number;
    warningPagesCount: number;
    emptyPagesCount: number;
    hyphensRepaired: number;
    headersRemoved: number;
    detectedChapters: number;
    wordCount: number;
    averageOcrConfidence?: number;
  };
  issues: QualityIssue[];
  warnings: string[];
}

export interface BookChapter {
  id: string;
  title: string;
  pageStart: number;
  pageEnd: number;
  contentHtml: string;
  plainText: string;
}

export interface EpubValidationCheck {
  id: string;
  name: string;
  passed: boolean;
  message: string;
}

export interface EpubValidationResult {
  isValid: boolean;
  checks: EpubValidationCheck[];
}

export interface ConversionResult {
  epubBlob: Blob;
  epubFilename: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  chapters: BookChapter[];
  coverDataUrl?: string;
  qualityReport: QualityReportData;
  validation: EpubValidationResult;
  executionTimeSec: number;
  settings: BookSettings;
}
