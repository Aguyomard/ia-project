import { Mistral } from '@mistralai/mistralai';
import type { ChatMessage, ChatOptions, MistralConfig } from './types.js';
import {
  MistralConfigError,
  MistralAPIError,
  MistralParseError,
} from './errors.js';
import { withRetry, type RetryOptions } from '../../common/retry.js';
import {
  applySlidingWindow,
  getModelContextLimit,
  estimateTotalTokens,
} from './tokenizer.js';

/**
 * Client pour interagir avec l'API Mistral AI
 *
 * @example
 * ```ts
 * const mistral = getMistralClient();
 * const response = await mistral.chat('Bonjour !');
 * ```
 */
export class MistralClient {
  private readonly client: Mistral;
  private readonly defaultModel: string;
  private readonly defaultTemperature: number;
  private readonly retryOptions: RetryOptions;

  public constructor(config: MistralConfig = {}) {
    const apiKey = config.apiKey || process.env.MISTRAL_API_KEY;

    if (!apiKey) {
      throw new MistralConfigError(
        'MISTRAL_API_KEY is required. Set it in environment or pass it to constructor.'
      );
    }

    this.client = new Mistral({ apiKey });
    this.defaultModel = config.defaultModel || 'mistral-tiny';
    this.defaultTemperature = config.defaultTemperature ?? 0.7;

    this.retryOptions = {
      maxRetries: config.retry?.maxRetries ?? 3,
      baseDelay: config.retry?.baseDelay ?? 1000,
      multiplier: config.retry?.multiplier ?? 2,
      maxDelay: config.retry?.maxDelay ?? 30000,
      onRetry: (attempt, delay, error) => {
        console.warn(
          `[MistralClient] Retry ${attempt}/${this.retryOptions.maxRetries} after ${Math.round(delay)}ms`,
          error instanceof Error ? error.message : error
        );
      },
    };
  }

