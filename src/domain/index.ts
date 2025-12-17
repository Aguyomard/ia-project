// Shared
export { UUID } from './shared/index.js';
export { DomainError } from './shared/index.js';

// Conversation Domain
export type {
  Conversation,
  ConversationWithMessages,
  Message,
  ChatMessage,
  MessageRole,
  IConversationRepository,
  CreateMessageInput,
} from './conversation/index.js';

export {
  MessageRoles,
  isValidMessageRole,
  ConversationError,
  ConversationNotFoundError,
  InvalidConversationInputError,
} from './conversation/index.js';

// Document Domain
export type {
  Document,
  DocumentWithDistance,
  IDocumentRepository,
  CreateDocumentInput,
  SearchOptions,
} from './document/index.js';

export {
  Embedding,
  DocumentError,
  DocumentNotFoundError,
  EmbeddingGenerationError,
  InvalidDocumentContentError,
} from './document/index.js';

