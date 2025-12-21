import type { Request, Response } from 'express';
import {
  addDocumentUseCase,
  listDocumentsUseCase,
  getDocumentUseCase,
  deleteDocumentUseCase,
  searchDocumentsUseCase,
  addDocumentWithChunkingUseCase,
  type ChunkInfo,
} from '../../../application/usecases/index.js';
import type { Chunk } from '../../../domain/document/index.js';

/**
 * Crée un document simple sans chunks
 * POST /api/documents
 */
export async function addDocument(req: Request, res: Response): Promise<void> {
  try {
    const { content, title } = req.body;

    if (!content || typeof content !== 'string') {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    if (content.trim().length === 0) {
      res.status(400).json({ error: 'Content cannot be empty' });
      return;
    }

    const result = await addDocumentUseCase.execute({ content, title });
    res.status(201).json(result);
  } catch (error) {
    console.error('Error adding document:', error);
    res.status(500).json({ error: 'Failed to add document' });
  }
}

/**
 * Liste tous les documents
 * GET /api/documents
 */
export async function listDocuments(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || undefined;
    const offset = parseInt(req.query.offset as string) || undefined;

    const result = await listDocumentsUseCase.execute({ limit, offset });
    res.json(result);
  } catch (error) {
    console.error('Error listing documents:', error);
    res.status(500).json({ error: 'Failed to list documents' });
  }
}

/**
 * Récupère un document avec ses chunks
 * GET /api/documents/:id
 */
export async function getDocument(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid document ID' });
      return;
    }

    const result = await getDocumentUseCase.execute({ id });
    res.json(result);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string' &&
      error.message.includes('not found')
    ) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    console.error('Error getting document:', error);
    res.status(500).json({ error: 'Failed to get document' });
  }
}

/**
 * Supprime un document (et ses chunks en cascade)
 * DELETE /api/documents/:id
 */
export async function deleteDocument(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid document ID' });
      return;
    }

    const result = await deleteDocumentUseCase.execute({ id });

    if (!result.success) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
}

/**
 * Recherche sémantique dans les chunks
 * POST /api/documents/search
 */
export async function searchDocuments(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { query, limit, maxDistance } = req.body;

    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'Query is required' });
      return;
    }

    const result = await searchDocumentsUseCase.execute({
      query,
      limit,
      maxDistance,
    });
    res.json({ results: result.results });
  } catch (error) {
    console.error('Error searching documents:', error);
    res.status(500).json({ error: 'Failed to search documents' });
  }
}

/**
 * Ajoute un document avec chunking automatique et overlap
 *
 * Le document est découpé en chunks avec chevauchement,
 * chaque chunk étant sauvegardé dans la table `chunks`
 * avec son propre embedding.
 *
 * POST /api/documents/chunked
 * Body: { content: string, chunkSize?: number, overlap?: number }
 */
export async function addDocumentWithChunking(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { content, chunkSize, overlap } = req.body;

    if (!content || typeof content !== 'string') {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    if (content.trim().length === 0) {
      res.status(400).json({ error: 'Content cannot be empty' });
      return;
    }

    // Validation des paramètres optionnels
    if (chunkSize !== undefined) {
      if (typeof chunkSize !== 'number' || chunkSize < 50) {
        res.status(400).json({ error: 'chunkSize must be a number >= 50' });
        return;
      }
    }

    if (overlap !== undefined) {
      if (typeof overlap !== 'number' || overlap < 0) {
        res.status(400).json({ error: 'overlap must be a number >= 0' });
        return;
      }
    }

    if (
      chunkSize !== undefined &&
      overlap !== undefined &&
      overlap >= chunkSize
    ) {
      res.status(400).json({ error: 'overlap must be smaller than chunkSize' });
      return;
    }

    const result = await addDocumentWithChunkingUseCase.execute({
      content,
      chunkSize,
      overlap,
    });

    res.status(201).json({
      message: `Document split into ${result.totalChunks} chunks`,
      document: {
        id: result.document.id,
        title: result.document.title,
        contentLength: result.document.content.length,
      },
      totalChunks: result.totalChunks,
      originalLength: result.originalLength,
      chunks: result.chunks.map((chunk: Chunk) => ({
        id: chunk.id,
        chunkIndex: chunk.chunkIndex,
        contentPreview:
          chunk.content.substring(0, 100) +
          (chunk.content.length > 100 ? '...' : ''),
      })),
      chunkInfos: result.chunkInfos.map((info: ChunkInfo) => ({
        index: info.index,
        startOffset: info.startOffset,
        endOffset: info.endOffset,
        length: info.content.length,
      })),
    });
  } catch (error) {
    console.error('Error adding document with chunking:', error);
    res.status(500).json({ error: 'Failed to add document with chunking' });
  }
}
