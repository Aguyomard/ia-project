import type {
  IAddDocumentWithChunkingUseCase,
  AddDocumentWithChunkingInput,
  AddDocumentWithChunkingOutput,
  ChunkInfo,
} from '../../ports/in/document.js';
import { getDocumentRepository } from '../../../infrastructure/persistence/index.js';
import { getMistralClient } from '../../../infrastructure/external/mistral/index.js';
import {
  getChunkingService,
  type ChunkingService,
} from '../../services/chunking/index.js';
import type { Chunk } from '../../../domain/document/index.js';

export type { AddDocumentWithChunkingInput, AddDocumentWithChunkingOutput };

/**
 * Use Case : Ajouter un document avec chunking automatique
 *
 * 1. Crée le document source dans la table `documents`
 * 2. Découpe le contenu en chunks avec overlap
 * 3. Génère les embeddings pour chaque chunk
 * 4. Sauvegarde les chunks dans la table `chunks`
 */
export class AddDocumentWithChunkingUseCase
  implements IAddDocumentWithChunkingUseCase
{
  constructor(private readonly chunkingService: ChunkingService) {}

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

    // 2. Créer le document source
    const document = await repository.createDocument({
      content,
      title: content.substring(0, 100),
    });
    console.log(`📝 Document created with ID: ${document.id}`);

    // 3. Générer les embeddings pour tous les chunks en batch
    const chunkContents = chunkingResult.chunks.map((c) => c.content);
    const embeddings = await mistral.generateEmbeddings(chunkContents);

    // 4. Sauvegarder les chunks
    const chunks: Chunk[] = [];
    for (let i = 0; i < chunkingResult.chunks.length; i++) {
      const chunkData = chunkingResult.chunks[i];
      const chunk = await repository.createChunk({
        documentId: document.id,
        content: chunkData.content,
        embedding: embeddings[i],
        chunkIndex: chunkData.index,
        startOffset: chunkData.startOffset,
        endOffset: chunkData.endOffset,
      });
      chunks.push(chunk);
    }

    // 5. Construire les infos des chunks pour le retour
    const chunkInfos: ChunkInfo[] = chunkingResult.chunks.map((c) => ({
      content: c.content,
      index: c.index,
      startOffset: c.startOffset,
      endOffset: c.endOffset,
    }));

    console.log(
      `✅ ${chunks.length} chunks saved to database (document_id: ${document.id})`
    );

    return {
      document,
      chunks,
      chunkInfos,
      totalChunks: chunkingResult.totalChunks,
      originalLength: chunkingResult.originalLength,
    };
  }
}

export function createAddDocumentWithChunkingUseCase(
  chunkingService: ChunkingService = getChunkingService()
): AddDocumentWithChunkingUseCase {
  return new AddDocumentWithChunkingUseCase(chunkingService);
}

export const addDocumentWithChunkingUseCase =
  createAddDocumentWithChunkingUseCase();
