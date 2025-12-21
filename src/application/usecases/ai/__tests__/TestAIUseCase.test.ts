import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestAIUseCase } from '../TestAIUseCase.js';
import type { IMistralClient } from '../../../ports/out/IMistralClient.js';
import type { AIComparisonResponse } from '../../../ports/in/ai.js';

describe('TestAIUseCase', () => {
  let useCase: TestAIUseCase;
  let mockMistralClient: IMistralClient;

  const mockAIResponse: AIComparisonResponse = {
    comparison: {
      cookie: {
        maxSize: '4KB',
        persistence: 'Can be persistent or session-based',
        accessibility: 'Server and client side',
      },
      localStorage: {
        maxSize: '5-10MB',
        persistence: 'Persistent until cleared',
        accessibility: 'Client side only',
      },
    },
    recommendation: 'Use localStorage for large client-side data, cookies for server communication',
  };

  beforeEach(() => {
    mockMistralClient = {
      chat: vi.fn(),
      chatJSON: vi.fn().mockResolvedValue(mockAIResponse),
      complete: vi.fn(),
      streamComplete: vi.fn(),
      generateEmbedding: vi.fn(),
      generateEmbeddings: vi.fn(),
    };

    useCase = new TestAIUseCase(mockMistralClient);
  });

  it('should call Mistral chatJSON with correct parameters', async () => {
    await useCase.execute();

    expect(mockMistralClient.chatJSON).toHaveBeenCalledWith(
      'Compare cookie et localStorage pour le stockage web.',
      {
        systemPrompt: 'Tu es un expert technique senior en développement web.',
      }
    );
  });

  it('should return AI comparison response', async () => {
    const result = await useCase.execute();

    expect(result.data).toEqual(mockAIResponse);
  });

  it('should return data with comparison structure', async () => {
    const result = await useCase.execute();

    expect(result.data).toHaveProperty('comparison');
    expect(result.data.comparison).toHaveProperty('cookie');
    expect(result.data.comparison).toHaveProperty('localStorage');
  });

  it('should handle different AI response formats', async () => {
    const customResponse = {
      answer: 'Custom response format',
      details: ['detail1', 'detail2'],
    };
    mockMistralClient.chatJSON = vi.fn().mockResolvedValue(customResponse);

    const result = await useCase.execute();

    expect(result.data).toEqual(customResponse);
  });

  it('should propagate errors from Mistral client', async () => {
    mockMistralClient.chatJSON = vi.fn().mockRejectedValue(new Error('API Error'));

    await expect(useCase.execute()).rejects.toThrow('API Error');
  });
});

