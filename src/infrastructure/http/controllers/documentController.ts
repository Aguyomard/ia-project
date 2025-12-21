import type { Request, Response } from 'express';
import {
  addDocumentUseCase,
  addDocumentsUseCase,
  listDocumentsUseCase,
  getDocumentUseCase,
  deleteDocumentUseCase,
  searchDocumentsUseCase,
  addDocumentWithChunkingUseCase,
  type ChunkInfo,
} from '../../../application/usecases/index.js';
import type { Document } from '../../../domain/document/index.js';

export async function addDocument(req: Request, res: Response): Promise<void> {
  try {
    const { content } = req.body;

    if (!content || typeof content !== 'string') {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    if (content.trim().length === 0) {
      res.status(400).json({ error: 'Content cannot be empty' });
      return;
    }

    const result = await addDocumentUseCase.execute({ content });
    res.status(201).json(result);
  } catch (error) {
    console.error('Error adding document:', error);
    res.status(500).json({ error: 'Failed to add document' });
  }
}

export async function addDocuments(req: Request, res: Response): Promise<void> {
  try {
    const { contents } = req.body;

    if (!Array.isArray(contents) || contents.length === 0) {
      res.status(400).json({ error: 'Contents array is required' });
      return;
    }

    for (const content of contents) {
      if (typeof content !== 'string' || content.trim().length === 0) {
        res
          .status(400)
          .json({ error: 'All contents must be non-empty strings' });
        return;
      }
    }

    const result = await addDocumentsUseCase.execute({ contents });
    res.status(201).json(result);
  } catch (error) {
    console.error('Error adding documents:', error);
    res.status(500).json({ error: 'Failed to add documents' });
  }
}

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
      'code' in error &&
      error.code === 'NOT_FOUND'
    ) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    console.error('Error getting document:', error);
    res.status(500).json({ error: 'Failed to get document' });
  }
}

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
    res.json({ results: result.documents });
  } catch (error) {
    console.error('Error searching documents:', error);
    res.status(500).json({ error: 'Failed to search documents' });
  }
}

/**
 * Ajoute un document avec chunking automatique et overlap
 *
 * Le document est découpé en chunks avec chevauchement,
 * chaque chunk étant sauvegardé comme un document séparé
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
      sourceId: result.sourceId,
      totalChunks: result.totalChunks,
      originalLength: result.originalLength,
      documents: result.documents.map((doc: Document) => ({
        id: doc.id,
        sourceId: doc.sourceId,
        chunkIndex: doc.chunkIndex,
        contentPreview:
          doc.content.substring(0, 100) +
          (doc.content.length > 100 ? '...' : ''),
      })),
      chunks: result.chunks.map((chunk: ChunkInfo) => ({
        index: chunk.index,
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
        length: chunk.content.length,
      })),
    });
  } catch (error) {
    console.error('Error adding document with chunking:', error);
    res.status(500).json({ error: 'Failed to add document with chunking' });
  }
}
