import { PrismaService } from '../../prisma/prisma.service';
import type { AIProvider } from '../ai/ai.provider.interface';
import { RagService } from '../rag/rag.service';
import { SyllabusService } from '../syllabus/syllabus.service';
export declare class VivaService {
    private prisma;
    private ai;
    private ragService;
    private syllabusService;
    constructor(prisma: PrismaService, ai: AIProvider, ragService: RagService, syllabusService: SyllabusService);
    startSession(userId: string, nodeId: string): Promise<{
        session: {
            id: string;
            status: string;
            createdAt: Date;
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
        createdAt: Date;
        text: string;
        role: string;
        sessionId: string;
    }[]>;
}
