import type { IMistralClient } from '../../ports/out/IMistralClient.js';
import type {
  IQueryRewriterService,
  QueryRewriteResult,
} from '../../ports/out/IQueryRewriterService.js';
import { QueryRewriterConfig, DEFAULT_QUERY_REWRITER_CONFIG } from './types.js';
import { createLogger } from '../../../infrastructure/logging/index.js';

const log = createLogger('QueryRewriter');

const REWRITE_SYSTEM_PROMPT = `Tu es un expert en reformulation de requêtes pour un système de recherche sémantique dans une base de documents d'entreprise.

OBJECTIF: Reformuler la question de l'utilisateur pour maximiser les chances de trouver des documents pertinents via recherche vectorielle.

RÈGLES:
- Développe les abréviations courantes (mdp → mot de passe, wifi → réseau WiFi, vpn → accès VPN distant, rh → ressources humaines, cp → congés payés)
- Reformule les questions vagues en questions précises
- Si la question fait référence à un élément du contexte conversationnel (ça, le, la, il, elle), inclus explicitement ce à quoi elle fait référence
- Garde la requête concise (max 30 mots)
- Si la question est déjà claire et complète, retourne-la telle quelle
- Réponds UNIQUEMENT avec la question reformulée, sans explication ni guillemets`;

export class QueryRewriterService implements IQueryRewriterService {
  private config: QueryRewriterConfig;

  constructor(
    private mistralClient: IMistralClient,
    config: Partial<QueryRewriterConfig> = {}
  ) {
    this.config = { ...DEFAULT_QUERY_REWRITER_CONFIG, ...config };
  }

  async rewrite(
    query: string,
    conversationContext: string[] = []
  ): Promise<QueryRewriteResult> {
    if (
      !this.config.enabled ||
      query.trim().length < this.config.minQueryLength
    ) {
      return this.fallbackResult(query);
    }

    try {
      const userPrompt = this.buildUserPrompt(query, conversationContext);

      const rewrittenQuery = await this.mistralClient.complete(
        [
          { role: 'system', content: REWRITE_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        { temperature: 0.1, maxTokens: 100 }
      );

      if (!rewrittenQuery) {
        return this.fallbackResult(query);
      }

      const cleanedQuery = rewrittenQuery
        .trim()
        .replace(/^["'«]|["'»]$/g, '')
        .trim();

      if (!cleanedQuery || cleanedQuery.toLowerCase() === query.toLowerCase()) {
        return this.fallbackResult(query);
      }

      log.info({ original: query, rewritten: cleanedQuery }, 'Query rewritten');

      return {
        originalQuery: query,
        rewrittenQuery: cleanedQuery,
        wasRewritten: true,
      };
    } catch (error) {
      log.warn({ err: error, query }, 'Query rewrite failed, using original');
      return this.fallbackResult(query);
    }
  }

  private buildUserPrompt(
    query: string,
    conversationContext: string[]
  ): string {
    const contextMessages = conversationContext.slice(
      -this.config.maxContextMessages
    );

    if (contextMessages.length > 0) {
      return `CONTEXTE CONVERSATIONNEL:
${contextMessages.map((msg, i) => `${i + 1}. ${msg}`).join('\n')}

QUESTION À REFORMULER:
${query}`;
    }

    return `QUESTION À REFORMULER:
${query}`;
  }

  private fallbackResult(query: string): QueryRewriteResult {
    return {
      originalQuery: query,
      rewrittenQuery: query,
      wasRewritten: false,
    };
  }
}
