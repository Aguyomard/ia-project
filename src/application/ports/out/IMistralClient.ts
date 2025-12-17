/**
 * Port secondaire pour le client Mistral AI
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  systemPrompt?: string;
}

export interface IMistralClient {
  /**
   * Envoie un message simple et obtient une réponse
   */
  chat(userMessage: string, options?: ChatOptions): Promise<string | null>;

  /**
   * Envoie un message et obtient une réponse JSON parsée
   */
  chatJSON<T = Record<string, unknown>>(
    userMessage: string,
    options?: Omit<ChatOptions, 'jsonMode'>
  ): Promise<T>;

  /**
   * Complète une conversation avec historique
   */
  complete(
    messages: ChatMessage[],
    options?: Omit<ChatOptions, 'systemPrompt'>
  ): Promise<string | null>;

  /**
   * Complète une conversation en mode streaming
   */
  streamComplete(
    messages: ChatMessage[],
    options?: Omit<ChatOptions, 'systemPrompt' | 'jsonMode'>
  ): AsyncIterable<string>;

  /**
   * Génère un embedding pour un texte
   */
  generateEmbedding(text: string): Promise<number[]>;

  /**
   * Génère des embeddings pour plusieurs textes
   */
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}

