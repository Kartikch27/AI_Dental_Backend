import { SyllabusService } from './syllabus.service';
import { NodeType } from '@prisma/client';
export declare class SyllabusController {
    private readonly syllabusService;
    constructor(syllabusService: SyllabusService);
    getRoots(): Promise<{
        id: string;
        name: string;
        type: import(".prisma/client").$Enums.NodeType;
        orderIndex: number;
        parentId: string | null;
    }[]>;
    getFullTree(): Promise<any[]>;
    getChildren(id: string): Promise<{
        id: string;
        name: string;
        type: import(".prisma/client").$Enums.NodeType;
        orderIndex: number;
        parentId: string | null;
    }[]>;
    getNodePath(id: string): Promise<{
        scope: import("./syllabus.service").AncestorScope;
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
    }>;
    createNode(body: {
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
