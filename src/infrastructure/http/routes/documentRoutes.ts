import { Router } from 'express';
import {
  addDocument,
  addDocuments,
  addDocumentWithChunking,
  listDocuments,
  getDocument,
  deleteDocument,
  searchDocuments,
} from '../controllers/documentController.js';

const router = Router();

// CRUD Documents
router.post('/documents', addDocument);
router.post('/documents/batch', addDocuments);
router.post('/documents/chunked', addDocumentWithChunking); // Avec chunking + overlap
router.get('/documents', listDocuments);
router.get('/documents/:id', getDocument);
router.delete('/documents/:id', deleteDocument);

// Recherche sémantique
router.post('/documents/search', searchDocuments);

export default router;



