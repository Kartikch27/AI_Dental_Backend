export type RagScope = {
    nodeId?: string;
    yearId?: string;
    subjectId?: string;
    chapterId?: string;
    conceptId?: string;
};
export type RetrievedChunk = {
    id: string;
    content: string;
    documentId: string;
    chunkIndex: number;
    pageNumber: number | null;
    sectionTitle: string | null;
    vectorScore?: number;
    lexicalScore?: number;
    relevanceScore: number;
};
