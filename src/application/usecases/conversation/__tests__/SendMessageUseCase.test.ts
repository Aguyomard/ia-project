import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IConversationService } from '../../../ports/out/IConversationService.js';
import type { IMistralClient } from '../../../ports/out/IMistralClient.js';
import type { IRAGService } from '../../../ports/out/IRAGService.js';
import type { Message, ChatMessage } from '../../../../domain/conversation/index.js';

// Mock dependencies before importing the use case
vi.mock('../../../services/conversation/index.js', () => ({
  getConversationService: vi.fn(),
}));

vi.mock('../../../../infrastructure/external/mistral/index.js', () => ({
  getMistralClient: vi.fn(),
}));

vi.mock('../../../services/rag/index.js', () => ({
  getRAGService: vi.fn(),
}));

// Import after mocking
import { SendMessageUseCase } from '../SendMessageUseCase.js';

describe('SendMessageUseCase', () => {
  let useCase: SendMessageUseCase;
  let mockConversationService: IConversationService;
  let mockMistralClient: IMistralClient;
  let mockRAGService: IRAGService;

  const mockMessages: Message[] = [
    {
      id: 'msg-1',
      conversationId: 'conv-123',
      role: 'system',
      content: 'System prompt',
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 'msg-2',
      conversationId: 'conv-123',
      role: 'user',
      content: 'Hello',
      createdAt: new Date('2024-01-01'),
    },
  ];

  const mockChatHistory: ChatMessage[] = [
    { role: 'system', content: 'System prompt' },
    { role: 'user', content: 'Hello' },
  ];

  beforeEach(() => {
    mockConversationService = {
      createConversation: vi.fn(),
      getConversation: vi.fn(),
      getConversationWithMessages: vi.fn(),
      listConversations: vi.fn(),
      deleteConversation: vi.fn(),
      addMessage: vi.fn().mockResolvedValue(mockMessages[1]),
      getMessages: vi.fn().mockResolvedValue(mockMessages),
      getChatHistory: vi.fn().mockResolvedValue(mockChatHistory),
      generateTitle: vi.fn(),
    };

    mockMistralClient = {
      chat: vi.fn(),
      chatJSON: vi.fn(),
      complete: vi.fn().mockResolvedValue('AI response'),
      streamComplete: vi.fn(),
      generateEmbedding: vi.fn(),
      generateEmbeddings: vi.fn(),
    };

    mockRAGService = {
      buildEnrichedPrompt: vi.fn().mockResolvedValue({
        enrichedPrompt: 'Enriched system prompt with context',
        documentsFound: 2,
        distances: [0.1, 0.2],
      }),
      getBasePrompt: vi.fn().mockReturnValue('Base prompt'),
    };

    useCase = new SendMessageUseCase({
      conversationService: mockConversationService,
      mistralClient: mockMistralClient,
      ragService: mockRAGService,
    });
  });

  it('should send a message and get AI response', async () => {
    const input = {
      conversationId: 'conv-123',
      message: 'Hello AI',
    };

    const result = await useCase.execute(input);

    expect(result.response).toBe('AI response');
    expect(result.conversationId).toBe('conv-123');
  });

  it('should add user message to conversation', async () => {
    const input = {
      conversationId: 'conv-123',
      message: 'Hello AI',
    };

    await useCase.execute(input);

    expect(mockConversationService.addMessage).toHaveBeenCalledWith({
      conversationId: 'conv-123',
      role: 'user',
      content: 'Hello AI',
    });
  });

  it('should enrich system prompt with RAG context', async () => {
    const input = {
      conversationId: 'conv-123',
      message: 'Question about documents',
    };

    await useCase.execute(input);

    expect(mockRAGService.buildEnrichedPrompt).toHaveBeenCalledWith('Question about documents');
  });

  it('should save AI response as assistant message', async () => {
    const input = {
      conversationId: 'conv-123',
      message: 'Hello',
    };

    await useCase.execute(input);

    expect(mockConversationService.addMessage).toHaveBeenCalledWith({
      conversationId: 'conv-123',
      role: 'assistant',
      content: 'AI response',
    });
  });

  it('should generate title for first user message', async () => {
    // Mock only one user message (first message in conversation)
    mockConversationService.getMessages = vi.fn().mockResolvedValue([
      { id: 'msg-1', role: 'system', content: 'System', conversationId: 'conv-123', createdAt: new Date() },
      { id: 'msg-2', role: 'user', content: 'Hello', conversationId: 'conv-123', createdAt: new Date() },
    ]);

    const input = {
      conversationId: 'conv-123',
      message: 'Hello',
    };

    await useCase.execute(input);

    expect(mockConversationService.generateTitle).toHaveBeenCalledWith('conv-123');
  });

  it('should not generate title for subsequent messages', async () => {
    // Mock multiple user messages
    mockConversationService.getMessages = vi.fn().mockResolvedValue([
      { id: 'msg-1', role: 'system', content: 'System', conversationId: 'conv-123', createdAt: new Date() },
      { id: 'msg-2', role: 'user', content: 'First', conversationId: 'conv-123', createdAt: new Date() },
      { id: 'msg-3', role: 'assistant', content: 'Response', conversationId: 'conv-123', createdAt: new Date() },
      { id: 'msg-4', role: 'user', content: 'Second', conversationId: 'conv-123', createdAt: new Date() },
    ]);

    const input = {
      conversationId: 'conv-123',
      message: 'Second question',
    };

    await useCase.execute(input);

    expect(mockConversationService.generateTitle).not.toHaveBeenCalled();
  });

  it('should throw error when AI returns empty response', async () => {
    mockMistralClient.complete = vi.fn().mockResolvedValue(null);

    const input = {
      conversationId: 'conv-123',
      message: 'Hello',
    };

    await expect(useCase.execute(input)).rejects.toThrow('Empty response from Mistral');
  });
});

