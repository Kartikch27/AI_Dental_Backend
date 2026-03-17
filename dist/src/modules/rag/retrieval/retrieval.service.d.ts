import { PrismaService } from '../../../prisma/prisma.service';
import { EmbeddingService } from '../ingestion/embedding.service';
export declare class RetrievalService {
    private prisma;
    private embeddingService;
    constructor(prisma: PrismaService, embeddingService: EmbeddingService);
    retrieveRelevantChunks(query: string, scope: {
        nodeId?: string;
        yearId?: string;
        subjectId?: string;
        chapterId?: string;
        conceptId?: string;
    }, limit?: number): Promise<any[]>;
}
