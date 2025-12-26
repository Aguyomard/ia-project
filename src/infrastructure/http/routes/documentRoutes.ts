import { Router, type IRouter } from 'express';
import {
  addDocument,
  addDocumentWithChunking,
  listDocuments,
  getDocument,
  deleteDocument,
  searchDocuments,
} from '../controllers/documentController.js';
import { generalLimiter, documentLimiter, chatLimiter } from '../middlewares/index.js';

const router: IRouter = Router();

// CRUD Documents (rate limit strict pour création - génère des embeddings)
router.post('/documents', documentLimiter, addDocument);
router.post('/documents/chunked', documentLimiter, addDocumentWithChunking);
router.get('/documents', generalLimiter, listDocuments);
router.get('/documents/:id', generalLimiter, getDocument);
router.delete('/documents/:id', generalLimiter, deleteDocument);

// Recherche sémantique (génère un embedding pour la query)
router.post('/documents/search', chatLimiter, searchDocuments);

export default router;
