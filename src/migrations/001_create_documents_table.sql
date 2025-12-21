-- Migration 001: Create documents table with pgvector
-- Cette migration créée la table de base pour stocker les documents avec leurs embeddings

-- S'assurer que l'extension pgvector est activée
CREATE EXTENSION IF NOT EXISTS vector;

-- Créer la table documents si elle n'existe pas
CREATE TABLE IF NOT EXISTS documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(1024)
);

-- Index pour la recherche vectorielle (IVFFlat - bon compromis vitesse/précision)
-- Note: Nécessite des données pour être créé, commenté pour la migration initiale
-- CREATE INDEX IF NOT EXISTS idx_documents_embedding ON documents 
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Cette migration créée la table de base pour stocker les documents avec leurs embeddings

-- S'assurer que l'extension pgvector est activée
CREATE EXTENSION IF NOT EXISTS vector;

-- Créer la table documents si elle n'existe pas
CREATE TABLE IF NOT EXISTS documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(1024)
);

-- Index pour la recherche vectorielle (IVFFlat - bon compromis vitesse/précision)
-- Note: Nécessite des données pour être créé, commenté pour la migration initiale
-- CREATE INDEX IF NOT EXISTS idx_documents_embedding ON documents 
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

