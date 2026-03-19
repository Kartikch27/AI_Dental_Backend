import { PdfRendererService } from './pdf-renderer.service';
export interface OcrPageResult {
    page: number;
    text: string;
}
export declare class OcrService {
    private readonly pdfRenderer;
    private readonly logger;
    constructor(pdfRenderer: PdfRendererService);
    createWorkerPool(size: number): Promise<any[]>;
    terminatePool(pool: any[]): Promise<void>;
    ocrPageWithPool(base64: string, workerPool: any[], workerIndex: number): Promise<string>;
    extractTextFromPageRange(pdfBuffer: Buffer, startPage: number, endPage: number, workerPool?: any[]): Promise<string>;
    extractTextFromScannedPdf(pdfBuffer: Buffer): Promise<string>;
}
