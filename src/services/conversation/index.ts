/**
 * Module de gestion des conversations
 *
 * @example
 * ```ts
 * import { getConversationService } from './services/conversation';
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

// Types
export type {
  ChatMessage,
  CreateMessageInput,
  CreateConversationInput,
} from './types.js';

// Validators (for advanced usage)
export { validateUUID, validateContent, validateRole } from './validators.js';

// Errors
export {
  ConversationError,
  ConversationNotFoundError,
  InvalidInputError,
  DatabaseError,
} from './errors.js';

// Re-export Prisma types
export type { Conversation, Message } from '@prisma/client';
