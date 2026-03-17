import { PrismaService } from '../../prisma/prisma.service';
import type { AIProvider } from '../ai/ai.provider.interface';
import { RagService } from '../rag/rag.service';
export declare class VivaService {
    private prisma;
    private ai;
    private ragService;
    constructor(prisma: PrismaService, ai: AIProvider, ragService: RagService);
    startSession(userId: string, nodeId: string): Promise<{
        session: {
            id: string;
            createdAt: Date;
            status: string;
            nodeId: string;
            userId: string;
            score: number | null;
            feedback: string | null;
        };
        firstQuestion: string;
    }>;
    processAnswer(sessionId: string, answer: string): Promise<string>;
    getSessionHistory(sessionId: string): Promise<{
        id: string;
        role: string;
        createdAt: Date;
        text: string;
        sessionId: string;
    }[]>;
}
