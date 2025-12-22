/**
 * Configuration for the QueryRewriterService
 */
export interface QueryRewriterConfig {
  /** Whether query rewriting is enabled */
  enabled: boolean;
  /** Minimum query length to trigger rewriting */
  minQueryLength: number;
  /** Maximum number of conversation messages to include as context */
  maxContextMessages: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_QUERY_REWRITER_CONFIG: QueryRewriterConfig = {
  enabled: true,
  minQueryLength: 2,
  maxContextMessages: 3,
};
