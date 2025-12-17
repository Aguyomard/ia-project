// Use Cases
export {
  AddDocumentUseCase,
  addDocumentUseCase,
  createAddDocumentUseCase,
} from './AddDocumentUseCase.js';

export {
  AddDocumentsUseCase,
  addDocumentsUseCase,
  createAddDocumentsUseCase,
} from './AddDocumentsUseCase.js';

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

// Types (re-exported from ports)
export type {
  AddDocumentInput,
  AddDocumentOutput,
  IAddDocumentUseCase,
  AddDocumentsInput,
  AddDocumentsOutput,
  IAddDocumentsUseCase,
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
} from '../../ports/in/document.js';
