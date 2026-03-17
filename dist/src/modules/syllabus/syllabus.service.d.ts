import { PrismaService } from '../../prisma/prisma.service';
import { NodeType } from '@prisma/client';
export declare class SyllabusService {
    private prisma;
    constructor(prisma: PrismaService);
    getRoots(): Promise<{
        id: string;
        name: string;
        type: import(".prisma/client").$Enums.NodeType;
        orderIndex: number;
        parentId: string | null;
    }[]>;
    getChildren(parentId: string): Promise<{
        id: string;
        name: string;
        type: import(".prisma/client").$Enums.NodeType;
        orderIndex: number;
        parentId: string | null;
    }[]>;
    getNodeById(id: string): Promise<{
        id: string;
        name: string;
        type: import(".prisma/client").$Enums.NodeType;
        orderIndex: number;
        parentId: string | null;
    } | null>;
    createNode(data: {
        name: string;
        type: NodeType;
        parentId?: string;
        orderIndex?: number;
    }): Promise<{
        id: string;
        name: string;
        type: import(".prisma/client").$Enums.NodeType;
        orderIndex: number;
        parentId: string | null;
    }>;
}
