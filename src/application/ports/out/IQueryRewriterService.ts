/**
 * Result of a query rewrite operation
 */
export interface QueryRewriteResult {
  /** The original query from the user */
  originalQuery: string;
  /** The rewritten/optimized query for search */
  rewrittenQuery: string;
  /** Whether the query was actually modified */
  wasRewritten: boolean;
}

/**
 * Service for rewriting user queries to optimize semantic search
 */
export interface IQueryRewriterService {
  /**
   * Rewrites a user query to maximize semantic search effectiveness
   * @param query - The original user query
   * @param conversationContext - Optional previous messages for context
   * @returns The rewrite result with original and optimized query
   */
  rewrite(
    query: string,
    conversationContext?: string[]
  ): Promise<QueryRewriteResult>;
}
