/**
 * Module de gestion des conversations
 *
 * @example
 * ```ts
 * import { getConversationService } from './application/services/conversation';
 *
 * const service = getConversationService();
 * const conversation = await service.createConversation();
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
} from '../../../domain/conversation/index.js';

// Errors - réexportés depuis le domaine
export {
  ConversationError,
  ConversationNotFoundError,
  InvalidConversationInputError,
} from '../../../domain/conversation/index.js';

// Service-specific errors
export { InvalidInputError } from './errors.js';

// Validators (for advanced usage)
export { validateUUID, validateContent, validateRole } from './validators.js';

