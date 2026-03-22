import { PrismaService } from '../../prisma/prisma.service';
export declare class HistoryService {
    private prisma;
    constructor(prisma: PrismaService);
    getAllGenerations(userId: string): Promise<{
        notes: ({
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
            style: import(".prisma/client").$Enums.GenerationType;
            userId: string;
        })[];
        testPapers: ({
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
        })[];
        vivaSessions: ({
            node: {
                id: string;
                name: string;
                type: import(".prisma/client").$Enums.NodeType;
                orderIndex: number;
                parentId: string | null;
            };
            messages: {
                id: string;
                role: string;
                createdAt: Date;
                text: string;
                sessionId: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            status: string;
            nodeId: string;
            userId: string;
            score: number | null;
            feedback: string | null;
        })[];
    }>;
}
