/**
 * Ports secondaires (driven ports)
 * Interfaces utilisées par les use cases pour accéder à l'infrastructure
 */

export type {
  IMistralClient,
  ChatMessage,
  ChatOptions,
} from './IMistralClient.js';

export type { IConversationService } from './IConversationService.js';

export type { IDocumentService } from './IDocumentService.js';

export type { IRAGService, RAGContext } from './IRAGService.js';

