import type {
  ICreateConversationUseCase,
  CreateConversationInput,
  CreateConversationOutput,
} from '../../ports/in/conversation.js';
import type { IConversationService } from '../../ports/out/IConversationService.js';
import { getConversationService } from '../../services/conversation/index.js';
import { BASE_SYSTEM_PROMPT } from '../../services/rag/index.js';

export type { CreateConversationInput, CreateConversationOutput };

export class CreateConversationUseCase implements ICreateConversationUseCase {
  constructor(private readonly conversationService: IConversationService) {}

  async execute(
    input: CreateConversationInput
  ): Promise<CreateConversationOutput> {
    const conversation = await this.conversationService.createConversation(
      input.userId
    );

    await this.conversationService.addMessage({
      conversationId: conversation.id,
      role: 'system',
      content: BASE_SYSTEM_PROMPT,
    });

    return { conversation };
  }
}

export function createCreateConversationUseCase(
  conversationService: IConversationService = getConversationService()
): CreateConversationUseCase {
  return new CreateConversationUseCase(conversationService);
}

export const createConversationUseCase = createCreateConversationUseCase();
