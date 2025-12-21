import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IConversationService } from '../../../ports/out/IConversationService.js';
import type { Conversation, Message } from '../../../../domain/conversation/index.js';

// Mock dependencies before importing the use case
vi.mock('../../../services/rag/index.js', () => ({
  BASE_SYSTEM_PROMPT: 'You are a helpful assistant.',
  getRAGService: vi.fn(),
}));

vi.mock('../../../services/conversation/index.js', () => ({
  getConversationService: vi.fn(),
}));

// Import after mocking
import { CreateConversationUseCase } from '../CreateConversationUseCase.js';

describe('CreateConversationUseCase', () => {
  let useCase: CreateConversationUseCase;
  let mockConversationService: IConversationService;

  const mockConversation: Conversation = {
    id: 'conv-123',
    userId: 'user-456',
    title: 'New Conversation',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockMessage: Message = {
    id: 'msg-789',
    conversationId: 'conv-123',
    role: 'system',
    content: 'You are a helpful assistant.',
    createdAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    mockConversationService = {
      createConversation: vi.fn().mockResolvedValue(mockConversation),
      getConversation: vi.fn(),
      getConversationWithMessages: vi.fn(),
      listConversations: vi.fn(),
      deleteConversation: vi.fn(),
      addMessage: vi.fn().mockResolvedValue(mockMessage),
      getMessages: vi.fn(),
      getChatHistory: vi.fn(),
      generateTitle: vi.fn(),
    };

    useCase = new CreateConversationUseCase(mockConversationService);
  });

  it('should create a conversation for a user', async () => {
    const input = { userId: 'user-456' };

    const result = await useCase.execute(input);

    expect(mockConversationService.createConversation).toHaveBeenCalledWith('user-456');
    expect(result.conversation).toEqual(mockConversation);
  });

  it('should add a system message with base prompt', async () => {
    const input = { userId: 'user-456' };

    await useCase.execute(input);

    expect(mockConversationService.addMessage).toHaveBeenCalledWith({
      conversationId: 'conv-123',
      role: 'system',
      content: 'You are a helpful assistant.',
    });
  });

  it('should create conversation without userId', async () => {
    const mockConvNoUser: Conversation = {
      ...mockConversation,
      userId: undefined,
    };
    mockConversationService.createConversation = vi.fn().mockResolvedValue(mockConvNoUser);

    const input = { userId: undefined };

    const result = await useCase.execute(input);

    expect(mockConversationService.createConversation).toHaveBeenCalledWith(undefined);
    expect(result.conversation).toBeDefined();
  });

  it('should return the created conversation', async () => {
    const input = { userId: 'user-123' };

    const result = await useCase.execute(input);

    expect(result).toHaveProperty('conversation');
    expect(result.conversation.id).toBe('conv-123');
  });
});

