import { createWorker, Worker } from 'tesseract.js';
import { BookLanguage } from '../types/converter';

export interface OcrPageResult {
  text: string;
  confidence: number;
}

export class OcrAdapter {
  private worker: Worker | null = null;
  private currentLanguage: string = '';
  private isCancelled: boolean = false;

  public cancel(): void {
    this.isCancelled = true;
    if (this.worker) {
      this.worker.terminate().catch(() => {});
      this.worker = null;
    }
  }

  public getTesseractLang(lang: BookLanguage): string {
    switch (lang) {
      case 'ukr':
        return 'ukr';
      case 'rus':
        return 'rus';
      case 'rus+ukr':
        return 'rus+ukr';
      case 'auto':
      default:
        return 'rus+ukr';
    }
  }

  public async init(
    lang: BookLanguage,
    onStatusUpdate?: (status: string, progress: number) => void
  ): Promise<void> {
    this.isCancelled = false;
    const tessLang = this.getTesseractLang(lang);

    if (this.worker && this.currentLanguage === tessLang) {
      return;
    }

    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }

    onStatusUpdate?.('Инициализация OCR движка...', 0.1);

    // Create worker with logger
    this.worker = await createWorker(tessLang, 1, {
      logger: m => {
        if (this.isCancelled) return;
        if (m.status === 'loading tesseract core') {
          onStatusUpdate?.('Загрузка ядра Tesseract...', 0.2);
        } else if (m.status === 'loading language traineddata') {
          onStatusUpdate?.(`Загрузка языковой модели (${tessLang})...`, 0.4 + (m.progress || 0) * 0.4);
        } else if (m.status === 'initializing api') {
          onStatusUpdate?.('Подготовка оптического распознавания...', 0.9);
        } else if (m.status === 'recognizing text') {
          onStatusUpdate?.(`Распознавание символов (${Math.round((m.progress || 0) * 100)}%)...`, m.progress || 0);
        }
      },
    });

    this.currentLanguage = tessLang;
  }

  public async recognizeCanvas(
    canvas: HTMLCanvasElement,
    onProgress?: (progress: number) => void
  ): Promise<OcrPageResult> {
    if (this.isCancelled) {
      throw new Error('Операция была отменена');
    }

    if (!this.worker) {
      throw new Error('OCR движок не инициализирован');
    }

    const { data } = await this.worker.recognize(canvas);

    if (this.isCancelled) {
      throw new Error('Операция была отменена');
    }

    onProgress?.(1);

    return {
      text: data.text || '',
      confidence: typeof data.confidence === 'number' ? data.confidence : 80,
    };
  }

  public async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}