  public async chat(
    userMessage: string,
    options: ChatOptions = {}
  ): Promise<string | null> {
    const { systemPrompt, ...restOptions } = options;

    const messages: ChatMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: userMessage });

    return this.complete(messages, restOptions);
  }

  public async chatJSON<T = Record<string, unknown>>(
    userMessage: string,
    options: Omit<ChatOptions, 'jsonMode'> = {}
  ): Promise<T> {
    const response = await this.chat(userMessage, {
      ...options,
      jsonMode: true,
    });

    if (!response) {
      throw new MistralParseError('Empty response from Mistral');
    }

    try {
      return JSON.parse(response) as T;
    } catch (error) {
      throw new MistralParseError(
        `Failed to parse JSON response: ${response.substring(0, 100)}...`,
        error
      );
    }
  }

  public async complete(
    messages: ChatMessage[],
    options: Omit<ChatOptions, 'systemPrompt'> = {}
  ): Promise<string | null> {
    const {
      model = this.defaultModel,
      temperature = this.defaultTemperature,
      maxTokens,
      jsonMode = false,
      autoTruncate = true,
      reservedForResponse = 1000,
    } = options;

    let processedMessages = messages;
    if (autoTruncate) {
      const contextLimit = getModelContextLimit(model);
      processedMessages = applySlidingWindow(messages, {
        maxTokens: contextLimit,
        reservedForResponse,
        preserveSystemPrompt: true,
      });
    }

    console.log(
      `[MistralClient] Calling ${model} with ${processedMessages.length} messages ` +
        `(~${estimateTotalTokens(processedMessages)} tokens, jsonMode: ${jsonMode})`
    );

    try {
      const response = await withRetry(
        () =>
          this.client.chat.complete({
            model,
            messages: processedMessages,
            temperature,
            ...(maxTokens && { maxTokens }),
            ...(jsonMode && { responseFormat: { type: 'json_object' } }),
          }),
        this.retryOptions
      );

      const content = response.choices?.[0]?.message?.content;

      if (typeof content === 'string') {
        return content;
      }

      if (Array.isArray(content)) {
        return content
          .filter((chunk) => chunk.type === 'text')
          .map((chunk) => ('text' in chunk ? chunk.text : ''))
          .join('');
      }

      return null;
    } catch (error) {
      console.error('[MistralClient] API call failed after retries:', error);
      throw new MistralAPIError('Failed to complete chat request', error);
    }
  }

  public async *streamComplete(
    messages: ChatMessage[],
    options: Omit<ChatOptions, 'systemPrompt' | 'jsonMode'> = {}
  ): AsyncIterable<string> {
    const {
      model = this.defaultModel,
      temperature = this.defaultTemperature,
      maxTokens,
      autoTruncate = true,
      reservedForResponse = 1000,
    } = options;

    let processedMessages = messages;
    if (autoTruncate) {
      const contextLimit = getModelContextLimit(model);
      processedMessages = applySlidingWindow(messages, {
        maxTokens: contextLimit,
        reservedForResponse,
        preserveSystemPrompt: true,
      });
    }

    console.log(
      `[MistralClient] Streaming ${model} with ${processedMessages.length} messages ` +
        `(~${estimateTotalTokens(processedMessages)} tokens)`
    );

    try {
      const stream = await withRetry(
        () =>
          this.client.chat.stream({
            model,
            messages: processedMessages,
            temperature,
            ...(maxTokens && { maxTokens }),
          }),
        this.retryOptions
      );

      for await (const event of stream) {
        const content = event.data.choices?.[0]?.delta?.content;
        if (content && typeof content === 'string') {
          yield content;
        }
      }
    } catch (error) {
      console.error('[MistralClient] Stream failed after retries:', error);
      throw new MistralAPIError('Failed to stream chat request', error);
    }
  }

  public async *streamChat(
    userMessage: string,
    options: Omit<ChatOptions, 'jsonMode'> = {}
  ): AsyncIterable<string> {
    const { systemPrompt, ...restOptions } = options;

    const messages: ChatMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: userMessage });

    yield* this.streamComplete(messages, restOptions);
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const response = await this.chat('Réponds "ok".', {
        maxTokens: 10,
      });
      return response !== null;
    } catch {
      return false;
    }
  }

  public getDefaultModel(): string {
    return this.defaultModel;
  }

  // ============================================
  // Embeddings
  // ============================================

  public async generateEmbedding(text: string): Promise<number[]> {
    console.log(
      `[MistralClient] Generating embedding for text (${text.length} chars)`
    );

    try {
      const response = await withRetry(
        () =>
          this.client.embeddings.create({
            model: 'mistral-embed',
            inputs: [text],
          }),
        this.retryOptions
      );

      const embedding = response.data?.[0]?.embedding;

      if (!embedding) {
        throw new MistralAPIError('No embedding returned from Mistral');
      }

      console.log(
        `[MistralClient] Embedding generated (dimension: ${embedding.length})`
      );

      return embedding;
    } catch (error) {
      console.error('[MistralClient] Embedding generation failed:', error);
      throw new MistralAPIError('Failed to generate embedding', error);
    }
  }

  public async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    console.log(
      `[MistralClient] Generating embeddings for ${texts.length} texts`
    );

    try {
      const response = await withRetry(
        () =>
          this.client.embeddings.create({
            model: 'mistral-embed',
            inputs: texts,
          }),
        this.retryOptions
      );

      const embeddings =
        response.data
          ?.map((item) => item.embedding)
          .filter(
            (embedding): embedding is number[] => embedding !== undefined
          ) ?? [];

      if (embeddings.length !== texts.length) {
        throw new MistralAPIError(
          `Expected ${texts.length} embeddings, got ${embeddings.length}`
        );
      }

      console.log(
        `[MistralClient] ${embeddings.length} embeddings generated (dimension: ${embeddings[0]?.length})`
      );

      return embeddings;
    } catch (error) {
      console.error(
        '[MistralClient] Batch embedding generation failed:',
        error
      );
      throw new MistralAPIError('Failed to generate embeddings', error);
    }
  }
}

// Singleton
let instance: MistralClient | null = null;

export function getMistralClient(config?: MistralConfig): MistralClient {
  if (!instance) {
    instance = new MistralClient(config);
  }
  return instance;
}

export function resetMistralClient(): void {
  instance = null;
}
