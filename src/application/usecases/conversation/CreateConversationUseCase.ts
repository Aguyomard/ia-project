import type {
  ICreateConversationUseCase,
  CreateConversationInput,
  CreateConversationOutput,
} from '../../ports/in/conversation.js';
import type { IConversationService } from '../../ports/out/IConversationService.js';
import { getConversationService } from '../../services/conversation/index.js';
import { BASE_SYSTEM_PROMPT } from '../../services/rag/index.js';

// Re-export types from ports
export type { CreateConversationInput, CreateConversationOutput };

/**
 * Use Case : Créer une nouvelle conversation
 */
export class CreateConversationUseCase implements ICreateConversationUseCase {
  constructor(
    private readonly conversationService: IConversationService
  ) {}

  async execute(
    input: CreateConversationInput
  ): Promise<CreateConversationOutput> {
    const conversation = await this.conversationService.createConversation(
      input.userId
    );

    // Ajouter le message système initial
    await this.conversationService.addMessage({
      conversationId: conversation.id,
      role: 'system',
      content: BASE_SYSTEM_PROMPT,
    });

    console.log('📝 New conversation created:', conversation.id);

    return { conversation };
  }
}

// Factory avec injection par défaut
export function createCreateConversationUseCase(
  conversationService: IConversationService = getConversationService()
): CreateConversationUseCase {
  return new CreateConversationUseCase(conversationService);
}

// Singleton avec dépendances par défaut
export const createConversationUseCase = createCreateConversationUseCase();
