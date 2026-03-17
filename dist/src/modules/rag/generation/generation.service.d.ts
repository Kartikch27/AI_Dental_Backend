import { RetrievalService } from '../retrieval/retrieval.service';
import { OpenAI } from 'openai';
export declare class GenerationService {
    private retrievalService;
    private readonly logger;
    private openai;
    constructor(retrievalService: RetrievalService);
    generateResponse(query: string, scope?: {
        nodeId?: string;
        yearId?: string;
        subjectId?: string;
        chapterId?: string;
        conceptId?: string;
    }, history?: {
        role: 'user' | 'assistant';
        content: string;
    }[]): Promise<import("openai/core/streaming.js").Stream<OpenAI.Chat.Completions.ChatCompletionChunk> & {
        _request_id?: string | null;
    }>;
}
