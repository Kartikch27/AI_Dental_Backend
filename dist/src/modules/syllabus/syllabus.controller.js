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
exports.SyllabusController = void 0;
const common_1 = require("@nestjs/common");
const syllabus_service_1 = require("./syllabus.service");
const swagger_1 = require("@nestjs/swagger");
let SyllabusController = class SyllabusController {
    syllabusService;
    constructor(syllabusService) {
        this.syllabusService = syllabusService;
    }
    async getRoots() {
        return this.syllabusService.getRoots();
    }
    async getFullTree() {
        return this.syllabusService.getFullTree();
    }
    async getChildren(id) {
        return this.syllabusService.getChildren(id);
    }
    async getNodePath(id) {
        const nodePath = await this.syllabusService.getNodePath(id);
        const scope = await this.syllabusService.resolveAncestorScope(id);
        return { ...nodePath, scope };
    }
    async createNode(body) {
        return this.syllabusService.createNode(body);
    }
};
exports.SyllabusController = SyllabusController;
__decorate([
    (0, common_1.Get)('roots'),
    (0, swagger_1.ApiOperation)({ summary: 'Get root nodes (Years)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SyllabusController.prototype, "getRoots", null);
__decorate([
    (0, common_1.Get)('tree'),
    (0, swagger_1.ApiOperation)({ summary: 'Get the full syllabus tree (nested)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SyllabusController.prototype, "getFullTree", null);
__decorate([
    (0, common_1.Get)(':id/children'),
    (0, swagger_1.ApiOperation)({ summary: 'Get direct children of a node' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SyllabusController.prototype, "getChildren", null);
__decorate([
    (0, common_1.Get)(':id/path'),
    (0, swagger_1.ApiOperation)({ summary: 'Get breadcrumb path and ancestor scope for a node' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SyllabusController.prototype, "getNodePath", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new syllabus node' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SyllabusController.prototype, "createNode", null);
exports.SyllabusController = SyllabusController = __decorate([
    (0, swagger_1.ApiTags)('Syllabus'),
    (0, common_1.Controller)('syllabus'),
    __metadata("design:paramtypes", [syllabus_service_1.SyllabusService])
], SyllabusController);
//# sourceMappingURL=syllabus.controller.js.map