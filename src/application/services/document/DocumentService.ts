import { getDocumentRepository } from '../../../infrastructure/persistence/index.js';
import { getMistralClient } from '../../../infrastructure/external/mistral/index.js';
import type {
  Document,
  DocumentWithDistance,
  CreateDocumentInput,
  SearchOptions,
} from '../../../domain/document/index.js';
import { EmbeddingGenerationError } from '../../../domain/document/index.js';

/**
 * Service de haut niveau pour les documents
 * Orchestre le repository (persistence) et le client Mistral (embeddings)
 *
 * @example
 * ```ts
 * const service = getDocumentService();
 *
 * // Ajouter un document (l'embedding est généré automatiquement)
 * await service.addDocument({ content: 'Guide Docker...' });
 *
 * // Rechercher des documents similaires
 * const results = await service.searchByQuery('comment configurer Docker ?');
 * ```
 */
export class DocumentService {
  /**
   * Ajoute un document avec génération automatique d'embedding
   */
  public async addDocument(input: CreateDocumentInput): Promise<Document> {
    let embedding = input.embedding;

    // Générer l'embedding si non fourni
    if (!embedding) {
      try {
        const mistral = getMistralClient();
        embedding = await mistral.generateEmbedding(input.content);
      } catch (error) {
        throw new EmbeddingGenerationError(
          'Failed to generate embedding',
          error
        );
      }
    }

    const repository = getDocumentRepository();
    return repository.create({ content: input.content, embedding });
  }

  /**
   * Ajoute plusieurs documents en batch
   */
  public async addDocuments(contents: string[]): Promise<Document[]> {
    if (contents.length === 0) {
      return [];
    }

    // Générer tous les embeddings en batch
    let embeddings: number[][];
    try {
      const mistral = getMistralClient();
      embeddings = await mistral.generateEmbeddings(contents);
    } catch (error) {
      throw new EmbeddingGenerationError(
        'Failed to generate embeddings',
        error
      );
    }

    // Insérer tous les documents
    const repository = getDocumentRepository();
    const documents: Document[] = [];
    for (let i = 0; i < contents.length; i++) {
      const doc = await repository.create({
        content: contents[i],
        embedding: embeddings[i],
      });
      documents.push(doc);
    }

    return documents;
  }

  /**
   * Récupère un document par son ID
   */
  public async getDocument(id: number): Promise<Document> {
    const repository = getDocumentRepository();
    const document = await repository.findById(id);
    if (!document) {
      throw new Error(`Document not found: ${id}`);
    }
    return document;
  }

  /**
   * Liste les documents avec pagination
   */
  public async listDocuments(limit = 100, offset = 0): Promise<Document[]> {
    const repository = getDocumentRepository();
    return repository.findAll(limit, offset);
  }

  /**
   * Compte le nombre total de documents
   */
  public async count(): Promise<number> {
    const repository = getDocumentRepository();
    return repository.count();
  }

  /**
   * Supprime un document
   */
  public async deleteDocument(id: number): Promise<boolean> {
    const repository = getDocumentRepository();
    return repository.delete(id);
  }

  /**
   * Recherche sémantique par requête texte (génère l'embedding automatiquement)
   */
  public async searchByQuery(
    query: string,
    options: SearchOptions = {}
  ): Promise<DocumentWithDistance[]> {
    // Générer l'embedding de la requête
    let queryEmbedding: number[];
    try {
      const mistral = getMistralClient();
      queryEmbedding = await mistral.generateEmbedding(query);
    } catch (error) {
      throw new EmbeddingGenerationError(
        'Failed to generate query embedding',
        error
      );
    }

    const repository = getDocumentRepository();
    return repository.searchSimilar(queryEmbedding, options);
  }

  /**
   * Recherche sémantique par embedding (si tu as déjà l'embedding)
   */
  public async searchSimilar(
    queryEmbedding: number[],
    options: SearchOptions = {}
  ): Promise<DocumentWithDistance[]> {
    const repository = getDocumentRepository();
    return repository.searchSimilar(queryEmbedding, options);
  }
}

// Singleton
let instance: DocumentService | null = null;

export function getDocumentService(): DocumentService {
  if (!instance) {
    instance = new DocumentService();
  }
  return instance;
}

export function resetDocumentService(): void {
  instance = null;
}

export default DocumentService;

