export interface DetectedChapter {
    title: string;
    headingRaw: string;
    index: number;
    content: string;
    charOffset: number;
    sectionTitle?: string;
}
export interface ChapterDetectionResult {
    chapters: DetectedChapter[];
    totalChars: number;
    strategy: string;
}
export declare class ChapterDetectionService {
    private readonly logger;
    detect(rawText: string): ChapterDetectionResult;
    private tryTocStrategy;
    private extractTocEntries;
    private skipTocBlock;
    private locateChaptersInBody;
    private findHeadingOffset;
    private tryExplicitKeywords;
    private tryNumberedSections;
    private tryCapsHeadings;
    private buildFromMatches;
    private cleanText;
    private cleanTitle;
    private normalizeTitle;
    private titleCase;
}
