import type { AIProvider } from '../ai.provider.interface';
export declare class GeminiProvider implements AIProvider {
    private readonly ai;
    private readonly model;
    constructor();
    generateText(prompt: string, context?: any): Promise<string>;
    generateStructured(prompt: string, schema: any): Promise<any>;
}
