import { GenerationService } from './generation/generation.service';
import type { Response } from 'express';
export declare class RagController {
    private readonly generationService;
    constructor(generationService: GenerationService);
    generateStream(query: string, scope: any, history: any[], res: Response): Promise<void>;
}
