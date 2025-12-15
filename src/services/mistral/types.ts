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

export interface RetryConfig {
  /** Nombre maximum de tentatives (défaut: 3) */
  maxRetries?: number;
  /** Délai initial en ms (défaut: 1000) */
  baseDelay?: number;
  /** Multiplicateur pour l'exponential backoff (défaut: 2) */
  multiplier?: number;
  /** Délai maximum en ms (défaut: 30000) */
  maxDelay?: number;
}

export interface MistralConfig {
  apiKey?: string;
  defaultModel?: string;
  defaultTemperature?: number;
  /** Configuration du retry avec exponential backoff */
  retry?: RetryConfig;
}

