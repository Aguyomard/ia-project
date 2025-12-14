/**
 * Types pour le service Mistral AI
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface MistralConfig {
  apiKey?: string;
  defaultModel?: string;
  defaultTemperature?: number;
}

