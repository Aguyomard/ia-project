-- Migration 005: Clean up documents table

-- Ajouter colonne title si elle n'existe pas
ALTER TABLE documents ADD COLUMN IF NOT EXISTS title VARCHAR(500);

-- Supprimer les colonnes de tracking maintenant inutiles (si elles existent)
ALTER TABLE documents DROP COLUMN IF EXISTS source_id;
ALTER TABLE documents DROP COLUMN IF EXISTS chunk_index;
ALTER TABLE documents DROP COLUMN IF EXISTS is_chunk;

-- Supprimer l'index sur documents.embedding (n'est plus utile)
DROP INDEX IF EXISTS documents_embedding_idx;

