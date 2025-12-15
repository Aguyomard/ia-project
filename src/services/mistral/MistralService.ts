import { Mistral } from '@mistralai/mistralai';
import type {
  ChatMessage,
  ChatOptions,
  MistralConfig,
  RetryConfig,
} from './types.js';
import {
  MistralConfigError,
  MistralAPIError,
  MistralParseError,
} from './errors.js';
import { withRetry, type RetryOptions } from '../../utils/retry.js';
import {
  applySlidingWindow,
  getModelContextLimit,
  estimateTotalTokens,
  type SlidingWindowConfig,
} from '../../utils/tokenizer.js';

/**
 * Service pour interagir avec l'API Mistral AI
 *
 * @example
 * ```ts
 * const mistral = getMistralService();
 * const response = await mistral.chat('Bonjour !');
 * ```
 */
export class MistralService {
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

    // Configuration du retry avec exponential backoff
    this.retryOptions = {
      maxRetries: config.retry?.maxRetries ?? 3,
      baseDelay: config.retry?.baseDelay ?? 1000,
      multiplier: config.retry?.multiplier ?? 2,
      maxDelay: config.retry?.maxDelay ?? 30000,
      onRetry: (attempt, delay, error) => {
        console.warn(
          `[MistralService] Retry ${attempt}/${this.retryOptions.maxRetries} after ${Math.round(delay)}ms`,
          error instanceof Error ? error.message : error
        );
      },
    };
  }

  /**
   * Envoie un message simple et retourne la réponse
   */
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

  /**
   * Envoie un message et retourne directement un objet JSON typé
   *
   * Utilise response_format: json_object de l'API Mistral pour garantir du JSON valide.
   *
   * @example
   * ```ts
   * interface Recipe { name: string; ingredients: string[] }
   * const recipe = await mistral.chatJSON<Recipe>('Donne une recette de cookies');
   * console.log(recipe.ingredients);
   * ```
   */
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

  /**
   * Envoie une conversation complète (avec historique)
   * Inclut :
   * - Sliding window automatique pour éviter de dépasser la limite de contexte
   * - Retry automatique avec exponential backoff pour les erreurs 429/500/503
   */
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

    // Appliquer la sliding window si activée
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
      `[MistralService] Calling ${model} with ${processedMessages.length} messages ` +
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

      // Le contenu peut être string ou ContentChunk[]
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
      console.error('[MistralService] API call failed after retries:', error);
      throw new MistralAPIError('Failed to complete chat request', error);
    }
  }

  /**
   * Stream une conversation complète (avec historique)
   * Retourne un AsyncIterable qui yield chaque chunk de texte
   * Inclut :
   * - Sliding window automatique pour éviter de dépasser la limite de contexte
   * - Retry automatique avec exponential backoff pour l'initialisation du stream
   *
   * @example
   * ```ts
   * for await (const chunk of mistral.streamComplete(messages)) {
   *   process.stdout.write(chunk);
   * }
   * ```
   */
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

    // Appliquer la sliding window si activée
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
      `[MistralService] Streaming ${model} with ${processedMessages.length} messages ` +
        `(~${estimateTotalTokens(processedMessages)} tokens)`
    );

    try {
      // Le retry s'applique à l'initialisation du stream
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
      console.error('[MistralService] Stream failed after retries:', error);
      throw new MistralAPIError('Failed to stream chat request', error);
    }
  }

  /**
   * Stream un message simple
   */
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

  /**
   * Vérifie que la connexion à Mistral fonctionne
   */
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

  /**
   * Retourne le modèle par défaut
   */
  public getDefaultModel(): string {
    return this.defaultModel;
  }
}

// ============================================
// Singleton (avec support pour les tests)
// ============================================

let instance: MistralService | null = null;

/**
 * Retourne l'instance singleton du service
 */
export function getMistralService(config?: MistralConfig): MistralService {
  if (!instance) {
    instance = new MistralService(config);
  }
  return instance;
}

/**
 * Reset le singleton (utile pour les tests)
 */
export function resetMistralService(): void {
  instance = null;
}

export default MistralService;
