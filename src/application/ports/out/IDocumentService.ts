/**
 * Port secondaire pour le service de documents
 */

import type {
  Document,
  DocumentWithDistance,
  CreateDocumentInput,
  SearchOptions,
} from '../../../domain/document/index.js';

export interface IDocumentService {
  /**
   * Ajoute un document avec génération automatique d'embedding
   */
  addDocument(input: CreateDocumentInput): Promise<Document>;

  /**
   * Ajoute plusieurs documents en batch
   */
  addDocuments(contents: string[]): Promise<Document[]>;

  /**
   * Récupère un document par son ID
   */
  getDocument(id: number): Promise<Document>;

  /**
   * Liste les documents avec pagination
   */
  listDocuments(limit?: number, offset?: number): Promise<Document[]>;

  /**
   * Compte le nombre total de documents
   */
  count(): Promise<number>;

  /**
   * Supprime un document
   */
  deleteDocument(id: number): Promise<boolean>;

  /**
   * Recherche sémantique par requête texte
   */
  searchByQuery(query: string, options?: SearchOptions): Promise<DocumentWithDistance[]>;

  /**
   * Recherche sémantique par embedding
   */
  searchSimilar(queryEmbedding: number[], options?: SearchOptions): Promise<DocumentWithDistance[]>;
}

