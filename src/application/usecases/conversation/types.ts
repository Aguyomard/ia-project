import type { IConversationService } from '../../ports/out/IConversationService.js';
import type { IMistralClient } from '../../ports/out/IMistralClient.js';
import type { IRAGService } from '../../ports/out/IRAGService.js';

export const MAX_CONVERSATION_HISTORY_FOR_REWRITE = 3;

export interface SendMessageDependencies {
  conversationService: IConversationService;
  mistralClient: IMistralClient;
  ragService: IRAGService;
}

export interface StreamMessageDependencies {
  conversationService: IConversationService;
  mistralClient: IMistralClient;
  ragService: IRAGService;
}
