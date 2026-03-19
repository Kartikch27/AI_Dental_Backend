import { TestPapersService } from './test-papers.service';
export declare class TestPapersController {
    private readonly testPapersService;
    constructor(testPapersService: TestPapersService);
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
        userId: string;
        config: import("@prisma/client/runtime/library").JsonValue;
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
        userId: string;
        config: import("@prisma/client/runtime/library").JsonValue;
    })[]>;
}
