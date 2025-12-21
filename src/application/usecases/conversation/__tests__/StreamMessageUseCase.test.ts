import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IConversationService } from '../../../ports/out/IConversationService.js';
import type { IMistralClient } from '../../../ports/out/IMistralClient.js';
import type { IRAGService } from '../../../ports/out/IRAGService.js';
import type { ChatMessage } from '../../../../domain/conversation/index.js';

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
import { StreamMessageUseCase } from '../StreamMessageUseCase.js';

describe('StreamMessageUseCase', () => {
  let useCase: StreamMessageUseCase;
  let mockConversationService: IConversationService;
  let mockMistralClient: IMistralClient;
  let mockRAGService: IRAGService;

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
      addMessage: vi.fn().mockResolvedValue({}),
      getMessages: vi.fn().mockResolvedValue([
        { id: 'msg-1', role: 'system', content: 'System', conversationId: 'conv-123', createdAt: new Date() },
        { id: 'msg-2', role: 'user', content: 'Hello', conversationId: 'conv-123', createdAt: new Date() },
      ]),
      getChatHistory: vi.fn().mockResolvedValue(mockChatHistory),
      generateTitle: vi.fn(),
    };

    // Create async generator for streaming
    async function* mockStreamComplete() {
      yield 'Hello';
      yield ' world';
      yield '!';
    }

    mockMistralClient = {
      chat: vi.fn(),
      chatJSON: vi.fn(),
      complete: vi.fn(),
      streamComplete: vi.fn().mockReturnValue(mockStreamComplete()),
      generateEmbedding: vi.fn(),
      generateEmbeddings: vi.fn(),
    };

    mockRAGService = {
      buildEnrichedPrompt: vi.fn().mockResolvedValue({
        enrichedPrompt: 'Enriched system prompt',
        documentsFound: 1,
        distances: [0.1],
      }),
      getBasePrompt: vi.fn().mockReturnValue('Base prompt'),
    };

    useCase = new StreamMessageUseCase({
      conversationService: mockConversationService,
      mistralClient: mockMistralClient,
      ragService: mockRAGService,
    });
  });

  it('should stream message chunks', async () => {
    const input = {
      conversationId: 'conv-123',
      message: 'Hello AI',
    };

    const chunks: string[] = [];
    for await (const chunk of useCase.execute(input)) {
      if (chunk.chunk) {
        chunks.push(chunk.chunk);
      }
    }

    expect(chunks).toEqual(['Hello', ' world', '!']);
  });

  it('should yield done flag with full response at the end', async () => {
    const input = {
      conversationId: 'conv-123',
      message: 'Hello AI',
    };

    let finalChunk;
    for await (const chunk of useCase.execute(input)) {
      if (chunk.done) {
        finalChunk = chunk;
      }
    }

    expect(finalChunk).toBeDefined();
    expect(finalChunk?.done).toBe(true);
    expect(finalChunk?.fullResponse).toBe('Hello world!');
  });

  it('should add user message before streaming', async () => {
    const input = {
      conversationId: 'conv-123',
      message: 'Test message',
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of useCase.execute(input)) {
      // consume generator
    }

    expect(mockConversationService.addMessage).toHaveBeenCalledWith({
      conversationId: 'conv-123',
      role: 'user',
      content: 'Test message',
    });
  });

  it('should enrich prompt with RAG context', async () => {
    const input = {
      conversationId: 'conv-123',
      message: 'Question about documents',
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of useCase.execute(input)) {
      // consume generator
    }

    expect(mockRAGService.buildEnrichedPrompt).toHaveBeenCalledWith('Question about documents');
  });

  it('should save full response as assistant message after streaming', async () => {
    const input = {
      conversationId: 'conv-123',
      message: 'Hello',
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of useCase.execute(input)) {
      // consume generator
    }

    expect(mockConversationService.addMessage).toHaveBeenCalledWith({
      conversationId: 'conv-123',
      role: 'assistant',
      content: 'Hello world!',
    });
  });

  it('should generate title for first user message', async () => {
    const input = {
      conversationId: 'conv-123',
      message: 'First message',
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of useCase.execute(input)) {
      // consume generator
    }

    expect(mockConversationService.generateTitle).toHaveBeenCalledWith('conv-123');
  });
});

