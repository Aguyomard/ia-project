import { InvalidInputError } from './errors.js';

/**
 * Validateurs pour le service de conversations
 */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Valide qu'une valeur est un UUID valide
 */
export function validateUUID(value: string, fieldName: string): void {
  if (!value || !UUID_REGEX.test(value)) {
    throw new InvalidInputError(`Invalid ${fieldName}: must be a valid UUID`);
  }
}

/**
 * Valide que le contenu n'est pas vide
 */
export function validateContent(content: string): void {
  if (!content || content.trim().length === 0) {
    throw new InvalidInputError('Content cannot be empty');
  }
}

/**
 * Valide le rôle d'un message
 */
export function validateRole(
  role: string
): asserts role is 'system' | 'user' | 'assistant' {
  const validRoles = ['system', 'user', 'assistant'];
  if (!validRoles.includes(role)) {
    throw new InvalidInputError(
      `Invalid role: must be one of ${validRoles.join(', ')}`
    );
  }
}

