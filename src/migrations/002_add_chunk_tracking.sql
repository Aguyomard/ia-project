-- Migration 002: Add chunk tracking columns
-- Cette migration ajoute le support pour le tracking des chunks

-- Ajouter la colonne source_id
ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_id BIGINT;

-- Ajouter la colonne chunk_index
ALTER TABLE documents ADD COLUMN IF NOT EXISTS chunk_index INTEGER;

-- Ajouter la colonne created_at
ALTER TABLE documents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Contrainte de clé étrangère avec suppression en cascade
-- (supprimer le document source supprime tous ses chunks)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_documents_source'
  ) THEN
    ALTER TABLE documents 
      ADD CONSTRAINT fk_documents_source 
      FOREIGN KEY (source_id) REFERENCES documents(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Index pour retrouver rapidement tous les chunks d'un document source
CREATE INDEX IF NOT EXISTS idx_documents_source_id 
  ON documents(source_id) 
  WHERE source_id IS NOT NULL;

-- Index pour trier les chunks par ordre
CREATE INDEX IF NOT EXISTS idx_documents_chunk_order 
  ON documents(source_id, chunk_index) 
  WHERE source_id IS NOT NULL;

-- Commentaires pour documenter les colonnes
COMMENT ON COLUMN documents.source_id IS 'ID du document parent (NULL si document original ou chunk sans tracking)';

COMMENT ON COLUMN documents.chunk_index IS 'Position du chunk dans le document original (0-based)';

COMMENT ON COLUMN documents.created_at IS 'Date de création du document';


-- Ajouter la colonne source_id
ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_id BIGINT;

-- Ajouter la colonne chunk_index
ALTER TABLE documents ADD COLUMN IF NOT EXISTS chunk_index INTEGER;

-- Ajouter la colonne created_at
ALTER TABLE documents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Contrainte de clé étrangère avec suppression en cascade
-- (supprimer le document source supprime tous ses chunks)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_documents_source'
  ) THEN
    ALTER TABLE documents 
      ADD CONSTRAINT fk_documents_source 
      FOREIGN KEY (source_id) REFERENCES documents(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Index pour retrouver rapidement tous les chunks d'un document source
CREATE INDEX IF NOT EXISTS idx_documents_source_id 
  ON documents(source_id) 
  WHERE source_id IS NOT NULL;

-- Index pour trier les chunks par ordre
CREATE INDEX IF NOT EXISTS idx_documents_chunk_order 
  ON documents(source_id, chunk_index) 
  WHERE source_id IS NOT NULL;

-- Commentaires pour documenter les colonnes
COMMENT ON COLUMN documents.source_id IS 'ID du document parent (NULL si document original ou chunk sans tracking)';

COMMENT ON COLUMN documents.chunk_index IS 'Position du chunk dans le document original (0-based)';

COMMENT ON COLUMN documents.created_at IS 'Date de création du document';
