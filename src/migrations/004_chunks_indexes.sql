-- Migration 004: Add indexes for chunks table

-- Index pour recherche vectorielle sur les chunks
CREATE INDEX IF NOT EXISTS idx_chunks_embedding 
  ON chunks USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);

-- Index pour retrouver les chunks d'un document
CREATE INDEX IF NOT EXISTS idx_chunks_document_id 
  ON chunks(document_id);

-- Index pour l'ordre des chunks
CREATE INDEX IF NOT EXISTS idx_chunks_order 
  ON chunks(document_id, chunk_index);

