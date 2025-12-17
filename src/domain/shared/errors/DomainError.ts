/**
 * Erreur de base pour toutes les erreurs du domaine
 */
export abstract class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

