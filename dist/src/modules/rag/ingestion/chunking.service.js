"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChunkingService = void 0;
const common_1 = require("@nestjs/common");
let ChunkingService = class ChunkingService {
    chunkText(text, maxTokens = 500, overlap = 50) {
        const paragraphs = text.split(/\n\n+/);
        const chunks = [];
        let currentChunk = "";
        for (const p of paragraphs) {
            if ((currentChunk + p).length > maxTokens * 4) {
                if (currentChunk)
                    chunks.push(currentChunk.trim());
                currentChunk = p.slice(-overlap * 4) + "\n\n";
            }
            currentChunk += p + "\n\n";
        }
        if (currentChunk.trim())
            chunks.push(currentChunk.trim());
        return chunks;
    }
};
exports.ChunkingService = ChunkingService;
exports.ChunkingService = ChunkingService = __decorate([
    (0, common_1.Injectable)()
], ChunkingService);
//# sourceMappingURL=chunking.service.js.map