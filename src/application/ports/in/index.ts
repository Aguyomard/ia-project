/**
 * Ports primaires (driving ports)
 * Interfaces exposées par la couche application
 */

// Conversation
export type {
  CreateConversationInput,
  CreateConversationOutput,
  ICreateConversationUseCase,
  SendMessageInput,
  SendMessageOutput,
  ISendMessageUseCase,
  StreamMessageInput,
  StreamMessageChunk,
  IStreamMessageUseCase,
} from './conversation.js';

// Document
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
} from './document.js';

// AI
export type {
  AIComparisonResponse,
  TestAIOutput,
  ITestAIUseCase,
} from './ai.js';

