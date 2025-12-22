/**
 * Interface pour le logger - permet l'injection de dépendances
 */
export interface ILogger {
  /** Log d'information */
  info(message: string): void;
  /** Log d'avertissement */
  warn(message: string): void;
  /** Log d'erreur */
  error(message: string, error?: unknown): void;
  /** Log de debug (optionnel, peut être silencieux en prod) */
  debug?(message: string): void;
}

/**
 * Interface spécialisée pour les logs RAG
 * Étend ILogger avec des méthodes métier
 */
export interface IRAGLogger extends ILogger {
  /** Log les sources trouvées */
  sources(count: number, details: string): void;
  /** Log le résultat du reranking */
  rerank(before: number, after: number): void;
  /** Log le résultat du query rewriting */
  rewrite(original: string, rewritten: string): void;
}
