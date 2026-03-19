"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VivaModule = void 0;
const common_1 = require("@nestjs/common");
const viva_service_1 = require("./viva.service");
const viva_controller_1 = require("./viva.controller");
const ai_module_1 = require("../ai/ai.module");
const rag_module_1 = require("../rag/rag.module");
const syllabus_module_1 = require("../syllabus/syllabus.module");
let VivaModule = class VivaModule {
};
exports.VivaModule = VivaModule;
exports.VivaModule = VivaModule = __decorate([
    (0, common_1.Module)({
        imports: [ai_module_1.AIModule, rag_module_1.RagModule, syllabus_module_1.SyllabusModule],
        providers: [viva_service_1.VivaService],
        controllers: [viva_controller_1.VivaController],
    })
], VivaModule);
//# sourceMappingURL=viva.module.js.map