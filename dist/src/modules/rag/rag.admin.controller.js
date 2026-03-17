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
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_js_1 = require("../auth/jwt-auth.guard.js");
const roles_guard_js_1 = require("../auth/roles.guard.js");
const roles_decorator_js_1 = require("../auth/roles.decorator.js");
const client_1 = require("@prisma/client");
let RagAdminController = class RagAdminController {
    ragService;
    ingestionService;
    constructor(ragService, ingestionService) {
        this.ragService = ragService;
        this.ingestionService = ingestionService;
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
            include: { _count: { select: { chunks: true } } },
            orderBy: { createdAt: 'desc' }
        });
    }
    async getDocumentById(id) {
        return this.ragService.getDocumentById(id);
    }
    async getChunks(id) {
        return this.ragService.prisma.ragChunk.findMany({
            where: { documentId: id },
            orderBy: { chunkIndex: 'asc' }
        });
    }
    async deleteDocument(id) {
        return this.ragService.deleteDocument(id);
    }
};
exports.RagAdminController = RagAdminController;
__decorate([
    (0, common_1.Post)('ingest'),
    (0, swagger_1.ApiOperation)({ summary: 'Ingest a document into RAG (text)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RagAdminController.prototype, "ingest", null);
__decorate([
    (0, common_1.Post)('ingest-file'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiOperation)({ summary: 'Ingest a document into RAG (PDF)' }),
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
    (0, swagger_1.ApiOperation)({ summary: 'List all RAG documents' }),
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
    (0, swagger_1.ApiOperation)({ summary: 'Get chunks of a document' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RagAdminController.prototype, "getChunks", null);
__decorate([
    (0, common_1.Delete)('documents/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a document' }),
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
        ingestion_service_js_1.IngestionService])
], RagAdminController);
//# sourceMappingURL=rag.admin.controller.js.map