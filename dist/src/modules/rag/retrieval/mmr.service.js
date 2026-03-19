"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MmrService = void 0;
const common_1 = require("@nestjs/common");
function tokenize(text) {
    return (text || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .filter(t => t.length >= 3);
}
function jaccard(a, b) {
    if (!a.size || !b.size)
        return 0;
    let inter = 0;
    for (const x of a)
        if (b.has(x))
            inter++;
    const union = a.size + b.size - inter;
    return union ? inter / union : 0;
}
let MmrService = class MmrService {
    select(candidates, k, lambda = 0.7) {
        if (k <= 0)
            return [];
        if (candidates.length <= k)
            return candidates.slice(0, k);
        const l = Number.isFinite(lambda) ? Math.max(0, Math.min(1, lambda)) : 0.7;
        const tokenSets = new Map();
        for (const c of candidates) {
            tokenSets.set(c.id, new Set(tokenize(c.content)));
        }
        const selected = [];
        const remaining = new Map(candidates.map(c => [c.id, c]));
        const first = candidates[0];
        selected.push(first);
        remaining.delete(first.id);
        while (selected.length < k && remaining.size > 0) {
            let best = null;
            let bestScore = -Infinity;
            for (const cand of remaining.values()) {
                const candSet = tokenSets.get(cand.id) || new Set();
                let maxSim = 0;
                for (const sel of selected) {
                    const selSet = tokenSets.get(sel.id) || new Set();
                    maxSim = Math.max(maxSim, jaccard(candSet, selSet));
                    if (maxSim >= 0.95)
                        break;
                }
                const rel = cand.relevanceScore ?? 0;
                const score = l * rel - (1 - l) * maxSim;
                if (score > bestScore) {
                    bestScore = score;
                    best = cand;
                }
            }
            if (!best)
                break;
            selected.push(best);
            remaining.delete(best.id);
        }
        return selected;
    }
};
exports.MmrService = MmrService;
exports.MmrService = MmrService = __decorate([
    (0, common_1.Injectable)()
], MmrService);
//# sourceMappingURL=mmr.service.js.map