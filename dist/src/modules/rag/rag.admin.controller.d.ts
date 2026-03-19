import { RagService } from './rag.service.js';
import { IngestionService } from './ingestion/ingestion.service.js';
import { ChapterDetectionService } from './ingestion/chapter-detection.service.js';
import { PdfRendererService } from './ingestion/pdf-renderer.service.js';
import { TocVisionService } from './ingestion/toc-vision.service.js';
export declare class RagAdminController {
    private readonly ragService;
    private readonly ingestionService;
    private readonly chapterDetectionService;
    private readonly pdfRenderer;
    private readonly tocVision;
    constructor(ragService: RagService, ingestionService: IngestionService, chapterDetectionService: ChapterDetectionService, pdfRenderer: PdfRendererService, tocVision: TocVisionService);
    previewChapters(file: any): Promise<{
        strategy: string;
        pdfType: string;
        pageCount: number;
        tocPagesUsed: number[];
        sectionCount: number;
        chapterCount: number;
        sections: {
            title: string;
            chapters: {
                number: number;
                title: string;
                page: number;
            }[];
        }[];
        totalCharsDetected?: undefined;
        chapters?: undefined;
    } | {
        strategy: string;
        pdfType: string;
        pageCount: number;
        totalCharsDetected: number;
        chapterCount: number;
        chapters: {
            index: number;
            title: string;
            headingRaw: string;
            contentChars: number;
            contentPreview: string;
        }[];
        tocPagesUsed?: undefined;
        sectionCount?: undefined;
        sections?: undefined;
    }>;
    debugPdfText(file: any): Promise<{
        totalChars: number;
        totalLines: number;
        first100Lines: string[];
        rawFirst4000: string;
    }>;
    ingest(body: {
        title: string;
        content: string;
        metadata: any;
    }): Promise<{
        id: string;
        title: string;
        sourceType: string;
        inputMethod: string;
        fileUrl: string | null;
        fileName: string | null;
        mimeType: string | null;
        yearId: string | null;
        subjectId: string | null;
        chapterId: string | null;
        conceptId: string | null;
        status: string;
        ingestionStatus: import(".prisma/client").$Enums.IngestionStatus;
        failureReason: string | null;
        processedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        nodeId: string | null;
    }>;
    ingestFile(file: any, title: string, metadataStr: string): Promise<{
        id: string;
        title: string;
        sourceType: string;
        inputMethod: string;
        fileUrl: string | null;
        fileName: string | null;
        mimeType: string | null;
        yearId: string | null;
        subjectId: string | null;
        chapterId: string | null;
        conceptId: string | null;
        status: string;
        ingestionStatus: import(".prisma/client").$Enums.IngestionStatus;
        failureReason: string | null;
        processedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        nodeId: string | null;
    }>;
    retryIngestion(id: string): Promise<{
        message: string;
    }>;
    listDocuments(): Promise<any>;
    getDocumentById(id: string): Promise<{
        node: {
            id: string;
            name: string;
            type: import(".prisma/client").$Enums.NodeType;
            parentId: string | null;
            orderIndex: number;
        } | null;
        _count: {
            chunks: number;
        };
    } & {
        id: string;
        title: string;
        sourceType: string;
        inputMethod: string;
        fileUrl: string | null;
        fileName: string | null;
        mimeType: string | null;
        yearId: string | null;
        subjectId: string | null;
        chapterId: string | null;
        conceptId: string | null;
        status: string;
        ingestionStatus: import(".prisma/client").$Enums.IngestionStatus;
        failureReason: string | null;
        processedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        nodeId: string | null;
    }>;
    getChunks(id: string): Promise<any>;
    deleteDocument(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
