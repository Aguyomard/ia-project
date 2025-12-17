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
  chat(userMessage: string, options?: ChatOptions): Promise<string | null>;
  chatJSON<T = Record<string, unknown>>(
    userMessage: string,
    options?: Omit<ChatOptions, 'jsonMode'>
  ): Promise<T>;
  complete(
    messages: ChatMessage[],
    options?: Omit<ChatOptions, 'systemPrompt'>
  ): Promise<string | null>;
  streamComplete(
    messages: ChatMessage[],
    options?: Omit<ChatOptions, 'systemPrompt' | 'jsonMode'>
  ): AsyncIterable<string>;
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}
