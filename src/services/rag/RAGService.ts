import { getDocumentService } from '../document/index.js';
import {
  BASE_SYSTEM_PROMPT,
  DEFAULT_RAG_CONFIG,
  type RAGConfig,
  type RAGContext,
} from './types.js';

/**
 * Service de Retrieval-Augmented Generation (RAG)
 * Enrichit les prompts système avec du contexte documentaire pertinent
 */
export class RAGService {
  private config: RAGConfig;

  constructor(config: Partial<RAGConfig> = {}) {
    this.config = { ...DEFAULT_RAG_CONFIG, ...config };
  }

  /**
   * Construit un system prompt enrichi avec le contexte RAG
   */
  async buildEnrichedPrompt(userMessage: string): Promise<RAGContext> {
    try {
      const documentService = getDocumentService();
      const docCount = await documentService.count();

      // Si pas de documents, retourner le prompt de base
      if (docCount === 0) {
        return {
          enrichedPrompt: BASE_SYSTEM_PROMPT,
          documentsFound: 0,
          distances: [],
        };
      }

      // Chercher les documents pertinents
      const relevantDocs = await documentService.searchByQuery(userMessage, {
        limit: this.config.maxDocuments,
        maxDistance: this.config.maxDistance,
      });

      // Si aucun document pertinent, retourner le prompt de base
      if (relevantDocs.length === 0) {
        return {
          enrichedPrompt: BASE_SYSTEM_PROMPT,
          documentsFound: 0,
          distances: [],
        };
      }

      // Construire le contexte
      const context = relevantDocs
        .map((doc, i) => `[Document ${i + 1}]\n${doc.content}`)
        .join('\n\n---\n\n');

      const distances = relevantDocs.map((d) => d.distance);

      console.log(
        `📚 RAG: ${relevantDocs.length} documents trouvés (distances: ${distances.map((d) => d.toFixed(2)).join(', ')})`
      );

      const enrichedPrompt = `${BASE_SYSTEM_PROMPT}

Tu as accès aux documents suivants pour t'aider à répondre :

${context}

Instructions :
- Utilise ces documents pour répondre si pertinent
- Si l'information n'est pas dans les documents, utilise tes connaissances générales
- Ne mentionne pas explicitement "selon les documents" sauf si l'utilisateur le demande`;

      return {
        enrichedPrompt,
        documentsFound: relevantDocs.length,
        distances,
      };
    } catch (error) {
      console.error('⚠️ RAG search failed, using base prompt:', error);
      return {
        enrichedPrompt: BASE_SYSTEM_PROMPT,
        documentsFound: 0,
        distances: [],
      };
    }
  }

  /**
   * Retourne le prompt de base sans enrichissement RAG
   */
  getBasePrompt(): string {
    return BASE_SYSTEM_PROMPT;
  }
}

