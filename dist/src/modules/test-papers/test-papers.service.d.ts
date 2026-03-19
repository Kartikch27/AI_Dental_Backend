import { PrismaService } from '../../prisma/prisma.service';
import type { AIProvider } from '../ai/ai.provider.interface';
import { RagService } from '../rag/rag.service';
import { SyllabusService } from '../syllabus/syllabus.service';
export declare class TestPapersService {
    private prisma;
    private ai;
    private ragService;
    private syllabusService;
    constructor(prisma: PrismaService, ai: AIProvider, ragService: RagService, syllabusService: SyllabusService);
    generateTest(userId: string, nodeId: string, config: any): Promise<{
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
        content: string;
        nodeId: string;
        userId: string;
        config: import("@prisma/client/runtime/library").JsonValue;
    }>;
    getHistory(userId: string): Promise<({
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
        content: string;
        nodeId: string;
        userId: string;
        config: import("@prisma/client/runtime/library").JsonValue;
    })[]>;
}
