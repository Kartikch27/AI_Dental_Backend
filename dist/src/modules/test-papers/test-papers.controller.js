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
exports.TestPapersController = void 0;
const common_1 = require("@nestjs/common");
const test_papers_service_1 = require("./test-papers.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const swagger_1 = require("@nestjs/swagger");
let TestPapersController = class TestPapersController {
    testPapersService;
    constructor(testPapersService) {
        this.testPapersService = testPapersService;
    }
    async generate(req, body) {
        return this.testPapersService.generateTest(req.user.userId, body.nodeId, body.config);
    }
    async getHistory(req) {
        return this.testPapersService.getHistory(req.user.userId);
    }
};
exports.TestPapersController = TestPapersController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('generate'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate new AI test paper' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TestPapersController.prototype, "generate", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('history'),
    (0, swagger_1.ApiOperation)({ summary: 'Get user test paper history' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TestPapersController.prototype, "getHistory", null);
exports.TestPapersController = TestPapersController = __decorate([
    (0, swagger_1.ApiTags)('Test Papers'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('test-papers'),
    __metadata("design:paramtypes", [test_papers_service_1.TestPapersService])
], TestPapersController);
//# sourceMappingURL=test-papers.controller.js.map