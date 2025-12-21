import type { ChunkingOptions, Chunk, ChunkingResult } from './types.js';
import { DEFAULT_CHUNKING_OPTIONS } from './types.js';

/**
 * Service de découpage de texte en chunks avec chevauchement (overlap)
 *
 * Le chevauchement permet de préserver le contexte entre les chunks,
 * ce qui améliore la qualité de la recherche sémantique.
 *
 * Exemple avec chunkSize=500 et overlap=100:
 *
 *  Document: |-------- 1200 caractères --------|
 *
 *  Chunk 1:  |--- 500 ---|
 *  Chunk 2:        |--- 500 ---|   (commence 400 chars après le début du chunk 1)
 *  Chunk 3:              |--- 500 ---|
 *
 *  Les 100 derniers caractères de chaque chunk se retrouvent
 *  dans les 100 premiers caractères du chunk suivant.
 */
export class ChunkingService {
  /**
   * Découpe un texte en chunks avec chevauchement
   */
  chunkText(text: string, options: ChunkingOptions = {}): ChunkingResult {
    const { chunkSize, overlap, separators } = {
      ...DEFAULT_CHUNKING_OPTIONS,
      ...options,
    };

    // Validation
    if (overlap >= chunkSize) {
      throw new Error(
        `Overlap (${overlap}) must be smaller than chunkSize (${chunkSize})`
      );
    }

    const cleanedText = text.trim();

    // Si le texte est plus court que la taille d'un chunk, on retourne un seul chunk
    if (cleanedText.length <= chunkSize) {
      return {
        chunks: [
          {
            content: cleanedText,
            index: 0,
            startOffset: 0,
            endOffset: cleanedText.length,
          },
        ],
        totalChunks: 1,
        originalLength: cleanedText.length,
      };
    }

    const chunks: Chunk[] = [];
    let currentPosition = 0;
    let chunkIndex = 0;

    while (currentPosition < cleanedText.length) {
      // Calculer la fin potentielle du chunk
      let endPosition = Math.min(
        currentPosition + chunkSize,
        cleanedText.length
      );

      // Si on n'est pas à la fin du texte, chercher un bon point de coupure
      if (endPosition < cleanedText.length) {
        const chunkContent = cleanedText.slice(currentPosition, endPosition);
        const splitPoint = this.findBestSplitPoint(chunkContent, separators);

        if (splitPoint !== -1 && splitPoint > chunkSize / 2) {
          // Utiliser le point de coupure trouvé (au moins à la moitié du chunk)
          endPosition = currentPosition + splitPoint;
        }
      }

      // Extraire le chunk
      const chunkContent = cleanedText
        .slice(currentPosition, endPosition)
        .trim();

      // Éviter les chunks trop petits (< 20% de chunkSize)
      const minChunkSize = Math.max(50, chunkSize * 0.2);

      if (chunkContent.length > 0) {
        // Si c'est un petit chunk résiduel et qu'on a déjà des chunks,
        // on le fusionne avec le précédent
        if (chunkContent.length < minChunkSize && chunks.length > 0) {
          const lastChunk = chunks[chunks.length - 1];
          lastChunk.content = cleanedText
            .slice(lastChunk.startOffset, endPosition)
            .trim();
          lastChunk.endOffset = endPosition;
        } else {
          chunks.push({
            content: chunkContent,
            index: chunkIndex,
            startOffset: currentPosition,
            endOffset: endPosition,
          });
          chunkIndex++;
        }
      }

      // Avancer la position en tenant compte de l'overlap
      // step = chunkSize - overlap
      const step = chunkSize - overlap;
      currentPosition = Math.min(currentPosition + step, endPosition);

      // Éviter une boucle infinie si on n'avance pas
      if (currentPosition >= cleanedText.length - 1) {
        break;
      }

      // S'assurer qu'on avance d'au moins 1 caractère
      if (currentPosition === chunks[chunks.length - 1]?.startOffset) {
        currentPosition++;
      }
    }

    // Reindexer les chunks après d'éventuelles fusions
    chunks.forEach((chunk, idx) => {
      chunk.index = idx;
    });

    return {
      chunks,
      totalChunks: chunks.length,
      originalLength: cleanedText.length,
    };
  }

  /**
   * Trouve le meilleur point de coupure dans un texte
   * en utilisant les séparateurs par ordre de priorité
   */
  private findBestSplitPoint(text: string, separators: string[]): number {
    // Chercher le dernier séparateur de haute priorité d'abord
    for (const separator of separators) {
      const lastIndex = text.lastIndexOf(separator);
      if (lastIndex !== -1) {
        // Retourner la position après le séparateur
        return lastIndex + separator.length;
      }
    }
    return -1;
  }

  /**
   * Estime le nombre de chunks qui seront générés
   */
  estimateChunkCount(
    textLength: number,
    options: ChunkingOptions = {}
  ): number {
    const { chunkSize, overlap } = { ...DEFAULT_CHUNKING_OPTIONS, ...options };

    if (textLength <= chunkSize) {
      return 1;
    }

    const step = chunkSize - overlap;
    return Math.ceil((textLength - overlap) / step);
  }
}

// Singleton
let instance: ChunkingService | null = null;

export function getChunkingService(): ChunkingService {
  if (!instance) {
    instance = new ChunkingService();
  }
  return instance;
}

export function resetChunkingService(): void {
  instance = null;
}
