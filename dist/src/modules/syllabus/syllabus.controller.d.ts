import { SyllabusService } from './syllabus.service';
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
    getChildren(id: string): Promise<{
        id: string;
        name: string;
        type: import(".prisma/client").$Enums.NodeType;
        orderIndex: number;
        parentId: string | null;
    }[]>;
}
