export interface TocChapter {
    number: number;
    title: string;
    page: number;
    sectionTitle?: string;
}
export interface TocVisionResult {
    sections: Array<{
        title: string;
        chapters: TocChapter[];
    }>;
    allChapters: TocChapter[];
}
export declare class TocVisionService {
    private readonly logger;
    private readonly model;
    get isAvailable(): boolean;
    extractToc(pageImages: Array<{
        page: number;
        base64: string;
    }>): Promise<TocVisionResult | null>;
}
