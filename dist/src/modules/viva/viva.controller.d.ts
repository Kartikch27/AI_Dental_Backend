import { VivaService } from './viva.service';
export declare class VivaController {
    private readonly vivaService;
    constructor(vivaService: VivaService);
    start(req: any, body: any): Promise<{
        session: {
            id: string;
            createdAt: Date;
            status: string;
            nodeId: string;
            userId: string;
            score: number | null;
            feedback: string | null;
        };
        firstQuestion: string;
    }>;
    answer(body: any): Promise<{
        response: string;
    }>;
    getHistory(id: string): Promise<{
        id: string;
        role: string;
        createdAt: Date;
        text: string;
        sessionId: string;
    }[]>;
    getUserSessions(req: any): Promise<({
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
    })[]>;
    endSession(body: any): Promise<{
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
    }>;
}
