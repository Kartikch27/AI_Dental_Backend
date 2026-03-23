import { PrismaService } from '../../prisma/prisma.service';
export declare class HistoryService {
    private prisma;
    constructor(prisma: PrismaService);
    getAllGenerations(userId: string): Promise<{
        notes: ({
            node: {
                id: string;
                name: string;
                type: import("@prisma/client").$Enums.NodeType;
                orderIndex: number;
                parentId: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            nodeId: string;
            content: string;
            userId: string;
            style: import("@prisma/client").$Enums.GenerationType;
        })[];
        testPapers: ({
            node: {
                id: string;
                name: string;
                type: import("@prisma/client").$Enums.NodeType;
                orderIndex: number;
                parentId: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            nodeId: string;
            content: string;
            userId: string;
            config: import("@prisma/client/runtime/library").JsonValue;
        })[];
        vivaSessions: ({
            node: {
                id: string;
                name: string;
                type: import("@prisma/client").$Enums.NodeType;
                orderIndex: number;
                parentId: string | null;
            };
            messages: {
                id: string;
                role: string;
                createdAt: Date;
                sessionId: string;
                text: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            nodeId: string;
            status: string;
            userId: string;
            score: number | null;
            feedback: string | null;
        })[];
    }>;
}
