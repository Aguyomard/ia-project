-- Migration 003: Create separate chunks table
-- Refactoring pour avoir 2 tables propres : documents (sources) et chunks

-- 1. Créer la nouvelle table chunks
CREATE TABLE IF NOT EXISTS chunks (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1024) NOT NULL,
  chunk_index INTEGER NOT NULL,
  start_offset INTEGER,
  end_offset INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_chunks_document 
    FOREIGN KEY (document_id) 
    REFERENCES documents(id) 
    ON DELETE CASCADE
);
