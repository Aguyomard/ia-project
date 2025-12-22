/**
 * Utilitaires pour le service RAG
 * Application layer - fonctions pures sans dépendances infrastructure
 */

import type { ChunkWithDistance } from '../../../domain/document/index.js';

// ============================================================================
// Conversion de similarité
// ============================================================================

/**
 * Convertit une distance cosinus (0-2) en pourcentage de similarité (0-100%)
 * Distance 0 = 100% similaire, Distance 1 = 50%, Distance 2 = 0%
 *
 * @param distance - Distance cosinus entre 0 et 2
 * @returns Pourcentage de similarité entre 0 et 100
 */
export function distanceToSimilarity(distance: number): number {
  return Math.round((1 - distance / 2) * 100);
}

/**
 * Convertit un score de reranking (-∞ à +∞) en pourcentage (0-100%)
 * Utilise une fonction sigmoid pour normaliser les scores.
 * Les scores sont normalement entre -10 et +10.
 *
 * @param score - Score brut du cross-encoder
 * @returns Pourcentage de similarité entre 0 et 100
 */
export function rerankScoreToSimilarity(score: number): number {
  const normalized = 1 / (1 + Math.exp(-score));
  return Math.round(normalized * 100);
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Retourne le titre d'un chunk (titre du document parent ou fallback)
 */
export function getChunkTitle(chunk: ChunkWithDistance): string {
  return chunk.documentTitle || `Document #${chunk.documentId}`;
}
