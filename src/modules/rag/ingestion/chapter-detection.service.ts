import { Injectable, Logger } from '@nestjs/common';

export interface DetectedChapter {
  title: string;
  headingRaw: string;
  index: number;
  content: string;
  charOffset: number;
  sectionTitle?: string; // e.g. "Occlusion & Malocclusion" from Section 2
}

export interface ChapterDetectionResult {
  chapters: DetectedChapter[];
  totalChars: number;
  /** Strategy used */
  strategy: string;
}

interface TocEntry {
  num: number;
  title: string;
  page: number;
  sectionTitle?: string;
}

/**
 * Multi-strategy chapter detector for dental/medical textbook PDFs.
 *
 * Strategy priority:
 *  1. ToC-guided   – parse Table of Contents, then locate chapter headings in body
 *  2. Explicit     – "Chapter N / Unit N / Section N" keyword lines
 *  3. Numbered     – isolated "N.  Title" lines
 *  4. CAPS         – ALL-CAPS isolated lines
 *  5. Fallback     – one chapter = entire text
 */
@Injectable()
export class ChapterDetectionService {
  private readonly logger = new Logger(ChapterDetectionService.name);

  // ─── Public API ──────────────────────────────────────────────────────────────

  detect(rawText: string): ChapterDetectionResult {
    const text = this.cleanText(rawText);

    // Strategy 1 – ToC-based (most reliable for well-formatted textbooks)
    const tocResult = this.tryTocStrategy(text);
    if (tocResult && tocResult.chapters.length >= 2) {
      this.logger.log(`Strategy: toc_guided — ${tocResult.chapters.length} chapters`);
      return tocResult;
    }

    // Strategy 2 – Explicit "Chapter N / Unit N" lines
    const explicitResult = this.tryExplicitKeywords(text);
    if (explicitResult && explicitResult.chapters.length >= 2) {
      this.logger.log(`Strategy: explicit_keywords — ${explicitResult.chapters.length} chapters`);
      return explicitResult;
    }

    // Strategy 3 – "N.  Title" numbered sections
    const numberedResult = this.tryNumberedSections(text);
    if (numberedResult && numberedResult.chapters.length >= 2) {
      this.logger.log(`Strategy: numbered_sections — ${numberedResult.chapters.length} chapters`);
      return numberedResult;
    }

    // Strategy 4 – ALL CAPS isolated lines
    const capsResult = this.tryCapsHeadings(text);
    if (capsResult && capsResult.chapters.length >= 2) {
      this.logger.log(`Strategy: caps_headings — ${capsResult.chapters.length} chapters`);
      return capsResult;
    }

    // Fallback
    this.logger.warn('Strategy: fallback — no structure detected, using single chapter');
    return {
      chapters: [{ title: 'Main Content', headingRaw: '', index: 1, content: text, charOffset: 0 }],
      totalChars: text.length,
      strategy: 'fallback',
    };
  }

  // ─── Strategy 1: ToC-guided ───────────────────────────────────────────────────

  /**
   * Looks for a Table of Contents block that matches patterns like:
   *   "1  Introduction to Orthodontics  1"
   *   "2  Growth and Development - ...  9"
   *   (optionally grouped by "Section N ...")
   *
   * Then finds each chapter heading inside the body text and splits there.
   */
  private tryTocStrategy(text: string): ChapterDetectionResult | null {
    const lines = text.split('\n');
    const tocEntries = this.extractTocEntries(lines);

    if (tocEntries.length < 3) return null;

    this.logger.debug(`ToC entries found: ${tocEntries.length}`);

    // Locate the end of the ToC block (after the last ToC entry, before body begins)
    const bodyText = this.skipTocBlock(text, tocEntries);

    // Find each chapter heading in the body by searching for its title
    const chapters = this.locateChaptersInBody(bodyText, tocEntries);

    if (chapters.length < 2) return null;

    const meaningful = chapters.filter((c) => c.content.length >= 150);
    return {
      chapters: meaningful,
      totalChars: meaningful.reduce((s, c) => s + c.content.length, 0),
      strategy: 'toc_guided',
    };
  }

  private extractTocEntries(lines: string[]): TocEntry[] {
    const entries: TocEntry[] = [];
    let currentSection: string | undefined;

    // Patterns for a ToC line:
    //   "1  Introduction to Orthodontics  1"
    //   "1. Introduction to Orthodontics 1"
    //   "1   Introduction ....  1"
    const tocLine = /^(\d{1,3})\.?\s{1,6}(.{3,90}?)\s{1,6}(\d{1,4})\s*$/;

    // Section header inside ToC: "Section 1 Introduction & Growth and development"
    const sectionLine = /^Section\s+\d+\s+(.+)$/i;

    for (const raw of lines) {
      const line = raw.trim();

      const secMatch = sectionLine.exec(line);
      if (secMatch) {
        currentSection = this.titleCase(secMatch[1].trim());
        continue;
      }

      const match = tocLine.exec(line);
      if (!match) continue;

      const num = parseInt(match[1], 10);
      const title = this.cleanTitle(match[2]);
      const page = parseInt(match[3], 10);

      // Sanity: chapter numbers should be sequential and page numbers increasing
      if (entries.length > 0) {
        const prev = entries[entries.length - 1];
        if (num !== prev.num + 1) continue; // not sequential → skip
        if (page < prev.page) continue;     // page went backward → skip
      }

      if (num < 1 || num > 200) continue;
      if (page < 1 || page > 2000) continue;

      entries.push({ num, title, page, sectionTitle: currentSection });
    }

    return entries;
  }

