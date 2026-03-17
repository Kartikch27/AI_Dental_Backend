export interface AIProvider {
    generateText(prompt: string, context?: any): Promise<string>;
    generateStructured(prompt: string, schema: any): Promise<any>;
}
export declare const AI_PROVIDER = "AI_PROVIDER";
