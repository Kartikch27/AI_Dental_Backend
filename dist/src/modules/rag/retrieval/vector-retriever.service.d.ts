import { PrismaService } from '../../../prisma/prisma.service';
import type { RagScope } from './retrieval.types';
export declare class VectorRetrieverService {
    private prisma;
    constructor(prisma: PrismaService);
    searchByVector(vectorString: string, scope: RagScope, limit: number): Promise<{
        id: string;
        content: string;
        documentId: string;
        chunkIndex: number;
        pageNumber: number | null;
        sectionTitle: string | null;
        vectorScore: number;
    }[]>;
}
