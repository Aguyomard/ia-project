// Use Cases
export {
  AddDocumentUseCase,
  addDocumentUseCase,
  createAddDocumentUseCase,
} from './AddDocumentUseCase.js';

export {
  ListDocumentsUseCase,
  listDocumentsUseCase,
  createListDocumentsUseCase,
} from './ListDocumentsUseCase.js';

export {
  GetDocumentUseCase,
  getDocumentUseCase,
  createGetDocumentUseCase,
} from './GetDocumentUseCase.js';

export {
  DeleteDocumentUseCase,
  deleteDocumentUseCase,
  createDeleteDocumentUseCase,
} from './DeleteDocumentUseCase.js';

export {
  SearchDocumentsUseCase,
  searchDocumentsUseCase,
  createSearchDocumentsUseCase,
} from './SearchDocumentsUseCase.js';

export {
  AddDocumentWithChunkingUseCase,
  addDocumentWithChunkingUseCase,
  createAddDocumentWithChunkingUseCase,
} from './AddDocumentWithChunkingUseCase.js';

// Types (re-exported from ports)
export type {
  AddDocumentInput,
  AddDocumentOutput,
  IAddDocumentUseCase,
  ListDocumentsInput,
  ListDocumentsOutput,
  IListDocumentsUseCase,
  GetDocumentInput,
  GetDocumentOutput,
  IGetDocumentUseCase,
  DeleteDocumentInput,
  DeleteDocumentOutput,
  IDeleteDocumentUseCase,
  SearchDocumentsInput,
  SearchDocumentsOutput,
  ISearchDocumentsUseCase,
  ChunkInfo,
  AddDocumentWithChunkingInput,
  AddDocumentWithChunkingOutput,
  IAddDocumentWithChunkingUseCase,
} from '../../ports/in/document.js';
