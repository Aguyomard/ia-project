import type { IConversationRepository } from '../../../domain/conversation/index.js';

export interface ConversationServiceDependencies {
  repository: IConversationRepository;
}

