import { TestPapersService } from './test-papers.service';
export declare class TestPapersController {
    private readonly testPapersService;
    constructor(testPapersService: TestPapersService);
    generate(req: any, body: any): Promise<{
        node: {
            id: string;
            name: string;
            type: import(".prisma/client").$Enums.NodeType;
            parentId: string | null;
            orderIndex: number;
        };
    } & {
        id: string;
        createdAt: Date;
        nodeId: string;
        content: string;
        userId: string;
        config: import("@prisma/client/runtime/library").JsonValue;
    }>;
    getHistory(req: any): Promise<({
        node: {
            id: string;
            name: string;
            type: import(".prisma/client").$Enums.NodeType;
            parentId: string | null;
            orderIndex: number;
        };
    } & {
        id: string;
        createdAt: Date;
        nodeId: string;
        content: string;
        userId: string;
        config: import("@prisma/client/runtime/library").JsonValue;
    })[]>;
}
