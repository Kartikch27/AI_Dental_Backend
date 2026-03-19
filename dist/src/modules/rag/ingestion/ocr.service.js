"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var OcrService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrService = void 0;
const common_1 = require("@nestjs/common");
const pdf_renderer_service_1 = require("./pdf-renderer.service");
let OcrService = OcrService_1 = class OcrService {
    pdfRenderer;
    logger = new common_1.Logger(OcrService_1.name);
    constructor(pdfRenderer) {
        this.pdfRenderer = pdfRenderer;
    }
    async createWorkerPool(size) {
        const Tesseract = require('tesseract.js');
        const workers = await Promise.all(Array.from({ length: size }, () => Tesseract.createWorker('eng')));
        this.logger.log(`Tesseract pool ready (${size} workers)`);
        return workers;
    }
    async terminatePool(pool) {
        await Promise.all(pool.map((w) => w.terminate().catch(() => { })));
    }
    async ocrPageWithPool(base64, workerPool, workerIndex) {
        const worker = workerPool[workerIndex % workerPool.length];
        try {
            const imageBuffer = Buffer.from(base64, 'base64');
            const { data } = await worker.recognize(imageBuffer);
            return data.text?.trim() ?? '';
        }
        catch {
            return '';
        }
    }
    async extractTextFromPageRange(pdfBuffer, startPage, endPage, workerPool) {
        if (startPage > endPage)
            return '';
        const rendered = await this.pdfRenderer.renderPageRange(pdfBuffer, startPage, endPage, 2.0);
        if (rendered.length === 0)
            return '';
        let pool = workerPool;
        let ownPool = false;
        if (!pool || pool.length === 0) {
            pool = await this.createWorkerPool(1);
            ownPool = true;
        }
        try {
            const results = await Promise.all(rendered.map(({ page, base64 }, i) => this.ocrPageWithPool(base64, pool, i).then((text) => ({ page, text }))));
            return results
                .filter((r) => r.text.length > 5)
                .map((r) => `\n--- Page ${r.page} ---\n${r.text}`)
                .join('\n');
        }
        finally {
            if (ownPool)
                await this.terminatePool(pool);
        }
    }
    async extractTextFromScannedPdf(pdfBuffer) {
        const totalPages = await this.pdfRenderer.getPageCount(pdfBuffer);
        this.logger.log(`Starting full OCR on ${totalPages} pages...`);
        const POOL_SIZE = 6;
        const BATCH = 30;
        const pool = await this.createWorkerPool(POOL_SIZE);
        const allText = [];
        try {
            for (let start = 1; start <= totalPages; start += BATCH) {
                const end = Math.min(start + BATCH - 1, totalPages);
                this.logger.log(`OCR batch pages ${start}–${end}/${totalPages}`);
                const rendered = await this.pdfRenderer.renderPageRange(pdfBuffer, start, end, 2.0);
                const results = await Promise.all(rendered.map(({ page, base64 }, i) => this.ocrPageWithPool(base64, pool, i).then((text) => ({ page, text }))));
                results
                    .filter((r) => r.text.length > 10)
                    .forEach((r) => allText.push(`\n\n--- Page ${r.page} ---\n\n${r.text}`));
            }
        }
        finally {
            await this.terminatePool(pool);
        }
        const fullText = allText.join('\n');
        this.logger.log(`Full OCR complete — ${fullText.length} chars from ${totalPages} pages`);
        return fullText;
    }
};
exports.OcrService = OcrService;
exports.OcrService = OcrService = OcrService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [pdf_renderer_service_1.PdfRendererService])
], OcrService);
//# sourceMappingURL=ocr.service.js.map