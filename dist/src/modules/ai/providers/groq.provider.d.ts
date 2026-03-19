import type { AIProvider } from '../ai.provider.interface';
export declare class GroqProvider implements AIProvider {
    private readonly apiKey;
    private readonly client;
    private readonly model;
    constructor();
    generateText(prompt: string, context?: any): Promise<string>;
    generateStructured(prompt: string, schema: any): Promise<any>;
}
