"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PdfRendererService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfRendererService = void 0;
const common_1 = require("@nestjs/common");
const child_process_1 = require("child_process");
const util_1 = require("util");
const os_1 = require("os");
const path_1 = require("path");
const promises_1 = require("fs/promises");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
let PdfRendererService = PdfRendererService_1 = class PdfRendererService {
    logger = new common_1.Logger(PdfRendererService_1.name);
    gsPath = '/opt/homebrew/bin/gs';
    isScannedPdf(extractedText, pageCount) {
        const realText = extractedText.replace(/--\s*\d+\s*of\s*\d+\s*--/g, '').trim();
        const charsPerPage = pageCount > 0 ? realText.length / pageCount : 0;
        return charsPerPage < 30;
    }
    async renderPageRange(pdfBuffer, startPage, endPage, scale = 2.0) {
        if (startPage > endPage)
            return [];
        const dpi = Math.round(72 * scale);
        const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const tmpDir = (0, path_1.join)((0, os_1.tmpdir)(), `pdfrender_${stamp}`);
        const inputPath = (0, path_1.join)((0, os_1.tmpdir)(), `pdfin_${stamp}.pdf`);
        await (0, promises_1.mkdir)(tmpDir, { recursive: true });
        await (0, promises_1.writeFile)(inputPath, pdfBuffer);
        const outputPattern = (0, path_1.join)(tmpDir, 'page_%04d.png');
        try {
            await execFileAsync(this.gsPath, [
                '-dNOPAUSE',
                '-dBATCH',
                '-dSAFER',
                '-sDEVICE=png16m',
                `-dFirstPage=${startPage}`,
                `-dLastPage=${endPage}`,
                `-r${dpi}`,
                `-sOutputFile=${outputPattern}`,
                inputPath,
            ]);
            const results = [];
            const count = endPage - startPage + 1;
            for (let i = 0; i < count; i++) {
                const outFile = (0, path_1.join)(tmpDir, `page_${String(i + 1).padStart(4, '0')}.png`);
                try {
                    const buf = await (0, promises_1.readFile)(outFile);
                    results.push({ page: startPage + i, base64: buf.toString('base64') });
                }
                catch {
                }
                finally {
                    await (0, promises_1.unlink)(outFile).catch(() => { });
                }
            }
            return results;
        }
        catch (err) {
            this.logger.warn(`GhostScript batch render ${startPage}-${endPage} failed: ${err.message}`);
            return [];
        }
        finally {
            await (0, promises_1.unlink)(inputPath).catch(() => { });
            await (0, promises_1.unlink)(tmpDir).catch(() => { });
        }
    }
    async renderPages(pdfBuffer, pageNums, scale = 1.5) {
        if (pageNums.length === 0)
            return [];
        const min = Math.min(...pageNums);
        const max = Math.max(...pageNums);
        const all = await this.renderPageRange(pdfBuffer, min, max, scale);
        return all.filter((r) => pageNums.includes(r.page));
    }
    async findTocPages(_pdfBuffer) {
        return [3, 4, 5, 6];
    }
    async getPageCount(pdfBuffer) {
        try {
            const { PDFParse } = require('pdf-parse');
            const parser = new PDFParse({ data: pdfBuffer });
            const result = await parser.getText();
            await parser.destroy();
            return result.total ?? 0;
        }
        catch {
            return 0;
        }
    }
};
exports.PdfRendererService = PdfRendererService;
exports.PdfRendererService = PdfRendererService = PdfRendererService_1 = __decorate([
    (0, common_1.Injectable)()
], PdfRendererService);
//# sourceMappingURL=pdf-renderer.service.js.map