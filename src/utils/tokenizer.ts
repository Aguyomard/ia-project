/**
 * Utilitaire de gestion des tokens et de la fenêtre de contexte
 *
 * Note: Mistral n'a pas de tokenizer officiel en JS.
 * On utilise une approximation basée sur les caractères.
 * Pour plus de précision, on pourrait utiliser tiktoken (OpenAI) ou gpt-tokenizer.
 */

import type { ChatMessage } from '../services/mistral/types.js';

/**
 * Limites de tokens par modèle Mistral
 */
export const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  'mistral-tiny': 32000,
  'mistral-small': 32000,
  'mistral-medium': 32000,
  'mistral-large': 32000,
  'mistral-large-latest': 128000,
  'open-mistral-7b': 32000,
  'open-mixtral-8x7b': 32000,
  'open-mixtral-8x22b': 64000,
  // Défaut si modèle inconnu
  default: 32000,
};

/**
 * Estimation du nombre de tokens dans un texte
 *
 * Règle approximative :
 * - Anglais : ~4 caractères = 1 token
 * - Français : ~3.5 caractères = 1 token (accents, mots plus longs)
 * - Code : ~3 caractères = 1 token
 *
 * On utilise 3.5 comme moyenne pour être conservateur
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  // Approximation : 1 token ≈ 3.5 caractères
  const charCount = text.length;
  const tokenEstimate = Math.ceil(charCount / 3.5);

  // Ajouter un petit buffer pour les tokens spéciaux (début/fin de message)
  return tokenEstimate + 4;
}

/**
 * Estime le nombre de tokens dans un message
 */
export function estimateMessageTokens(message: ChatMessage): number {
  // Tokens pour le contenu + overhead pour le rôle et le formatage
  const contentTokens = estimateTokens(message.content);
  const roleOverhead = 4; // <|role|> tokens

  return contentTokens + roleOverhead;
}

/**
 * Estime le nombre total de tokens dans un historique
 */
export function estimateTotalTokens(messages: ChatMessage[]): number {
  return messages.reduce((total, msg) => total + estimateMessageTokens(msg), 0);
}

/**
 * Configuration pour la sliding window
 */
export interface SlidingWindowConfig {
  /** Limite max de tokens (ou auto-détecté via le modèle) */
  maxTokens?: number;
  /** Tokens réservés pour la réponse (défaut: 1000) */
  reservedForResponse?: number;
  /** Garder le system prompt en premier (défaut: true) */
  preserveSystemPrompt?: boolean;
  /** Nombre minimum de messages à garder (défaut: 2) */
  minMessages?: number;
}

/**
 * Applique une sliding window à l'historique de conversation
 *
 * Stratégie :
 * 1. Toujours garder le system prompt (s'il existe)
 * 2. Toujours garder les N derniers messages (minMessages)
 * 3. Supprimer les messages les plus anciens jusqu'à être sous la limite
 *
 * @example
 * ```ts
 * const trimmedHistory = applySlidingWindow(history, {
 *   maxTokens: 30000,
 *   reservedForResponse: 2000,
 * });
 * ```
 */
export function applySlidingWindow(
  messages: ChatMessage[],
  config: SlidingWindowConfig = {}
): ChatMessage[] {
  const {
    maxTokens = MODEL_CONTEXT_LIMITS.default,
    reservedForResponse = 1000,
    preserveSystemPrompt = true,
    minMessages = 2,
  } = config;

  if (messages.length === 0) {
    return [];
  }

  // Budget disponible pour l'historique
  const tokenBudget = maxTokens - reservedForResponse;

  // Séparer le system prompt du reste
  let systemPrompt: ChatMessage | null = null;
  let conversationMessages = [...messages];

  if (preserveSystemPrompt && messages[0]?.role === 'system') {
    systemPrompt = messages[0];
    conversationMessages = messages.slice(1);
  }

  // Calculer les tokens du system prompt
  const systemTokens = systemPrompt ? estimateMessageTokens(systemPrompt) : 0;
  let availableBudget = tokenBudget - systemTokens;

  // Si même le system prompt dépasse, on a un problème
  if (availableBudget <= 0) {
    console.warn(
      '[SlidingWindow] System prompt exceeds token budget! Truncating system prompt.'
    );
    // Tronquer le system prompt si nécessaire (cas rare)
    if (systemPrompt) {
      const maxSystemChars = (tokenBudget * 3.5) / 2; // La moitié du budget
      systemPrompt = {
        ...systemPrompt,
        content: systemPrompt.content.slice(0, maxSystemChars) + '...',
      };
      availableBudget = tokenBudget / 2;
    }
  }

  // Construire la liste finale en partant de la fin (messages les plus récents)
  const result: ChatMessage[] = [];
  let currentTokens = 0;

  // Parcourir les messages du plus récent au plus ancien
  for (let i = conversationMessages.length - 1; i >= 0; i--) {
    const message = conversationMessages[i];
    const messageTokens = estimateMessageTokens(message);

    // Vérifier si on peut ajouter ce message
    if (currentTokens + messageTokens <= availableBudget) {
      result.unshift(message); // Ajouter au début pour garder l'ordre
      currentTokens += messageTokens;
    } else {
      // On a atteint la limite, vérifier le minimum de messages
      if (result.length >= minMessages) {
        break; // On a assez de messages, on arrête
      }
      // Sinon, on force l'ajout pour avoir le minimum
      result.unshift(message);
      currentTokens += messageTokens;
      console.warn(
        `[SlidingWindow] Forced to include message to meet minMessages (${minMessages}), budget exceeded`
      );
    }
  }

  // Reconstruire avec le system prompt en premier
  const finalResult = systemPrompt ? [systemPrompt, ...result] : result;

  // Log pour debug
  const originalTokens = estimateTotalTokens(messages);
  const finalTokens = estimateTotalTokens(finalResult);

  if (messages.length !== finalResult.length) {
    console.log(
      `[SlidingWindow] Trimmed ${messages.length} → ${finalResult.length} messages ` +
        `(~${originalTokens} → ~${finalTokens} tokens)`
    );
  }

  return finalResult;
}

/**
 * Helper pour obtenir la limite de contexte d'un modèle
 */
export function getModelContextLimit(model: string): number {
  return MODEL_CONTEXT_LIMITS[model] ?? MODEL_CONTEXT_LIMITS.default;
}

/**
 * Vérifie si l'historique dépasse la limite
 */
export function isContextOverflow(
  messages: ChatMessage[],
  model: string,
  reservedForResponse = 1000
): boolean {
  const limit = getModelContextLimit(model);
  const used = estimateTotalTokens(messages);
  return used > limit - reservedForResponse;
}
