import type { ChunkWithDistance } from '../../../domain/document/index.js';

/**
 * Convertit une distance cosinus (0-2) en pourcentage de similarité (0-100%)
 * Distance 0 = 100%, Distance 1 = 50%, Distance 2 = 0%
 */
export function distanceToSimilarity(distance: number): number {
  return Math.round((1 - distance / 2) * 100);
}

/**
 * Convertit un score de reranking en pourcentage (0-100%) via sigmoid
 */
export function rerankScoreToSimilarity(score: number): number {
  const normalized = 1 / (1 + Math.exp(-score));
  return Math.round(normalized * 100);
}

export function getChunkTitle(chunk: ChunkWithDistance): string {
  return chunk.documentTitle || `Document #${chunk.documentId}`;
}
