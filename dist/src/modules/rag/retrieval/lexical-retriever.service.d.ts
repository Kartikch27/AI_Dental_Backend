import { PrismaService } from '../../../prisma/prisma.service';
import type { RagScope } from './retrieval.types';
export declare class LexicalRetrieverService {
    private prisma;
    constructor(prisma: PrismaService);
    private runQuery;
    searchByLexical(query: string, scope: RagScope, limit: number): Promise<{
        id: string;
        content: string;
        documentId: string;
        chunkIndex: number;
        pageNumber: number | null;
        sectionTitle: string | null;
        lexicalRaw: number;
    }[]>;
}
