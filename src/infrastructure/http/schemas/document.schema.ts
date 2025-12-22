import { z } from 'zod';

export const AddDocumentSchema = z.object({
  content: z.string().min(1, 'Content is required').refine(
    (val) => val.trim().length > 0,
    'Content cannot be empty'
  ),
  title: z.string().optional(),
});

export const AddDocumentWithChunkingSchema = z.object({
  content: z.string().min(1, 'Content is required').refine(
    (val) => val.trim().length > 0,
    'Content cannot be empty'
  ),
  chunkSize: z.number().min(50, 'chunkSize must be >= 50').optional(),
  overlap: z.number().min(0, 'overlap must be >= 0').optional(),
}).refine(
  (data) => {
    if (data.chunkSize !== undefined && data.overlap !== undefined) {
      return data.overlap < data.chunkSize;
    }
    return true;
  },
  { message: 'overlap must be smaller than chunkSize', path: ['overlap'] }
);

export const ListDocumentsQuerySchema = z.object({
  limit: z.coerce.number().positive().optional(),
  offset: z.coerce.number().min(0).optional(),
});

export const DocumentIdParamSchema = z.object({
  id: z.coerce.number().positive('Invalid document ID'),
});

export const SearchDocumentsSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  limit: z.number().positive().optional(),
  maxDistance: z.number().min(0).max(2).optional(),
});

export type AddDocumentInput = z.infer<typeof AddDocumentSchema>;
export type AddDocumentWithChunkingInput = z.infer<typeof AddDocumentWithChunkingSchema>;
export type SearchDocumentsInput = z.infer<typeof SearchDocumentsSchema>;

