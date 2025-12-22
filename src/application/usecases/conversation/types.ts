/**
 * Types pour les use cases de conversation
 */

import type { IConversationService } from '../../ports/out/IConversationService.js';
import type { IMistralClient } from '../../ports/out/IMistralClient.js';
import type { IRAGService } from '../../ports/out/IRAGService.js';

/**
 * Nombre de messages utilisateur récents à inclure
 * dans le contexte pour la réécriture de requête
 */
export const MAX_CONVERSATION_HISTORY_FOR_REWRITE = 3;

/** Dépendances injectables pour SendMessageUseCase */
export interface SendMessageDependencies {
  conversationService: IConversationService;
  mistralClient: IMistralClient;
  ragService: IRAGService;
}

/** Dépendances injectables pour StreamMessageUseCase */
export interface StreamMessageDependencies {
  conversationService: IConversationService;
  mistralClient: IMistralClient;
  ragService: IRAGService;
}

