import { getDocumentService } from '../document/index.js';
import {
  BASE_SYSTEM_PROMPT,
  DEFAULT_RAG_CONFIG,
  type RAGConfig,
  type RAGContext,
} from './types.js';
import type { IRAGService } from '../../ports/out/IRAGService.js';

export class RAGService implements IRAGService {
  private config: RAGConfig;

  constructor(config: Partial<RAGConfig> = {}) {
    this.config = { ...DEFAULT_RAG_CONFIG, ...config };
  }

  async buildEnrichedPrompt(userMessage: string): Promise<RAGContext> {
    try {
      const documentService = getDocumentService();
      const docCount = await documentService.count();

      if (docCount === 0) {
        return {
          enrichedPrompt: BASE_SYSTEM_PROMPT,
          documentsFound: 0,
          distances: [],
        };
      }

      const relevantDocs = await documentService.searchByQuery(userMessage, {
        limit: this.config.maxDocuments,
        maxDistance: this.config.maxDistance,
      });

      if (relevantDocs.length === 0) {
        return {
          enrichedPrompt: BASE_SYSTEM_PROMPT,
          documentsFound: 0,
          distances: [],
        };
      }

      const context = relevantDocs
        .map((doc, i) => `[Document ${i + 1}]\n${doc.content}`)
        .join('\n\n---\n\n');

      const distances = relevantDocs.map((d) => d.distance);

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
      console.error('RAG search failed, using base prompt:', error);
      return {
        enrichedPrompt: BASE_SYSTEM_PROMPT,
        documentsFound: 0,
        distances: [],
      };
    }
  }

  getBasePrompt(): string {
    return BASE_SYSTEM_PROMPT;
  }
}
