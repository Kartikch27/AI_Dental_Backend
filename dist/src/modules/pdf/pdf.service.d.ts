export type PdfType = 'notes' | 'test-paper' | 'viva';
export interface VivaMessage {
    role: 'examiner' | 'student';
    text: string;
}
export declare class PdfService {
    generateContentPdf(title: string, content: string, subtitle?: string): Promise<Buffer>;
    generateVivaPdf(title: string, messages: VivaMessage[], subtitle?: string): Promise<Buffer>;
}
