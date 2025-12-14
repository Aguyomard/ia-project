/**
 * Module Mistral AI
 *
 * @example
 * ```ts
 * import { getMistralService } from './services/mistral';
 *
 * const mistral = getMistralService();
 * const response = await mistral.chat('Bonjour !');
 * ```
 */

// Service
export {
  MistralService,
  getMistralService,
  resetMistralService,
} from './MistralService.js';

// Types
export type { ChatMessage, ChatOptions, MistralConfig } from './types.js';

// Errors
export {
  MistralError,
  MistralConfigError,
  MistralAPIError,
  MistralParseError,
} from './errors.js';
