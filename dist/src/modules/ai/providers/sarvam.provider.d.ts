import type { AIProvider } from '../ai.provider.interface';
export declare class SarvamProvider implements AIProvider {
    private readonly apiKey;
    private readonly model;
    constructor();
    get isAvailable(): boolean;
    generateText(prompt: string, context?: any): Promise<string>;
    generateStructured(prompt: string, schema: any): Promise<any>;
}