  /**
   * Skip past the ToC block so we search only in body text.
   * Heuristic: find the last ToC line in the full text, start body 200 chars after.
   */
  private skipTocBlock(text: string, entries: TocEntry[]): string {
    const lastTitle = entries[entries.length - 1].title;
    // Search for the last ToC title
    const tocIdx = text.lastIndexOf(lastTitle);
    if (tocIdx === -1) return text;

    // Skip a generous window past the ToC
    const afterToc = text.slice(tocIdx + lastTitle.length);
    // Find next double-newline (end of ToC section)
    const gap = afterToc.search(/\n\n+/);
    const bodyStart = tocIdx + lastTitle.length + (gap !== -1 ? gap : 0);
    return text.slice(bodyStart);
  }

  /**
   * For each ToC entry, find that chapter heading in the body text and
   * capture the content between consecutive headings.
   */
  private locateChaptersInBody(body: string, entries: TocEntry[]): DetectedChapter[] {
    // Build a list of (offset, entry) by searching for the chapter title in body
    type Hit = { offset: number; entry: TocEntry };
    const hits: Hit[] = [];

    for (const entry of entries) {
      const offset = this.findHeadingOffset(body, entry.num, entry.title);
      if (offset !== -1) hits.push({ offset, entry });
    }

    if (hits.length < 2) return [];

    // Sort by offset in case PDF layout differs from ToC order
    hits.sort((a, b) => a.offset - b.offset);

    return hits.map((hit, i) => {
      const start = hit.offset;
      const end = i < hits.length - 1 ? hits[i + 1].offset : body.length;
      const rawContent = body.slice(start, end).trim();

      // Strip the heading itself from content
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

  /**
   * Find where chapter N / "title" appears in the body text.
   * Tries several heading formats used by textbooks.
   */
  private findHeadingOffset(body: string, num: number, title: string): number {
    const shortened = title.slice(0, Math.min(title.length, 40)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const patterns = [
      // "Chapter 1\nIntroduction to Orthodontics"
      new RegExp(`Chapter\\s+${num}\\b[^\\n]*\\n+\\s*${shortened}`, 'i'),
      // "1\nIntroduction to Orthodontics"
      new RegExp(`^${num}\\s*\\n+\\s*${shortened}`, 'im'),
      // "1. Introduction to Orthodontics" as a body heading
      new RegExp(`^${num}\\.\\s+${shortened}`, 'im'),
      // Just the title on its own line
      new RegExp(`^${shortened}`, 'im'),
    ];

    for (const p of patterns) {
      const m = p.exec(body);
      if (m) return m.index;
    }

    return -1;
  }

  // ─── Strategy 2: Explicit keyword headings ────────────────────────────────────

  private tryExplicitKeywords(text: string): ChapterDetectionResult | null {
    const pattern = /^(chapter|chap\.?|unit|part|module)\s+(\d+|[ivxlcdm]+)[\s:\-–—]+(.+)?$/im;
    const matches = [...text.matchAll(new RegExp(pattern.source, 'gim'))];

    if (matches.length < 2) return null;

    return this.buildFromMatches(text, matches, 'explicit_keywords');
  }

  // ─── Strategy 3: Numbered sections ───────────────────────────────────────────

  private tryNumberedSections(text: string): ChapterDetectionResult | null {
    // "1.  Introduction to Orthodontics" or "1. INTRODUCTION"
    const pattern = /^(\d{1,2})\.\s{1,4}([A-Z][A-Za-z\s\-&,():]{3,80})$/gm;
    const matches = [...text.matchAll(pattern)];

    if (matches.length < 3) return null;

    // Verify sequence is 1,2,3...
    const nums = matches.map((m) => parseInt(m[1], 10));
    const isSequential = nums.every((n, i) => i === 0 || n === nums[i - 1] + 1 || n === nums[i - 1]);
    if (!isSequential) return null;

    return this.buildFromMatches(text, matches, 'numbered_sections');
  }

  // ─── Strategy 4: ALL CAPS isolated lines ─────────────────────────────────────

  private tryCapsHeadings(text: string): ChapterDetectionResult | null {
    // ALL-CAPS line 5-60 chars, preceded or followed by blank line
    const pattern = /(?:^|\n\n)([A-Z][A-Z\s\-&,()]{4,59})(?:\n\n|$)/g;
    const matches = [...text.matchAll(pattern)];

    if (matches.length < 2) return null;

    return this.buildFromMatches(text, matches, 'caps_headings');
  }

  // ─── Shared builder ───────────────────────────────────────────────────────────

  private buildFromMatches(
    text: string,
    matches: RegExpMatchArray[],
    strategy: string,
  ): ChapterDetectionResult {
    const chapters: DetectedChapter[] = matches.map((m, i) => {
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

  // ─── Text helpers ─────────────────────────────────────────────────────────────

  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]{4,}/g, '   ')
      .replace(/\n{5,}/g, '\n\n\n')
      .trim();
  }

  private cleanTitle(raw: string): string {
    return raw.replace(/\s+/g, ' ').trim();
  }

  private normalizeTitle(raw: string): string {
    return raw
      .replace(/^(chapter|chap\.?|unit|part|section|module)\s+(\d+|[ivxlcdm]+)\s*[\-–—:.]?\s*/i, '')
      .replace(/^\d+\.\s+/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private titleCase(str: string): string {
    return str.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  }
}
