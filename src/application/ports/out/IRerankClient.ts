import type {
  RerankDocument,
  RerankResult,
} from '../../../infrastructure/external/rerank/types.js';

/**
 * Port de sortie pour le service de reranking
 */
export interface IRerankClient {
  /**
   * Vérifie si le service de reranking est disponible
   */
  isAvailable(): Promise<boolean>;

  /**
   * Rerank les documents par rapport à la requête
   *
   * @param query - La question/requête de l'utilisateur
   * @param documents - Les documents à reranker
   * @param topK - Nombre de résultats à retourner
   * @returns Les documents rerankés triés par pertinence
   */
  rerank(
    query: string,
    documents: RerankDocument[],
    topK?: number
  ): Promise<RerankResult[]>;
}

export type { RerankDocument, RerankResult };



