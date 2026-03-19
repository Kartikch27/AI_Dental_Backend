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

  // Signals
  vectorScore?: number; // 0..1 (higher is better)
  lexicalScore?: number; // 0..1 (higher is better; normalized)

  // Final score after hybrid merge/rerank
  relevanceScore: number; // 0..1
};

