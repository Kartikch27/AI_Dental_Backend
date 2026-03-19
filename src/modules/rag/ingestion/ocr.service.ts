import { Injectable, Logger } from '@nestjs/common';
import { PdfRendererService } from './pdf-renderer.service';

export interface OcrPageResult {
  page: number;
  text: string;
}

/**
 * Extracts text from scanned PDF pages using Tesseract.js OCR.
 *
 * Performance strategy:
 *  - Worker pool: N Tesseract workers created once per job, reused across pages
 *  - Round-robin dispatch: pages distributed across workers for parallel OCR
 *  - Batch GhostScript rendering: entire chapter rendered in one GS call
 */
@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(private readonly pdfRenderer: PdfRendererService) {}

  /** Creates a pool of Tesseract workers. Caller must call terminatePool(). */
  async createWorkerPool(size: number): Promise<any[]> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Tesseract = require('tesseract.js');
    const workers = await Promise.all(
      Array.from({ length: size }, () => Tesseract.createWorker('eng')),
    );
    this.logger.log(`Tesseract pool ready (${size} workers)`);
    return workers;
  }

  async terminatePool(pool: any[]): Promise<void> {
    await Promise.all(pool.map((w) => w.terminate().catch(() => {})));
  }

  /**
   * OCR a rendered page using a worker from the pool (round-robin by index).
   */
  async ocrPageWithPool(
    base64: string,
    workerPool: any[],
    workerIndex: number,
  ): Promise<string> {
    const worker = workerPool[workerIndex % workerPool.length];
    try {
      const imageBuffer = Buffer.from(base64, 'base64');
      const { data } = await worker.recognize(imageBuffer);
      return data.text?.trim() ?? '';
    } catch {
      return '';
    }
  }

  /**
   * Renders and OCRs a page range concurrently using the provided worker pool.
   * GhostScript renders the whole range in one call, then pages are OCR'd in parallel.
   */
  async extractTextFromPageRange(
    pdfBuffer: Buffer,
    startPage: number,
    endPage: number,
    workerPool?: any[],
  ): Promise<string> {
    if (startPage > endPage) return '';

    const rendered = await this.pdfRenderer.renderPageRange(pdfBuffer, startPage, endPage, 2.0);
    if (rendered.length === 0) return '';

    let pool = workerPool;
    let ownPool = false;

    if (!pool || pool.length === 0) {
      pool = await this.createWorkerPool(1);
      ownPool = true;
    }

    try {
      // Dispatch all pages in parallel across the worker pool
      const results = await Promise.all(
        rendered.map(({ page, base64 }, i) =>
          this.ocrPageWithPool(base64, pool!, i).then((text) => ({ page, text })),
        ),
      );

      return results
        .filter((r) => r.text.length > 5)
        .map((r) => `\n--- Page ${r.page} ---\n${r.text}`)
        .join('\n');
    } finally {
      if (ownPool) await this.terminatePool(pool!);
    }
  }

  /**
   * Full PDF OCR (used when no ToC is available).
   * Creates its own worker pool, processes pages in parallel batches.
   */
  async extractTextFromScannedPdf(pdfBuffer: Buffer): Promise<string> {
    const totalPages = await this.pdfRenderer.getPageCount(pdfBuffer);
    this.logger.log(`Starting full OCR on ${totalPages} pages...`);

    const POOL_SIZE = 6;
    const BATCH = 30; // pages per GhostScript call
    const pool = await this.createWorkerPool(POOL_SIZE);

    const allText: string[] = [];

    try {
      for (let start = 1; start <= totalPages; start += BATCH) {
        const end = Math.min(start + BATCH - 1, totalPages);
        this.logger.log(`OCR batch pages ${start}–${end}/${totalPages}`);

        const rendered = await this.pdfRenderer.renderPageRange(pdfBuffer, start, end, 2.0);

        const results = await Promise.all(
          rendered.map(({ page, base64 }, i) =>
            this.ocrPageWithPool(base64, pool, i).then((text) => ({ page, text })),
          ),
        );

        results
          .filter((r) => r.text.length > 10)
          .forEach((r) => allText.push(`\n\n--- Page ${r.page} ---\n\n${r.text}`));
      }
    } finally {
      await this.terminatePool(pool);
    }

    const fullText = allText.join('\n');
    this.logger.log(`Full OCR complete — ${fullText.length} chars from ${totalPages} pages`);
    return fullText;
  }
}
