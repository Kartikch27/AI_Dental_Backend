import { NotesService } from './notes.service';
export declare class NotesController {
    private readonly notesService;
    constructor(notesService: NotesService);
    generate(req: any, body: any): Promise<{
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
    }>;
    getHistory(req: any): Promise<({
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
    })[]>;
}
