"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ChapterDetectionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChapterDetectionService = void 0;
const common_1 = require("@nestjs/common");
let ChapterDetectionService = ChapterDetectionService_1 = class ChapterDetectionService {
    logger = new common_1.Logger(ChapterDetectionService_1.name);
    detect(rawText) {
        const text = this.cleanText(rawText);
        const tocResult = this.tryTocStrategy(text);
        if (tocResult && tocResult.chapters.length >= 2) {
            this.logger.log(`Strategy: toc_guided — ${tocResult.chapters.length} chapters`);
            return tocResult;
        }
        const explicitResult = this.tryExplicitKeywords(text);
        if (explicitResult && explicitResult.chapters.length >= 2) {
            this.logger.log(`Strategy: explicit_keywords — ${explicitResult.chapters.length} chapters`);
            return explicitResult;
        }
        const numberedResult = this.tryNumberedSections(text);
        if (numberedResult && numberedResult.chapters.length >= 2) {
            this.logger.log(`Strategy: numbered_sections — ${numberedResult.chapters.length} chapters`);
            return numberedResult;
        }
        const capsResult = this.tryCapsHeadings(text);
        if (capsResult && capsResult.chapters.length >= 2) {
            this.logger.log(`Strategy: caps_headings — ${capsResult.chapters.length} chapters`);
            return capsResult;
        }
        this.logger.warn('Strategy: fallback — no structure detected, using single chapter');
        return {
            chapters: [{ title: 'Main Content', headingRaw: '', index: 1, content: text, charOffset: 0 }],
            totalChars: text.length,
            strategy: 'fallback',
        };
    }
    tryTocStrategy(text) {
        const lines = text.split('\n');
        const tocEntries = this.extractTocEntries(lines);
        if (tocEntries.length < 3)
            return null;
        this.logger.debug(`ToC entries found: ${tocEntries.length}`);
        const bodyText = this.skipTocBlock(text, tocEntries);
        const chapters = this.locateChaptersInBody(bodyText, tocEntries);
        if (chapters.length < 2)
            return null;
        const meaningful = chapters.filter((c) => c.content.length >= 150);
        return {
            chapters: meaningful,
            totalChars: meaningful.reduce((s, c) => s + c.content.length, 0),
            strategy: 'toc_guided',
        };
    }
    extractTocEntries(lines) {
        const entries = [];
        let currentSection;
        const tocLine = /^(\d{1,3})\.?\s{1,6}(.{3,90}?)\s{1,6}(\d{1,4})\s*$/;
        const sectionLine = /^Section\s+\d+\s+(.+)$/i;
        for (const raw of lines) {
            const line = raw.trim();
            const secMatch = sectionLine.exec(line);
            if (secMatch) {
                currentSection = this.titleCase(secMatch[1].trim());
                continue;
            }
            const match = tocLine.exec(line);
            if (!match)
                continue;
            const num = parseInt(match[1], 10);
            const title = this.cleanTitle(match[2]);
            const page = parseInt(match[3], 10);
            if (entries.length > 0) {
                const prev = entries[entries.length - 1];
                if (num !== prev.num + 1)
                    continue;
                if (page < prev.page)
                    continue;
            }
            if (num < 1 || num > 200)
                continue;
            if (page < 1 || page > 2000)
                continue;
            entries.push({ num, title, page, sectionTitle: currentSection });
        }
        return entries;
    }
    skipTocBlock(text, entries) {
        const lastTitle = entries[entries.length - 1].title;
        const tocIdx = text.lastIndexOf(lastTitle);
        if (tocIdx === -1)
            return text;
        const afterToc = text.slice(tocIdx + lastTitle.length);
        const gap = afterToc.search(/\n\n+/);
        const bodyStart = tocIdx + lastTitle.length + (gap !== -1 ? gap : 0);
        return text.slice(bodyStart);
    }
    locateChaptersInBody(body, entries) {
        const hits = [];
        for (const entry of entries) {
            const offset = this.findHeadingOffset(body, entry.num, entry.title);
            if (offset !== -1)
                hits.push({ offset, entry });
        }
        if (hits.length < 2)
            return [];
        hits.sort((a, b) => a.offset - b.offset);
        return hits.map((hit, i) => {
            const start = hit.offset;
            const end = i < hits.length - 1 ? hits[i + 1].offset : body.length;
            const rawContent = body.slice(start, end).trim();
            const firstNl = rawContent.indexOf('\n');
            const content = firstNl !== -1 ? rawContent.slice(firstNl).trim() : rawContent;
            return {
                title: hit.entry.title,
                headingRaw: rawContent.slice(0, firstNl !== -1 ? firstNl : 80),
                index: hit.entry.num,
                content,
                charOffset: start,
                sectionTitle: hit.entry.sectionTitle,
            };
        });
    }
    findHeadingOffset(body, num, title) {
        const shortened = title.slice(0, Math.min(title.length, 40)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const patterns = [
            new RegExp(`Chapter\\s+${num}\\b[^\\n]*\\n+\\s*${shortened}`, 'i'),
            new RegExp(`^${num}\\s*\\n+\\s*${shortened}`, 'im'),
            new RegExp(`^${num}\\.\\s+${shortened}`, 'im'),
            new RegExp(`^${shortened}`, 'im'),
        ];
        for (const p of patterns) {
            const m = p.exec(body);
            if (m)
                return m.index;
        }
        return -1;
    }
    tryExplicitKeywords(text) {
        const pattern = /^(chapter|chap\.?|unit|part|module)\s+(\d+|[ivxlcdm]+)[\s:\-–—]+(.+)?$/im;
        const matches = [...text.matchAll(new RegExp(pattern.source, 'gim'))];
        if (matches.length < 2)
            return null;
        return this.buildFromMatches(text, matches, 'explicit_keywords');
    }
    tryNumberedSections(text) {
        const pattern = /^(\d{1,2})\.\s{1,4}([A-Z][A-Za-z\s\-&,():]{3,80})$/gm;
        const matches = [...text.matchAll(pattern)];
        if (matches.length < 3)
            return null;
        const nums = matches.map((m) => parseInt(m[1], 10));
        const isSequential = nums.every((n, i) => i === 0 || n === nums[i - 1] + 1 || n === nums[i - 1]);
        if (!isSequential)
            return null;
        return this.buildFromMatches(text, matches, 'numbered_sections');
    }
    tryCapsHeadings(text) {
        const pattern = /(?:^|\n\n)([A-Z][A-Z\s\-&,()]{4,59})(?:\n\n|$)/g;
        const matches = [...text.matchAll(pattern)];
        if (matches.length < 2)
            return null;
        return this.buildFromMatches(text, matches, 'caps_headings');
    }
    buildFromMatches(text, matches, strategy) {
        const chapters = matches.map((m, i) => {
            const start = m.index ?? 0;
            const end = i < matches.length - 1 ? (matches[i + 1].index ?? text.length) : text.length;
            const rawContent = text.slice(start, end);
            const firstNl = rawContent.indexOf('\n');
            const content = firstNl !== -1 ? rawContent.slice(firstNl).trim() : '';
            const rawHeading = m[0].replace(/^\n+/, '').split('\n')[0];
            return {
                title: this.normalizeTitle(rawHeading),
                headingRaw: rawHeading,
                index: i + 1,
                content,
                charOffset: start,
            };
        });
        const meaningful = chapters.filter((c) => c.content.length >= 150);
        return {
            chapters: meaningful,
            totalChars: meaningful.reduce((s, c) => s + c.content.length, 0),
            strategy,
        };
    }
    cleanText(text) {
        return text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/[ \t]{4,}/g, '   ')
            .replace(/\n{5,}/g, '\n\n\n')
            .trim();
    }
    cleanTitle(raw) {
        return raw.replace(/\s+/g, ' ').trim();
    }
    normalizeTitle(raw) {
        return raw
            .replace(/^(chapter|chap\.?|unit|part|section|module)\s+(\d+|[ivxlcdm]+)\s*[\-–—:.]?\s*/i, '')
            .replace(/^\d+\.\s+/, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    titleCase(str) {
        return str.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
    }
};
exports.ChapterDetectionService = ChapterDetectionService;
exports.ChapterDetectionService = ChapterDetectionService = ChapterDetectionService_1 = __decorate([
    (0, common_1.Injectable)()
], ChapterDetectionService);
//# sourceMappingURL=chapter-detection.service.js.map