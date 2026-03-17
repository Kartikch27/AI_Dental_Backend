import { PdfService } from './pdf.service';
import type { Response } from 'express';
export declare class PdfController {
    private readonly pdfService;
    constructor(pdfService: PdfService);
    export(body: {
        title: string;
        content: string;
    }, res: Response): Promise<void>;
}
