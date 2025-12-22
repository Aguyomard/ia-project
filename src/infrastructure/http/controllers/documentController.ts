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
import {
  AddDocumentSchema,
  AddDocumentWithChunkingSchema,
  ListDocumentsQuerySchema,
  DocumentIdParamSchema,
  SearchDocumentsSchema,
  validateBody,
  validateQuery,
  validateParams,
} from '../schemas/index.js';

export async function addDocument(req: Request, res: Response): Promise<void> {
  try {
    const validation = validateBody(AddDocumentSchema, req.body, res);
    if (!validation.success) return;

    const result = await addDocumentUseCase.execute(validation.data);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error adding document:', error);
    res.status(500).json({ error: 'Failed to add document' });
  }
}

export async function listDocuments(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const validation = validateQuery(ListDocumentsQuerySchema, req.query, res);
    if (!validation.success) return;

    const result = await listDocumentsUseCase.execute(validation.data);
    res.json(result);
  } catch (error) {
    console.error('Error listing documents:', error);
    res.status(500).json({ error: 'Failed to list documents' });
  }
}

export async function getDocument(req: Request, res: Response): Promise<void> {
  try {
    const validation = validateParams(DocumentIdParamSchema, req.params, res);
    if (!validation.success) return;

    const result = await getDocumentUseCase.execute({ id: validation.data.id });
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

export async function deleteDocument(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const validation = validateParams(DocumentIdParamSchema, req.params, res);
    if (!validation.success) return;

    const result = await deleteDocumentUseCase.execute({ id: validation.data.id });

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
    const validation = validateBody(SearchDocumentsSchema, req.body, res);
    if (!validation.success) return;

    const result = await searchDocumentsUseCase.execute(validation.data);
    res.json({ results: result.results });
  } catch (error) {
    console.error('Error searching documents:', error);
    res.status(500).json({ error: 'Failed to search documents' });
  }
}

export async function addDocumentWithChunking(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const validation = validateBody(AddDocumentWithChunkingSchema, req.body, res);
    if (!validation.success) return;

    const result = await addDocumentWithChunkingUseCase.execute(validation.data);

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
