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
exports.RerankService = void 0;
const common_1 = require("@nestjs/common");
const ai_provider_interface_1 = require("../../ai/ai.provider.interface");
const common_2 = require("@nestjs/common");
function safeJsonArray(value) {
    try {
        const start = value.indexOf('[');
        const end = value.lastIndexOf(']');
        if (start === -1 || end === -1 || end <= start)
            return null;
        const parsed = JSON.parse(value.slice(start, end + 1));
        if (!Array.isArray(parsed))
            return null;
        const ids = parsed.filter(x => typeof x === 'string');
        return ids.length ? ids : null;
    }
    catch {
        return null;
    }
}
let RerankService = class RerankService {
    ai;
    constructor(ai) {
        this.ai = ai;
    }
    async rerank(query, candidates) {
        const compact = candidates.map(c => ({
            id: c.id,
            text: c.content.slice(0, 700),
        }));
        const prompt = `You are a reranking model for Retrieval-Augmented Generation (RAG).
Given a user query and candidate chunks, return a JSON array of chunk ids ordered from most relevant to least relevant.
Only output JSON. No extra text.

Query:
${query}

Candidates (JSON):
${JSON.stringify(compact)}
`;
        const out = await this.ai.generateText(prompt);
        const orderedIds = safeJsonArray(out);
        if (!orderedIds)
            return candidates;
        const byId = new Map(candidates.map(c => [c.id, c]));
        const used = new Set();
        const reranked = [];
        for (const id of orderedIds) {
            const c = byId.get(id);
            if (!c)
                continue;
            used.add(id);
            reranked.push(c);
        }
        for (const c of candidates) {
            if (!used.has(c.id))
                reranked.push(c);
        }
        return reranked;
    }
};
exports.RerankService = RerankService;
exports.RerankService = RerankService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(ai_provider_interface_1.AI_PROVIDER)),
    __metadata("design:paramtypes", [Object])
], RerankService);
//# sourceMappingURL=rerank.service.js.map