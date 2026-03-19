import { VivaService } from './viva.service';
export declare class VivaController {
    private readonly vivaService;
    constructor(vivaService: VivaService);
    start(req: any, body: any): Promise<{
        session: {
            id: string;
            status: string;
            createdAt: Date;
            nodeId: string;
            userId: string;
            score: number | null;
            feedback: string | null;
        };
        firstQuestion: string;
    }>;
    answer(body: any): Promise<string>;
    getHistory(id: string): Promise<{
        id: string;
        createdAt: Date;
        text: string;
        role: string;
        sessionId: string;
    }[]>;
}
