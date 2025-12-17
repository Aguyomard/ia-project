/**
 * Value Object représentant le rôle d'un message
 */
export type MessageRole = 'system' | 'user' | 'assistant';

export const MessageRoles = {
  SYSTEM: 'system' as const,
  USER: 'user' as const,
  ASSISTANT: 'assistant' as const,
};

export function isValidMessageRole(role: string): role is MessageRole {
  return ['system', 'user', 'assistant'].includes(role);
}

