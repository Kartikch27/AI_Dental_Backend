"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestPapersModule = void 0;
const common_1 = require("@nestjs/common");
const test_papers_service_1 = require("./test-papers.service");
const test_papers_controller_1 = require("./test-papers.controller");
const ai_module_1 = require("../ai/ai.module");
const rag_module_1 = require("../rag/rag.module");
let TestPapersModule = class TestPapersModule {
};
exports.TestPapersModule = TestPapersModule;
exports.TestPapersModule = TestPapersModule = __decorate([
    (0, common_1.Module)({
        imports: [ai_module_1.AIModule, rag_module_1.RagModule],
        providers: [test_papers_service_1.TestPapersService],
        controllers: [test_papers_controller_1.TestPapersController],
    })
], TestPapersModule);
//# sourceMappingURL=test-papers.module.js.map