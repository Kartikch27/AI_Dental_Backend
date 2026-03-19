-- RAG search performance indexes for Neon Postgres
-- Hybrid retrieval = pgvector (semantic) + Postgres FTS (lexical)

-- 1) NOTE: Vector HNSW index on vector(3072) is not supported (max 2000 dims).
-- We add ANN indexing via halfvec in a later migration.

-- 2) Full-text search index for lexical retrieval
-- Expression index matches to_tsvector('english', "content") used in queries.
CREATE INDEX IF NOT EXISTS "RagChunk_content_fts_idx"
ON "RagChunk"
USING gin (to_tsvector('english', "content"));

-- 3) Filter indexes (scope constraints)
CREATE INDEX IF NOT EXISTS "RagChunk_nodeId_idx" ON "RagChunk" ("nodeId");
CREATE INDEX IF NOT EXISTS "RagChunk_yearId_idx" ON "RagChunk" ("yearId");
CREATE INDEX IF NOT EXISTS "RagChunk_subjectId_idx" ON "RagChunk" ("subjectId");
CREATE INDEX IF NOT EXISTS "RagChunk_chapterId_idx" ON "RagChunk" ("chapterId");
CREATE INDEX IF NOT EXISTS "RagChunk_conceptId_idx" ON "RagChunk" ("conceptId");
CREATE INDEX IF NOT EXISTS "RagChunk_documentId_idx" ON "RagChunk" ("documentId");

