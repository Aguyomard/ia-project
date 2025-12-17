import type { Request, Response } from 'express';
import { getDocumentService } from '../services/document/index.js';

/**
 * POST /api/documents - Ajouter un document
 */
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

    console.log('📄 Adding document:', content.substring(0, 50) + '...');

    const documentService = getDocumentService();
    const document = await documentService.addDocument({ content });

    console.log('✅ Document added:', document.id);
    res
      .status(201)
      .json({ document: { id: document.id, content: document.content } });
  } catch (error) {
    console.error('❌ Error adding document:', error);
    res.status(500).json({ error: 'Failed to add document' });
  }
}

/**
 * POST /api/documents/batch - Ajouter plusieurs documents
 */
export async function addDocuments(req: Request, res: Response): Promise<void> {
  try {
    const { contents } = req.body;

    if (!Array.isArray(contents) || contents.length === 0) {
      res.status(400).json({ error: 'Contents array is required' });
      return;
    }

    // Valider chaque contenu
    for (const content of contents) {
      if (typeof content !== 'string' || content.trim().length === 0) {
        res
          .status(400)
          .json({ error: 'All contents must be non-empty strings' });
        return;
      }
    }

    console.log(`📄 Adding ${contents.length} documents...`);

    const documentService = getDocumentService();
    const documents = await documentService.addDocuments(contents);

    console.log(`✅ ${documents.length} documents added`);
    res.status(201).json({
      documents: documents.map((d) => ({ id: d.id, content: d.content })),
    });
  } catch (error) {
    console.error('❌ Error adding documents:', error);
    res.status(500).json({ error: 'Failed to add documents' });
  }
}

/**
 * GET /api/documents - Lister les documents
 */
export async function listDocuments(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const documentService = getDocumentService();
    const documents = await documentService.listDocuments(limit, offset);
    const count = await documentService.count();

    res.json({ documents, total: count });
  } catch (error) {
    console.error('❌ Error listing documents:', error);
    res.status(500).json({ error: 'Failed to list documents' });
  }
}

/**
 * GET /api/documents/:id - Récupérer un document
 */
export async function getDocument(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid document ID' });
      return;
    }

    const documentService = getDocumentService();
    const document = await documentService.getDocument(id);

    res.json({ document: { id: document.id, content: document.content } });
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
    console.error('❌ Error getting document:', error);
    res.status(500).json({ error: 'Failed to get document' });
  }
}

/**
 * DELETE /api/documents/:id - Supprimer un document
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

    const documentService = getDocumentService();
    const deleted = await documentService.deleteDocument(id);

    if (!deleted) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    console.log('🗑️ Document deleted:', id);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
}

/**
 * POST /api/documents/search - Recherche sémantique
 */
export async function searchDocuments(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { query, limit = 5, maxDistance } = req.body;

    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'Query is required' });
      return;
    }

    console.log('🔍 Searching documents:', query);

    const documentService = getDocumentService();
    const results = await documentService.searchSimilar(query, {
      limit,
      maxDistance,
    });

    console.log(`✅ Found ${results.length} results`);
    res.json({ results });
  } catch (error) {
    console.error('❌ Error searching documents:', error);
    res.status(500).json({ error: 'Failed to search documents' });
  }
}
