-- Migration 006: Add full-text search support for hybrid search
-- Adds tsvector column and GIN index for PostgreSQL full-text search

-- 1. Add search_vector column for full-text search
ALTER TABLE chunks ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS chunks_search_idx ON chunks USING GIN(search_vector);

-- 3. Populate existing chunks with search vectors (French + English)
UPDATE chunks 
SET search_vector = to_tsvector('french', content) || to_tsvector('english', content)
WHERE search_vector IS NULL;

-- 4. Create trigger function to auto-update search_vector on insert/update
DO $$
BEGIN
  CREATE OR REPLACE FUNCTION update_chunks_search_vector()
  RETURNS TRIGGER AS $func$
  BEGIN
    NEW.search_vector := to_tsvector('french', NEW.content) || to_tsvector('english', NEW.content);
    RETURN NEW;
  END;
  $func$ LANGUAGE plpgsql;
END
$$;

-- 5. Create trigger (drop first if exists to avoid duplicates)
DROP TRIGGER IF EXISTS chunks_search_vector_trigger ON chunks;

DO $$
BEGIN
  CREATE TRIGGER chunks_search_vector_trigger
    BEFORE INSERT OR UPDATE OF content ON chunks
    FOR EACH ROW
    EXECUTE FUNCTION update_chunks_search_vector();
END
$$;
