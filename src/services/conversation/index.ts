/**
 * Module de gestion des conversations
 *
 * @example
 * ```ts
 * import { getConversationService } from './services/conversation';
 *
 * const service = getConversationService();
 * const conversation = await service.create();
 * ```
 */

// Service
export {
  ConversationService,
  getConversationService,
  resetConversationService,
} from './ConversationService.js';

// Types - réexportés depuis le domaine
export type {
  Conversation,
  ConversationWithMessages,
  Message,
  ChatMessage,
  MessageRole,
  IConversationRepository,
  CreateMessageInput,
} from '../../domain/conversation/index.js';

// Errors - réexportés depuis le domaine
export {
  ConversationError,
  ConversationNotFoundError,
  InvalidConversationInputError,
} from '../../domain/conversation/index.js';

// Validators (for advanced usage)
export { validateUUID, validateContent, validateRole } from './validators.js';

// Legacy types (deprecated - use domain types)
export type { CreateConversationInput } from './types.js';
