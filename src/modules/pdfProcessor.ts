import * as pdfjsLib from 'pdfjs-dist';
// Vite worker URL loader
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { PageScanInfo } from '../types/converter';

// Setup pdf.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

export interface PdfDocumentInfo {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  totalPages: number;
  title?: string;
  author?: string;
}

export class PdfProcessor {
  private pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;
  private isCancelled: boolean = false;

  public cancel(): void {
    this.isCancelled = true;
    if (this.pdfDoc) {
      this.pdfDoc.destroy().catch(() => {});
      this.pdfDoc = null;
    }
  }

  public async loadDocument(data: ArrayBuffer | Uint8Array): Promise<PdfDocumentInfo> {
    this.isCancelled = false;
    const loadingTask = pdfjsLib.getDocument({
      data,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/standard_fonts/',
    });

    const pdfDoc = await loadingTask.promise;
    this.pdfDoc = pdfDoc;

    let title = '';
    let author = '';

    try {
      const metadata = await pdfDoc.getMetadata();
      const info = (metadata?.info || {}) as Record<string, unknown>;
      if (typeof info.Title === 'string' && info.Title.trim()) {
        title = info.Title.trim();
      }
      if (typeof info.Author === 'string' && info.Author.trim()) {
        author = info.Author.trim();
      }
    } catch {
      // Ignore metadata read failure
    }

    return {
      pdfDoc,
      totalPages: pdfDoc.numPages,
      title,
      author,
    };
  }

  /**
   * Fast scan of a page: checks text layer, character count and first/last lines
   */
  public async scanPageText(pageNumber: number): Promise<PageScanInfo> {
    if (!this.pdfDoc || this.isCancelled) {
      throw new Error('PDF документ не загружен или операция отменена');
    }

    const page = await this.pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.0 });

    try {
      const textContent = await page.getTextContent();
      const items = textContent.items as Array<{
        str?: string;
        transform?: number[];
        width?: number;
        height?: number;
      }>;

      // Group text items by vertical position (Y coordinate) to restore lines accurately
      const lineMap = new Map<number, Array<{ x: number; text: string }>>();
      let fullRawText = '';

      for (const item of items) {
        if (!item.str) continue;
        const text = item.str;
        fullRawText += text + ' ';

        if (item.transform) {
          // transform[5] is Y, transform[4] is X
          const y = Math.round(item.transform[5]);
          const x = item.transform[4];
          if (!lineMap.has(y)) {
            lineMap.set(y, []);
          }
          lineMap.get(y)!.push({ x, text });
        }
      }

      // Sort lines top to bottom (descending Y in PDF coordinates)
      const sortedY = Array.from(lineMap.keys()).sort((a, b) => b - a);
      const lines: string[] = [];

      for (const y of sortedY) {
        const lineItems = lineMap.get(y)!;
        lineItems.sort((a, b) => a.x - b.x);
        const lineText = lineItems.map(i => i.text).join(' ').trim();
        if (lineText) {
          lines.push(lineText);
        }
      }

      const reconstructedText = lines.length > 0 ? lines.join('\n') : fullRawText.trim();
      const nonSpaceChars = reconstructedText.replace(/\s+/g, '').length;

      // Threshold: A standard page with text layer has >= 40 characters
      const hasTextLayer = nonSpaceChars >= 40;

      const firstLine = lines.length > 0 ? lines[0] : undefined;
      const lastLine = lines.length > 0 ? lines[lines.length - 1] : undefined;

      const warnings: string[] = [];
      if (!hasTextLayer) {
        warnings.push('Текстовый слой отсутствует или содержит менее 40 символов');
      }

      return {
        pageNumber,
        hasTextLayer,
        charCount: nonSpaceChars,
        rawText: reconstructedText,
        ocrApplied: false,
        ocrConfidence: 100,
        warnings,
        firstLine,
        lastLine,
        width: viewport.width,
        height: viewport.height,
      };
    } finally {
      page.cleanup();
    }
  }

  /**
   * Renders a page to an HTML Canvas (e.g. for OCR or cover extraction)
   * Scale is constrained to prevent memory blow-up on mobile devices
   */
  public async renderPageToCanvas(pageNumber: number, scale = 1.6): Promise<HTMLCanvasElement> {
    if (!this.pdfDoc || this.isCancelled) {
      throw new Error('PDF документ не загружен или операция отменена');
    }

    const page = await this.pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      page.cleanup();
      throw new Error('Не удалось создать Canvas 2D контекст');
    }

    // Set white background before rendering
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
    };

    try {
      await page.render(renderContext).promise;
      return canvas;
    } finally {
      page.cleanup();
    }
  }

  /**
   * Extracts cover image from page 1 as JPEG data URL
   */
  public async extractCover(pageNumber = 1): Promise<string | undefined> {
    try {
      const canvas = await this.renderPageToCanvas(pageNumber, 1.2);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      // Clean up canvas
      canvas.width = 1;
      canvas.height = 1;
      return dataUrl;
    } catch {
      return undefined;
    }
  }

  public destroy(): void {
    if (this.pdfDoc) {
      this.pdfDoc.destroy().catch(() => {});
      this.pdfDoc = null;
    }
  }
}
