/**
 * Erreurs spécifiques au service de conversations (non-domaine)
 */

export class InvalidInputError extends Error {
  public readonly code = 'INVALID_INPUT';

  constructor(message: string) {
    super(message);
    this.name = 'InvalidInputError';
  }
}

