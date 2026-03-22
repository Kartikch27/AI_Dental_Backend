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
exports.PdfController = void 0;
const common_1 = require("@nestjs/common");
const pdf_service_1 = require("./pdf.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const swagger_1 = require("@nestjs/swagger");
let PdfController = class PdfController {
    pdfService;
    constructor(pdfService) {
        this.pdfService = pdfService;
    }
    async export(body, res) {
        const type = body.type ?? 'notes';
        const title = body.title ?? 'Study Material';
        const subtitle = body.subtitle ?? '';
        let buffer;
        let filename;
        if (type === 'viva') {
            if (!body.messages?.length) {
                throw new common_1.BadRequestException('messages[] is required for type "viva"');
            }
            buffer = await this.pdfService.generateVivaPdf(title, body.messages, subtitle);
            filename = 'viva_session.pdf';
        }
        else {
            if (!body.content) {
                throw new common_1.BadRequestException('content is required for notes and test-paper exports');
            }
            buffer = await this.pdfService.generateContentPdf(title, body.content, subtitle);
            filename = type === 'test-paper' ? 'test_paper.pdf' : 'study_notes.pdf';
        }
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }
};
exports.PdfController = PdfController;
__decorate([
    (0, common_1.Post)('export'),
    (0, swagger_1.ApiOperation)({ summary: 'Export notes, test paper, or viva session as a formatted PDF' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PdfController.prototype, "export", null);
exports.PdfController = PdfController = __decorate([
    (0, swagger_1.ApiTags)('PDF'),
    (0, common_1.Controller)('pdf'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [pdf_service_1.PdfService])
], PdfController);
//# sourceMappingURL=pdf.controller.js.map