import { PrismaService } from '../../prisma/prisma.service';
import type { AIProvider } from '../ai/ai.provider.interface';
import { GenerationType } from '@prisma/client';
import { RagService } from '../rag/rag.service';
export declare class NotesService {
    private prisma;
    private ai;
    private ragService;
    constructor(prisma: PrismaService, ai: AIProvider, ragService: RagService);
    generateNotes(userId: string, nodeId: string, style: GenerationType): Promise<{
        node: {
            id: string;
            name: string;
            type: import(".prisma/client").$Enums.NodeType;
            orderIndex: number;
            parentId: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        nodeId: string;
        style: import(".prisma/client").$Enums.GenerationType;
        content: string;
        userId: string;
    }>;
    getUserNotes(userId: string): Promise<({
        node: {
            id: string;
            name: string;
            type: import(".prisma/client").$Enums.NodeType;
            orderIndex: number;
            parentId: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        nodeId: string;
        style: import(".prisma/client").$Enums.GenerationType;
        content: string;
        userId: string;
    })[]>;
}
