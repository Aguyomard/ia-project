/**
 * Erreurs personnalisées pour le client Mistral AI
 */

export class MistralError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'MistralError';
  }
}

export class MistralConfigError extends MistralError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR');
  }
}

export class MistralAPIError extends MistralError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'API_ERROR', originalError);
  }
}

export class MistralParseError extends MistralError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'PARSE_ERROR', originalError);
  }
}
