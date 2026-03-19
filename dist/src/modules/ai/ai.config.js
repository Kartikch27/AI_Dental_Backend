"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AI_PROVIDER_LABELS = void 0;
exports.parseProviderList = parseProviderList;
exports.getAiProviderOrder = getAiProviderOrder;
exports.AI_PROVIDER_LABELS = [
    { index: 0, id: 'groq', envKey: 'GROQ_API_KEY' },
    { index: 1, id: 'anthropic', envKey: 'ANTHROPIC_API_KEY' },
    { index: 2, id: 'gemini', envKey: 'GEMINI_API_KEY' },
    { index: 3, id: 'openai', envKey: 'OPENAI_API_KEY' },
    { index: 4, id: 'mock' },
];
const PROVIDER_ID_BY_INDEX = new Map(exports.AI_PROVIDER_LABELS.map(p => [String(p.index), p.id]));
function parseProviderToken(token) {
    const t = token.trim().toLowerCase();
    if (!t)
        return null;
    if (/^\d+$/.test(t)) {
        return PROVIDER_ID_BY_INDEX.get(t) ?? null;
    }
    if (t === 'groq' ||
        t === 'anthropic' ||
        t === 'gemini' ||
        t === 'openai' ||
        t === 'mock') {
        return t;
    }
    return null;
}
function parseProviderList(value) {
    if (!value)
        return [];
    return value
        .split(',')
        .map(parseProviderToken)
        .filter((v) => Boolean(v));
}
function getAiProviderOrder() {
    const primaryRaw = (process.env.AI_PRIMARY_PROVIDER || '').trim();
    const fallbacks = parseProviderList(process.env.AI_FALLBACK_PROVIDERS);
    const inferredPrimary = (() => {
        const parsedPrimary = parseProviderToken(primaryRaw);
        if (parsedPrimary)
            return parsedPrimary;
        for (const p of exports.AI_PROVIDER_LABELS) {
            if (!p.envKey)
                continue;
            if (process.env[p.envKey])
                return p.id;
        }
        return 'mock';
    })();
    const order = [inferredPrimary, ...fallbacks].filter(Boolean);
    const unique = Array.from(new Set(order));
    if (!unique.includes('mock'))
        unique.push('mock');
    return unique;
}
//# sourceMappingURL=ai.config.js.map