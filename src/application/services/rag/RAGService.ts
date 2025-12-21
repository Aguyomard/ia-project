import { getDocumentService } from '../document/index.js';
import {
  BASE_SYSTEM_PROMPT,
  DEFAULT_RAG_CONFIG,
  type RAGConfig,
  type RAGContext,
  type RAGSource,
} from './types.js';
import type { IRAGService } from '../../ports/out/IRAGService.js';

/**
 * Convertit une distance cosinus (0-2) en pourcentage de similarité (0-100%)
 * Distance 0 = 100% similaire, Distance 1 = 50%, Distance 2 = 0%
 */
function distanceToSimilarity(distance: number): number {
  return Math.round((1 - distance / 2) * 100);
}

export class RAGService implements IRAGService {
  private config: RAGConfig;

  constructor(config: Partial<RAGConfig> = {}) {
    this.config = { ...DEFAULT_RAG_CONFIG, ...config };
  }

  async buildEnrichedPrompt(userMessage: string): Promise<RAGContext> {
    try {
      const documentService = getDocumentService();
      const chunkCount = await documentService.countChunks();

      if (chunkCount === 0) {
        return {
          enrichedPrompt: BASE_SYSTEM_PROMPT,
          documentsFound: 0,
          distances: [],
          sources: [],
        };
      }

      const relevantChunks = await documentService.searchByQuery(userMessage, {
        limit: this.config.maxDocuments,
        maxDistance: this.config.maxDistance,
      });

      if (relevantChunks.length === 0) {
        return {
          enrichedPrompt: BASE_SYSTEM_PROMPT,
          documentsFound: 0,
          distances: [],
          sources: [],
        };
      }

      const context = relevantChunks
        .map((chunk, i) => `[Document ${i + 1}]\n${chunk.content}`)
        .join('\n\n---\n\n');

      const distances = relevantChunks.map((c) => c.distance);

      // Construire les sources pour l'affichage
      const sources: RAGSource[] = relevantChunks.map((chunk) => ({
        title: chunk.documentTitle || `Document #${chunk.documentId}`,
        similarity: distanceToSimilarity(chunk.distance),
        distance: chunk.distance,
      }));

      const enrichedPrompt = `${BASE_SYSTEM_PROMPT}

Tu as accès aux documents suivants pour t'aider à répondre :

${context}

Instructions :
- Utilise ces documents pour répondre si pertinent
- Si l'information n'est pas dans les documents, utilise tes connaissances générales
- Ne mentionne pas explicitement "selon les documents" sauf si l'utilisateur le demande`;

      console.log(
        `📚 RAG: ${relevantChunks.length} sources (${sources.map((s) => `${s.title}: ${s.similarity}%`).join(', ')})`
      );

      return {
        enrichedPrompt,
        documentsFound: relevantChunks.length,
        distances,
        sources,
      };
    } catch (error) {
      console.error('RAG search failed, using base prompt:', error);
      return {
        enrichedPrompt: BASE_SYSTEM_PROMPT,
        documentsFound: 0,
        distances: [],
        sources: [],
      };
    }
  }

  getBasePrompt(): string {
    return BASE_SYSTEM_PROMPT;
  }
}
