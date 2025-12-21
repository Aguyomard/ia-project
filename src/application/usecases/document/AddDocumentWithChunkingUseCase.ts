import type {
  IAddDocumentWithChunkingUseCase,
  AddDocumentWithChunkingInput,
  AddDocumentWithChunkingOutput,
  ChunkInfo,
} from '../../ports/in/document.js';
import type { IDocumentService } from '../../ports/out/IDocumentService.js';
import { getDocumentService } from '../../services/document/index.js';
import {
  getChunkingService,
  type ChunkingService,
} from '../../services/chunking/index.js';
import { getDocumentRepository } from '../../../infrastructure/persistence/index.js';
import { getMistralClient } from '../../../infrastructure/external/mistral/index.js';
import type { Document } from '../../../domain/document/index.js';

export type { AddDocumentWithChunkingInput, AddDocumentWithChunkingOutput };

/**
 * Use Case : Ajouter un document avec chunking automatique et overlap
 *
 * Ce use case :
 * 1. Sauvegarde le document original (sans embedding) comme source
 * 2. Découpe le document en chunks avec chevauchement
 * 3. Génère un embedding pour chaque chunk
 * 4. Sauvegarde chaque chunk avec référence au document source
 *
 * Le chevauchement (overlap) permet de préserver le contexte entre les chunks,
 * améliorant ainsi la qualité de la recherche sémantique.
 */
export class AddDocumentWithChunkingUseCase
  implements IAddDocumentWithChunkingUseCase
{
  constructor(
    private readonly documentService: IDocumentService,
    private readonly chunkingService: ChunkingService
  ) {}

  async execute(
    input: AddDocumentWithChunkingInput
  ): Promise<AddDocumentWithChunkingOutput> {
    const { content, chunkSize, overlap } = input;

    // 1. Découper le document en chunks
    const chunkingResult = this.chunkingService.chunkText(content, {
      chunkSize,
      overlap,
    });

    console.log(
      `📄 Chunking: ${chunkingResult.originalLength} chars → ${chunkingResult.totalChunks} chunks ` +
        `(size: ${chunkSize || 500}, overlap: ${overlap || 100})`
    );

    const repository = getDocumentRepository();
    const mistral = getMistralClient();

    // 2. Créer le document source (sans embedding, juste pour garder le contenu original)
    const sourceDoc = await repository.createSource(content);
    console.log(`📝 Source document created with ID: ${sourceDoc.id}`);

    // 3. Générer les embeddings pour tous les chunks en batch
    const chunkContents = chunkingResult.chunks.map((chunk) => chunk.content);
    const embeddings = await mistral.generateEmbeddings(chunkContents);

    // 4. Sauvegarder chaque chunk avec référence au document source
    const documents: Document[] = [];
    for (let i = 0; i < chunkingResult.chunks.length; i++) {
      const chunk = chunkingResult.chunks[i];
      const doc = await repository.create({
        content: chunk.content,
        embedding: embeddings[i],
        sourceId: sourceDoc.id,
        chunkIndex: chunk.index,
      });
      documents.push(doc);
    }

    // 5. Construire les infos des chunks pour le retour
    const chunks: ChunkInfo[] = chunkingResult.chunks.map((chunk) => ({
      content: chunk.content,
      index: chunk.index,
      startOffset: chunk.startOffset,
      endOffset: chunk.endOffset,
    }));

    console.log(
      `✅ ${documents.length} chunks saved to database (source_id: ${sourceDoc.id})`
    );

    return {
      documents,
      chunks,
      totalChunks: chunkingResult.totalChunks,
      originalLength: chunkingResult.originalLength,
      sourceId: sourceDoc.id,
    };
  }
}

export function createAddDocumentWithChunkingUseCase(
  documentService: IDocumentService = getDocumentService(),
  chunkingService: ChunkingService = getChunkingService()
): AddDocumentWithChunkingUseCase {
  return new AddDocumentWithChunkingUseCase(documentService, chunkingService);
}

export const addDocumentWithChunkingUseCase =
  createAddDocumentWithChunkingUseCase();
