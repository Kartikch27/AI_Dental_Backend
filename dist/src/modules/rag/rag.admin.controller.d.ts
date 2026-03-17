import { RagService } from './rag.service.js';
import { IngestionService } from './ingestion/ingestion.service.js';
export declare class RagAdminController {
    private readonly ragService;
    private readonly ingestionService;
    constructor(ragService: RagService, ingestionService: IngestionService);
    ingest(body: {
        title: string;
        content: string;
        metadata: any;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
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
        nodeId: string | null;
    }>;
    ingestFile(file: any, title: string, metadataStr: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
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
        nodeId: string | null;
    }>;
    retryIngestion(id: string): Promise<{
        message: string;
    }>;
    listDocuments(): Promise<any>;
    getDocumentById(id: string): Promise<{
        _count: {
            chunks: number;
        };
        node: {
            id: string;
            name: string;
            type: import(".prisma/client").$Enums.NodeType;
            orderIndex: number;
            parentId: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
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
        nodeId: string | null;
    }>;
    getChunks(id: string): Promise<any>;
    deleteDocument(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
