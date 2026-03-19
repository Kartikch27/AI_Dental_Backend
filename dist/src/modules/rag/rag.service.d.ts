import { PrismaService } from '../../prisma/prisma.service';
import { IngestionService } from './ingestion/ingestion.service.js';
import { RetrievalService } from './retrieval/retrieval.service.js';
export declare class RagService {
    private prisma;
    private ingestionService;
    private retrievalService;
    constructor(prisma: PrismaService, ingestionService: IngestionService, retrievalService: RetrievalService);
    ingestDocument(title: string, content: string, metadata: any): Promise<{
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
    ingestFile(title: string, file: any, metadata: any): Promise<{
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
    retrieveContext(query: string, scope: {
        nodeId?: string;
        yearId?: string;
        subjectId?: string;
        chapterId?: string;
        conceptId?: string;
    }, limit?: number): Promise<import("./retrieval/retrieval.types").RetrievedChunk[]>;
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
    deleteDocument(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
