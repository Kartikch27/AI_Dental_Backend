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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RagAdminController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const rag_service_js_1 = require("./rag.service.js");
const ingestion_service_js_1 = require("./ingestion/ingestion.service.js");
const chapter_detection_service_js_1 = require("./ingestion/chapter-detection.service.js");
const pdf_renderer_service_js_1 = require("./ingestion/pdf-renderer.service.js");
const toc_vision_service_js_1 = require("./ingestion/toc-vision.service.js");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_js_1 = require("../auth/jwt-auth.guard.js");
const roles_guard_js_1 = require("../auth/roles.guard.js");
const roles_decorator_js_1 = require("../auth/roles.decorator.js");
const client_1 = require("@prisma/client");
let RagAdminController = class RagAdminController {
    ragService;
    ingestionService;
    chapterDetectionService;
    pdfRenderer;
    tocVision;
    constructor(ragService, ingestionService, chapterDetectionService, pdfRenderer, tocVision) {
        this.ragService = ragService;
        this.ingestionService = ingestionService;
        this.chapterDetectionService = chapterDetectionService;
        this.pdfRenderer = pdfRenderer;
        this.tocVision = tocVision;
    }
    async previewChapters(file) {
        if (!file?.buffer)
            throw new common_1.BadRequestException('No file uploaded');
        const { PDFParse } = require('pdf-parse');
        const parser = new PDFParse({ data: file.buffer });
        const pdfData = await parser.getText();
        await parser.destroy();
        const rawText = pdfData.text;
        const pageCountMatch = rawText.match(/--\s*\d+\s*of\s*(\d+)\s*--/);
        const pageCount = pageCountMatch ? parseInt(pageCountMatch[1], 10) : 1;
        const isScanned = this.pdfRenderer.isScannedPdf(rawText, pageCount);
        if (isScanned && this.tocVision.isAvailable) {
            const tocPages = await this.pdfRenderer.findTocPages(file.buffer);
            const tocImages = await this.pdfRenderer.renderPages(file.buffer, tocPages, 1.8);
            const tocResult = await this.tocVision.extractToc(tocImages);
            if (tocResult && tocResult.allChapters.length >= 2) {
                return {
                    strategy: 'claude_vision_toc',
                    pdfType: 'scanned',
                    pageCount,
                    tocPagesUsed: tocPages,
                    sectionCount: tocResult.sections.length,
                    chapterCount: tocResult.allChapters.length,
                    sections: tocResult.sections.map((s) => ({
                        title: s.title,
                        chapters: s.chapters.map((c) => ({
                            number: c.number,
                            title: c.title,
                            page: c.page,
                        })),
                    })),
                };
            }
        }
        const detection = this.chapterDetectionService.detect(rawText);
        return {
            strategy: detection.strategy,
            pdfType: isScanned ? 'scanned_no_vision_key' : 'text',
            pageCount,
            totalCharsDetected: detection.totalChars,
            chapterCount: detection.chapters.length,
            chapters: detection.chapters.map((c) => ({
                index: c.index,
                title: c.title,
                headingRaw: c.headingRaw,
                contentChars: c.content.length,
                contentPreview: c.content.slice(0, 200).replace(/\n/g, ' ') + '...',
            })),
        };
    }
    async debugPdfText(file) {
        if (!file?.buffer)
            throw new common_1.BadRequestException('No file uploaded');
        const { PDFParse } = require('pdf-parse');
        const parser = new PDFParse({ data: file.buffer });
        const pdfData = await parser.getText();
        await parser.destroy();
        const text = pdfData.text;
        const lines = text.split('\n');
        return {
            totalChars: text.length,
            totalLines: lines.length,
            first100Lines: lines
                .slice(0, 100)
                .map((l, i) => `${String(i + 1).padStart(3)}: ${JSON.stringify(l)}`),
            rawFirst4000: text.slice(0, 4000),
        };
    }
    async ingest(body) {
        return this.ragService.ingestDocument(body.title, body.content, body.metadata || {});
    }
    async ingestFile(file, title, metadataStr) {
        const metadata = metadataStr ? JSON.parse(metadataStr) : {};
        return this.ragService.ingestFile(title, file, metadata);
    }
    async retryIngestion(id) {
        return this.ingestionService.retryIngestion(id);
    }
    async listDocuments() {
        return this.ragService.prisma.ragDocument.findMany({
            include: {
                _count: { select: { chunks: true } },
                node: { select: { id: true, name: true, type: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getDocumentById(id) {
        return this.ragService.getDocumentById(id);
    }
    async getChunks(id) {
        return this.ragService.prisma.ragChunk.findMany({
            where: { documentId: id },
            select: {
                id: true,
                chunkIndex: true,
                sectionTitle: true,
                tokenCount: true,
                nodeId: true,
                yearId: true,
                subjectId: true,
                chapterId: true,
                conceptId: true,
                content: true,
            },
            orderBy: { chunkIndex: 'asc' },
        });
    }
    async deleteDocument(id) {
        return this.ragService.deleteDocument(id);
    }
};
exports.RagAdminController = RagAdminController;
__decorate([
    (0, common_1.Post)('preview-chapters'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiOperation)({ summary: 'Preview auto-detected chapters in a PDF (dry run, no ingestion)' }),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RagAdminController.prototype, "previewChapters", null);
__decorate([
    (0, common_1.Post)('debug-pdf-text'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiOperation)({ summary: 'Debug: inspect raw extracted PDF text (no ingestion)' }),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RagAdminController.prototype, "debugPdfText", null);
__decorate([
    (0, common_1.Post)('ingest'),
    (0, swagger_1.ApiOperation)({ summary: 'Ingest a text document into RAG' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RagAdminController.prototype, "ingest", null);
__decorate([
    (0, common_1.Post)('ingest-file'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiOperation)({ summary: 'Ingest a PDF into RAG with auto chapter detection' }),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('title')),
    __param(2, (0, common_1.Body)('metadata')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], RagAdminController.prototype, "ingestFile", null);
__decorate([
    (0, common_1.Post)('documents/:id/retry'),
    (0, swagger_1.ApiOperation)({ summary: 'Retry a failed ingestion' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RagAdminController.prototype, "retryIngestion", null);
__decorate([
    (0, common_1.Get)('documents'),
    (0, swagger_1.ApiOperation)({ summary: 'List all RAG documents with chunk counts' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RagAdminController.prototype, "listDocuments", null);
__decorate([
    (0, common_1.Get)('documents/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a specific RAG document' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RagAdminController.prototype, "getDocumentById", null);
__decorate([
    (0, common_1.Get)('documents/:id/chunks'),
    (0, swagger_1.ApiOperation)({ summary: 'Get chunks of a document with their scope labels' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RagAdminController.prototype, "getChunks", null);
__decorate([
    (0, common_1.Delete)('documents/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a document and all its chunks' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RagAdminController.prototype, "deleteDocument", null);
exports.RagAdminController = RagAdminController = __decorate([
    (0, swagger_1.ApiTags)('Admin RAG'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_js_1.JwtAuthGuard, roles_guard_js_1.RolesGuard),
    (0, roles_decorator_js_1.Roles)(client_1.Role.ADMIN),
    (0, common_1.Controller)('admin/rag'),
    __metadata("design:paramtypes", [rag_service_js_1.RagService,
        ingestion_service_js_1.IngestionService,
        chapter_detection_service_js_1.ChapterDetectionService,
        pdf_renderer_service_js_1.PdfRendererService,
        toc_vision_service_js_1.TocVisionService])
], RagAdminController);
//# sourceMappingURL=rag.admin.controller.js.map