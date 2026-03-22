import { PdfService, VivaMessage } from './pdf.service';
import type { Response } from 'express';
export declare class PdfController {
    private readonly pdfService;
    constructor(pdfService: PdfService);
    export(body: {
        type?: 'notes' | 'test-paper' | 'viva';
        title: string;
        subtitle?: string;
        content?: string;
        messages?: VivaMessage[];
    }, res: Response): Promise<void>;
}
