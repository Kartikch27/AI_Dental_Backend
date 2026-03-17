import 'jspdf-autotable';
export declare class PdfService {
    generateContentPdf(title: string, content: string): Promise<Buffer>;
}
