// Entities
export type { Conversation, ConversationWithMessages } from './entities/Conversation.js';
export type { Message, ChatMessage } from './entities/Message.js';

// Value Objects
export type { MessageRole } from './valueObjects/MessageRole.js';
export { MessageRoles, isValidMessageRole } from './valueObjects/MessageRole.js';

// Errors
export {
  ConversationError,
  ConversationNotFoundError,
  InvalidConversationInputError,
} from './errors/ConversationErrors.js';

// Repository Interface
export type {
  IConversationRepository,
  CreateMessageInput,
} from './repositories/IConversationRepository.js';

