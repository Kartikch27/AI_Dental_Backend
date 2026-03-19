export declare class PdfRendererService {
    private readonly logger;
    private readonly gsPath;
    isScannedPdf(extractedText: string, pageCount: number): boolean;
    renderPageRange(pdfBuffer: Buffer, startPage: number, endPage: number, scale?: number): Promise<Array<{
        page: number;
        base64: string;
    }>>;
    renderPages(pdfBuffer: Buffer, pageNums: number[], scale?: number): Promise<Array<{
        page: number;
        base64: string;
    }>>;
    findTocPages(_pdfBuffer: Buffer): Promise<number[]>;
    getPageCount(pdfBuffer: Buffer): Promise<number>;
}
