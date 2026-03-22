import { GenerationService } from './generation/generation.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { Response } from 'express';
export declare class RagController {
    private readonly generationService;
    private readonly prisma;
    constructor(generationService: GenerationService, prisma: PrismaService);
    generateStream(query: string, scope: any, history: any[], res: Response): Promise<void>;
    chat(query: string, scope: any, history: any[]): Promise<{
        answer: string;
        sources: {
            id: string;
            content: string;
            sectionTitle?: string | null;
            relevanceScore: number;
        }[];
    }>;
    scopeInfo(yearId?: string, subjectId?: string, chapterId?: string, conceptId?: string): Promise<{
        year: {
            id: string;
            name: string;
            type: import(".prisma/client").$Enums.NodeType;
        } | null;
        subject: {
            id: string;
            name: string;
            type: import(".prisma/client").$Enums.NodeType;
        } | null;
        chapter: {
            id: string;
            name: string;
            type: import(".prisma/client").$Enums.NodeType;
        } | null;
        concept: {
            id: string;
            name: string;
            type: import(".prisma/client").$Enums.NodeType;
        } | null;
    }>;
}
