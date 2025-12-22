import type { IDocumentRepository } from '../../../domain/document/index.js';
import type { IMistralClient } from '../../ports/out/IMistralClient.js';

export interface DocumentServiceDependencies {
  repository: IDocumentRepository;
  mistralClient: IMistralClient;
}

