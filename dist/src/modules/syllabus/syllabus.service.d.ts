import { PrismaService } from '../../prisma/prisma.service';
import { NodeType } from '@prisma/client';
export interface AncestorScope {
    nodeId: string;
    yearId?: string;
    subjectId?: string;
    chapterId?: string;
    conceptId?: string;
}
export interface SyllabusNodeWithPath {
    id: string;
    name: string;
    type: NodeType;
    parentId: string | null;
    orderIndex: number;
    path: Array<{
        id: string;
        name: string;
        type: NodeType;
    }>;
}
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
    resolveAncestorScope(nodeId: string): Promise<AncestorScope>;
    getNodePath(nodeId: string): Promise<SyllabusNodeWithPath>;
    getFullTree(rootId?: string): Promise<any[]>;
    private attachChildren;
}
