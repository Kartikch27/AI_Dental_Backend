"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveGenerationType = resolveGenerationType;
const client_1 = require("@prisma/client");
const STYLE_ALIASES = {
    EXAM_NOTES: client_1.GenerationType.EXAM_NOTES,
    QUICK_NOTES: client_1.GenerationType.QUICK_NOTES,
    DETAILED_EXPLANATION: client_1.GenerationType.DETAILED_EXPLANATION,
    BULLET_REVISION: client_1.GenerationType.BULLET_REVISION,
    TEST_PAPER: client_1.GenerationType.TEST_PAPER,
    SUMMARY: client_1.GenerationType.SUMMARY,
    EXAM: client_1.GenerationType.EXAM_NOTES,
    QUICK: client_1.GenerationType.QUICK_NOTES,
    DETAILED: client_1.GenerationType.DETAILED_EXPLANATION,
    DETAIL: client_1.GenerationType.DETAILED_EXPLANATION,
    BULLET: client_1.GenerationType.BULLET_REVISION,
    BULLETS: client_1.GenerationType.BULLET_REVISION,
    BULLET_POINTS: client_1.GenerationType.BULLET_REVISION,
    BULLETPOINTS: client_1.GenerationType.BULLET_REVISION,
    REVISION: client_1.GenerationType.BULLET_REVISION,
    TEST: client_1.GenerationType.TEST_PAPER,
    PAPER: client_1.GenerationType.TEST_PAPER,
    NOTES: client_1.GenerationType.EXAM_NOTES,
    SHORT: client_1.GenerationType.QUICK_NOTES,
};
function resolveGenerationType(raw) {
    if (!raw) {
        return client_1.GenerationType.SUMMARY;
    }
    const key = raw.trim().toUpperCase().replace(/[- ]/g, '_');
    const resolved = STYLE_ALIASES[key];
    if (!resolved) {
        const valid = Object.keys(STYLE_ALIASES)
            .filter(k => client_1.GenerationType[k])
            .join(', ');
        throw new Error(`Invalid style "${raw}". Valid values: ${valid}`);
    }
    return resolved;
}
//# sourceMappingURL=generate-notes.dto.js.map