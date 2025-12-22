# 📚 Révision - Intégration IA avec Node.js

> Récapitulatif technique de l'intégration de Mistral AI dans une application Node.js/Express avec Vue.js

---

## 📋 Table des matières

1. [Architecture globale](#1-architecture-globale)
2. [MistralService - Le cœur de l'IA](#2-mistralservice---le-cœur-de-lia)
3. [Robustesse - Retry avec Exponential Backoff](#3-robustesse---retry-avec-exponential-backoff)
4. [Gestion du Contexte - Sliding Window](#4-gestion-du-contexte---sliding-window)
5. [Streaming avec SSE](#5-streaming-avec-sse)
6. [Persistance avec Prisma](#6-persistance-avec-prisma)
7. [Embeddings et Recherche Vectorielle](#7-embeddings-et-recherche-vectorielle)
8. [RAG - Retrieval-Augmented Generation](#8-rag---retrieval-augmented-generation)
9. [Query Rewriting - Reformulation de requêtes](#9-query-rewriting---reformulation-de-requêtes)
10. [Hybrid Search - Recherche hybride](#10-hybrid-search---recherche-hybride)
11. [Architecture Clean Architecture](#11-architecture-clean-architecture)
12. [Frontend Vue.js](#12-frontend-vuejs)
13. [Concepts clés à retenir](#13-concepts-clés-à-retenir)

---

## 1. Architecture globale

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vue.js)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  ChatBot    │  │  Documents  │  │  Vue Router             │  │
│  │  View       │  │  View (RAG) │  │  /chat, /documents      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP / SSE
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  BACKEND (Clean Architecture)                    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 🔴 INFRASTRUCTURE                                         │   │
│  │  ├── http/ (Routes, Controllers)                         │   │
│  │  ├── persistence/ (Repositories Prisma)                  │   │
│  │  └── external/ (MistralClient)                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 🔵 APPLICATION                                            │   │
│  │  ├── usecases/ (StreamMessageUseCase, AddDocumentUseCase)│   │
│  │  ├── services/ (ConversationService, RAGService)         │   │
│  │  └── ports/ (Interfaces IMistralClient, IRAGService)     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 🟢 DOMAIN                                                 │   │
│  │  ├── entities/ (Conversation, Message, Document)         │   │
│  │  ├── valueObjects/ (MessageRole, Embedding, UUID)        │   │
│  │  └── repositories/ (Interfaces IConversationRepository)  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  MISTRAL AI API  │  │   POSTGRESQL     │  │ RERANK SERVICE   │
│  - Chat          │  │   - Prisma ORM   │  │ (Python/FastAPI) │
│  - Embeddings    │  │   - pgvector     │  │ - bge-reranker   │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## 2. MistralService - Le cœur de l'IA

### 2.1 Structure du service

```typescript
// src/services/mistral/MistralService.ts

export class MistralService {
  private readonly client: Mistral; // SDK Mistral
  private readonly defaultModel: string; // ex: 'mistral-tiny'
  private readonly defaultTemperature: number; // ex: 0.7
  private readonly retryOptions: RetryOptions; // Config retry

  constructor(config: MistralConfig = {}) {
    // Initialisation avec API key depuis env ou config
  }
}
```

### 2.2 Méthodes principales

| Méthode                             | Description           | Retour                  |
| ----------------------------------- | --------------------- | ----------------------- |
| `chat(message, options)`            | Message simple        | `Promise<string>`       |
| `chatJSON<T>(message, options)`     | Réponse JSON typée    | `Promise<T>`            |
| `complete(messages, options)`       | Conversation complète | `Promise<string>`       |
| `streamComplete(messages, options)` | Streaming             | `AsyncIterable<string>` |
| `streamChat(message, options)`      | Streaming simple      | `AsyncIterable<string>` |

### 2.3 Options disponibles

```typescript
interface ChatOptions {
  model?: string; // Modèle à utiliser
  systemPrompt?: string; // Prompt système
  temperature?: number; // Créativité (0-1)
  maxTokens?: number; // Limite de tokens en sortie
  jsonMode?: boolean; // Forcer réponse JSON
  autoTruncate?: boolean; // Sliding window auto
  reservedForResponse?: number; // Tokens réservés pour réponse
}
```

### 2.4 Pattern Singleton

```typescript
// Récupérer l'instance unique
const mistral = getMistralService();

// Reset pour les tests
resetMistralService();
```

**Pourquoi ?** Évite de créer plusieurs clients, partage la configuration.

---

## 3. Robustesse - Retry avec Exponential Backoff

### 3.1 Le problème

Les API d'IA sont **fragiles** :

- `429` Too Many Requests (rate limit)
- `500/502/503/504` Erreurs serveur
- `ECONNRESET` Connexion coupée

### 3.2 La solution : Exponential Backoff

```
Tentative 1 → Échec (429)
    ↓ Attendre 1s
Tentative 2 → Échec (503)
    ↓ Attendre 2s
Tentative 3 → Échec (500)
    ↓ Attendre 4s
Tentative 4 → Succès ✅
```

### 3.3 Implémentation

```typescript
// src/utils/retry.ts

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, multiplier = 2 } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= maxRetries || !shouldRetry(error)) {
        throw error;
      }
      const delay = baseDelay * Math.pow(multiplier, attempt);
      await sleep(delay);
    }
  }
}
```

### 3.4 Jitter (variation aléatoire)

```typescript
// Évite le "thundering herd" (tous les clients retentent en même temps)
const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
const finalDelay = exponentialDelay + jitter;
```

### 3.5 Configuration

| Paramètre    | Défaut  | Description              |
| ------------ | ------- | ------------------------ |
| `maxRetries` | 3       | Nombre max de tentatives |
| `baseDelay`  | 1000ms  | Délai initial            |
| `multiplier` | 2       | Facteur d'augmentation   |
| `maxDelay`   | 30000ms | Délai max (30s)          |

### 3.6 Erreurs retryables

```typescript
const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];
const RETRYABLE_NETWORK_ERRORS = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED'];
```

---

## 4. Gestion du Contexte - Sliding Window

### 4.1 Le problème

Chaque modèle a une **limite de contexte** :

| Modèle               | Limite         |
| -------------------- | -------------- |
| mistral-tiny         | 32 000 tokens  |
| mistral-large-latest | 128 000 tokens |
| GPT-4o               | 128 000 tokens |

Si dépassé → Erreur `400 Bad Request - Context Length Exceeded`

### 4.2 La solution : Sliding Window

```
AVANT (50 messages, ~35000 tokens)
[System] Tu es un assistant...
[User] Message 1
[Assistant] Réponse 1
[User] Message 2
...
[User] Message 50        ← Dépasse la limite !

APRÈS (sliding window)
[System] Tu es un assistant...  ← TOUJOURS gardé
[User] Message 35               ← Messages récents
[Assistant] Réponse 35
...
[User] Message 50               ← OK, ~28000 tokens
```

### 4.3 Estimation des tokens

```typescript
// Approximation : 1 token ≈ 3.5 caractères
export function estimateTokens(text: string): number {
  const charCount = text.length;
  const tokenEstimate = Math.ceil(charCount / 3.5);
  return tokenEstimate + 4; // +4 pour overhead
}
```

### 4.4 Algorithme

```typescript
export function applySlidingWindow(
  messages: ChatMessage[],
  config: SlidingWindowConfig
): ChatMessage[] {
  // 1. Séparer le system prompt
  // 2. Parcourir du plus récent au plus ancien
  // 3. Ajouter tant qu'on reste sous le budget
  // 4. Remettre le system prompt en premier
}
```

### 4.5 Règles

| Règle                  | Valeur | Raison                              |
| ---------------------- | ------ | ----------------------------------- |
| `preserveSystemPrompt` | true   | Le contexte de base est crucial     |
| `reservedForResponse`  | 1000   | Laisser de la place pour la réponse |
| `minMessages`          | 2      | Garder un minimum de contexte       |

### 4.6 Intégration automatique

```typescript
// Dans MistralService, c'est automatique !
public async complete(messages, options) {
  const { autoTruncate = true } = options;

  if (autoTruncate) {
    messages = applySlidingWindow(messages, {
      maxTokens: getModelContextLimit(model),
      reservedForResponse: 1000,
    });
  }
  // ...
}
```

---

## 5. Streaming avec SSE

### 5.1 Pourquoi le streaming ?

| Sans streaming                          | Avec streaming                         |
| --------------------------------------- | -------------------------------------- |
| Attendre 5-10s pour la réponse complète | Voir les mots apparaître en temps réel |
| UX frustrante                           | UX fluide comme ChatGPT                |

### 5.2 Server-Sent Events (SSE)

**Côté serveur :**

```typescript
// conversationController.ts
export async function chat(req: Request, res: Response) {
  // Headers SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Stream les chunks
  for await (const chunk of mistral.streamComplete(messages)) {
    res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
}
```

### 5.3 AsyncIterable dans MistralService

```typescript
public async *streamComplete(messages): AsyncIterable<string> {
  const stream = await this.client.chat.stream({ model, messages });

  for await (const event of stream) {
    const content = event.data.choices?.[0]?.delta?.content;
    if (content) {
      yield content;  // Retourne chaque morceau
    }
  }
}
```

### 5.4 Côté frontend (Vue.js)

```typescript
const response = await fetch('/api/chat/stream', { method: 'POST', body });
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.substring(6));
      if (data.chunk) {
        messageContent += data.chunk;
        // Mise à jour réactive de l'UI
      }
    }
  }
}
```

---

## 6. Persistance avec Prisma

### 6.1 Schéma

```prisma
// src/prisma/schema.prisma

model Conversation {
  id        String    @id @default(uuid())
  userId    String?
  title     String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  messages  Message[]
}

model Message {
  id             String       @id @default(uuid())
  conversationId String
  role           MessageRole  // user | assistant | system
  content        String
  createdAt      DateTime     @default(now())
  conversation   Conversation @relation(...)
}

enum MessageRole {
  user
  assistant
  system
}
```

### 6.2 ConversationService

```typescript
class ConversationService {
  // Créer une conversation
  async create(userId?: string): Promise<Conversation>;

  // Ajouter un message (avec transaction)
  async addMessage(conversationId, role, content): Promise<Message>;

  // Récupérer l'historique pour Mistral
  async getChatHistory(conversationId): Promise<ChatMessage[]>;
}
```

### 6.3 Transactions Prisma

```typescript
// Garantit l'atomicité (tout ou rien)
await this.prisma.$transaction([
  this.prisma.message.create({ data: messageData }),
  this.prisma.conversation.update({
    where: { id },
    data: { updatedAt: new Date() },
  }),
]);
```

### 6.4 Niveaux d'isolation

| Niveau          | Description                                         |
| --------------- | --------------------------------------------------- |
| ReadUncommitted | Peut lire des données non validées                  |
| ReadCommitted   | Ne lit que les données validées (défaut PostgreSQL) |
| RepeatableRead  | Lectures cohérentes dans la transaction             |
| Serializable    | Le plus strict                                      |

---

## 7. Embeddings et Recherche Vectorielle

### 7.1 Qu'est-ce qu'un Embedding ?

Un **embedding** est une représentation vectorielle d'un texte. Il transforme des mots/phrases en tableaux de nombres qui capturent le **sens sémantique**.

```
"Comment installer Docker ?"
        ↓ generateEmbedding()
[0.023, -0.156, 0.789, 0.034, ...] // 1024 nombres (dimension Mistral)
```

**Propriété clé** : Deux textes similaires en sens auront des vecteurs proches dans l'espace.

### 7.2 Génération d'embeddings avec Mistral

```typescript
// src/services/mistral/MistralService.ts

public async generateEmbedding(text: string): Promise<number[]> {
  const response = await this.client.embeddings.create({
    model: 'mistral-embed',
    inputs: [text],
  });
  return response.data[0].embedding; // number[1024]
}

// Version batch (plus efficace pour plusieurs textes)
public async generateEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await this.client.embeddings.create({
    model: 'mistral-embed',
    inputs: texts,
  });
  return response.data.map(item => item.embedding);
}
```

### 7.3 Stockage avec pgvector

**pgvector** est une extension PostgreSQL pour stocker et rechercher des vecteurs.

```sql
-- Activer l'extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Table de documents avec embeddings
CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT,
  embedding vector(1024)  -- Type vector de dimension 1024
);

-- Index pour accélérer les recherches (optionnel mais recommandé)
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### 7.4 Distance Cosinus

La **distance cosinus** mesure l'angle entre deux vecteurs :

| Distance  | Signification              |
| --------- | -------------------------- |
| 0         | Identiques                 |
| < 0.3     | Très similaires ✅         |
| 0.3 - 0.6 | Liés au sujet ⚠️           |
| > 0.6     | Pas vraiment pertinents ❌ |

```sql
-- Opérateur <=> pour la distance cosinus dans pgvector
SELECT content, embedding <=> '[0.1, 0.2, ...]'::vector AS distance
FROM documents
ORDER BY distance
LIMIT 5;
```

### 7.5 DocumentService

```typescript
// src/services/document/DocumentService.ts

export class DocumentService {
  // Ajouter un document (embedding généré automatiquement)
  async addDocument(input: { content: string }): Promise<Document> {
    const embedding = await mistral.generateEmbedding(input.content);
    const embeddingStr = `[${embedding.join(',')}]`;

    // Prisma ne supporte pas nativement pgvector → SQL brut
    return await this.prisma.$queryRawUnsafe(
      `INSERT INTO documents (content, embedding)
       VALUES ($1, $2::vector)
       RETURNING id, content`,
      input.content,
      embeddingStr
    );
  }

  // Recherche sémantique
  async searchSimilar(query: string, limit = 5): Promise<SearchResult[]> {
    const queryEmbedding = await mistral.generateEmbedding(query);
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    return await this.prisma.$queryRawUnsafe(
      `SELECT id, content, embedding <=> $1::vector AS distance
       FROM documents
       ORDER BY distance
       LIMIT $2`,
      embeddingStr,
      limit
    );
  }
}
```

### 7.6 Pourquoi $queryRawUnsafe ?

Prisma ne supporte pas nativement le type `vector` de pgvector. On utilise donc :

| Méthode                           | Sécurité     | Usage                                   |
| --------------------------------- | ------------ | --------------------------------------- |
| `prisma.model.create()`           | ✅ Sûr       | Types standards (Conversation, Message) |
| `$queryRaw` template              | ✅ Sûr       | SQL paramétré mais limité               |
| `$queryRawUnsafe` + `$1, $2`      | ✅ Sûr       | SQL avec types custom (vector)          |
| `$queryRawUnsafe` + concaténation | ❌ Dangereux | JAMAIS faire ça !                       |

**Important** : On utilise des paramètres positionnels (`$1`, `$2`) qui sont échappés par PostgreSQL, donc c'est sécurisé.

### 7.7 Algorithmes de recherche vectorielle

| Algorithme  | Type  | Vitesse        | Précision | Usage           |
| ----------- | ----- | -------------- | --------- | --------------- |
| Force brute | Exact | 🐢 Lent        | 100%      | Petits datasets |
| **IVFFlat** | ANN   | 🐇 Rapide      | ~95%      | Bon compromis   |
| **HNSW**    | ANN   | 🚀 Très rapide | ~98%      | Production      |

**ANN** = Approximate Nearest Neighbor (sacrifice un peu de précision pour la vitesse)

---

## 8. RAG - Retrieval-Augmented Generation

### 8.1 Concept

Le **RAG** permet à un LLM de répondre avec des **connaissances externes** (documents privés, FAQ, etc.) sans fine-tuning.

```
Question utilisateur
        ↓
1. Générer l'embedding de la question
        ↓
2. Chercher les documents similaires en base
        ↓
3. Construire un prompt avec le contexte trouvé
        ↓
4. Envoyer au LLM
        ↓
Réponse enrichie par les documents
```

### 8.2 Avantages du RAG

| Avantage                         | Description                                |
| -------------------------------- | ------------------------------------------ |
| **Données privées**              | Le LLM peut répondre sur vos docs internes |
| **Réduction des hallucinations** | Réponses basées sur des faits              |
| **Pas de fine-tuning**           | Moins coûteux, plus simple                 |
| **Mise à jour facile**           | Ajouter/retirer des docs à chaud           |

### 8.3 Implémentation

```typescript
// Exemple de flux RAG complet

async function chatWithRAG(userQuestion: string, conversationId: string) {
  const docs = getDocumentService();
  const mistral = getMistralService();
  const conversations = getConversationService();

  // 1. Chercher les documents pertinents
  const relevantDocs = await docs.searchSimilar(userQuestion, { limit: 3 });

  // 2. Construire le contexte
  const context = relevantDocs.map((doc) => doc.content).join('\n\n---\n\n');

  // 3. Créer le prompt enrichi
  const systemPrompt = `Tu es un assistant. Réponds en te basant sur ces documents :

${context}

Si l'information n'est pas dans les documents, dis-le clairement.`;

  // 4. Récupérer l'historique et ajouter le system prompt
  const history = await conversations.getChatHistory(conversationId);
  history[0] = { role: 'system', content: systemPrompt };

  // 5. Obtenir la réponse
  return await mistral.complete(history);
}
```

### 8.4 Chunking (Découpage)

Pour les longs documents, on les découpe en **chunks** avant de générer les embeddings.

**Pourquoi ?** Un seul vecteur pour un long document "dilue" le sens. Des chunks permettent une recherche plus précise.

### 8.5 Stratégies de chunking

| Stratégie           | Description                | Usage                        |
| ------------------- | -------------------------- | ---------------------------- |
| **Fixed size**      | 500 caractères             | Simple, rapide               |
| **Sentence-based**  | Par phrases                | Préserve le sens             |
| **Paragraph-based** | Par paragraphes            | Documents structurés         |
| **Overlap**         | Chevauchement entre chunks | Évite de couper des idées ✅ |
| **Semantic**        | Par similarité sémantique  | Le plus précis, mais coûteux |

### 8.6 Chunking avec Overlap (Implémenté)

Le **chevauchement (overlap)** est crucial : il permet de préserver le contexte entre les chunks.

```
Document : |-------- 1200 caractères --------|

Sans overlap :
  Chunk 1: |--- 500 ---|
  Chunk 2:             |--- 500 ---|   ← Coupure nette, perte de contexte !
  Chunk 3:                         |--- 200 ---|

Avec overlap (100 chars) :
  Chunk 1: |--- 500 ---|
  Chunk 2:        |--- 500 ---|   ← Les 100 derniers chars de Chunk 1
                                     sont les 100 premiers de Chunk 2
  Chunk 3:              |--- 500 ---|
```

**Notre implémentation** :

```typescript
// src/application/services/chunking/ChunkingService.ts

export class ChunkingService {
  /**
   * Découpe un texte en chunks avec chevauchement
   *
   * @param text - Le texte à découper
   * @param options.chunkSize - Taille max d'un chunk (défaut: 500)
   * @param options.overlap - Chevauchement entre chunks (défaut: 100)
   * @param options.separators - Séparateurs pour couper proprement
   */
  chunkText(text: string, options: ChunkingOptions = {}): ChunkingResult {
    const {
      chunkSize = 500,
      overlap = 100,
      separators = ['\n\n', '\n', '. ', ' '],
    } = options;

    // Validation : l'overlap doit être < chunkSize
    if (overlap >= chunkSize) {
      throw new Error('Overlap must be smaller than chunkSize');
    }

    const chunks: Chunk[] = [];
    let currentPosition = 0;

    while (currentPosition < text.length) {
      // 1. Définir la fin potentielle du chunk
      let endPosition = Math.min(currentPosition + chunkSize, text.length);

      // 2. Chercher un bon point de coupure (séparateur)
      if (endPosition < text.length) {
        const chunkContent = text.slice(currentPosition, endPosition);
        const splitPoint = this.findBestSplitPoint(chunkContent, separators);
        if (splitPoint > chunkSize / 2) {
          endPosition = currentPosition + splitPoint;
        }
      }

      // 3. Extraire et sauvegarder le chunk
      chunks.push({
        content: text.slice(currentPosition, endPosition).trim(),
        index: chunks.length,
        startOffset: currentPosition,
        endOffset: endPosition,
      });

      // 4. Avancer avec overlap : step = chunkSize - overlap
      currentPosition += chunkSize - overlap;
    }

    return { chunks, totalChunks: chunks.length, originalLength: text.length };
  }

  private findBestSplitPoint(text: string, separators: string[]): number {
    // Cherche le dernier séparateur de haute priorité
    for (const separator of separators) {
      const lastIndex = text.lastIndexOf(separator);
      if (lastIndex !== -1) return lastIndex + separator.length;
    }
    return -1;
  }
}
```

**Endpoint API** :

```bash
# POST /api/documents/chunked
curl -X POST http://localhost:3000/api/documents/chunked \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Très long document de 5000 mots...",
    "chunkSize": 500,
    "overlap": 100
  }'

# Réponse :
{
  "message": "Document split into 12 chunks",
  "sourceId": 27,                          # ID du document source (original)
  "totalChunks": 12,
  "originalLength": 5000,
  "documents": [
    { "id": 28, "sourceId": 27, "chunkIndex": 0, "contentPreview": "..." },
    { "id": 29, "sourceId": 27, "chunkIndex": 1, "contentPreview": "..." },
    ...
  ],
  "chunks": [...]
}
```

**Tracking des chunks en base de données** :

```sql
-- Structure de la table documents avec tracking
SELECT id, LEFT(content, 30), source_id, chunk_index, embedding IS NOT NULL
FROM documents WHERE id >= 27;

 id |           left           | source_id | chunk_index | has_embedding
----+--------------------------+-----------+-------------+---------------
 27 | Le machine learning est  |     NULL  |        NULL | false  -- Document source
 28 | Le machine learning est  |        27 |           0 | true   -- Chunk 0
 29 | Les algorithmes de ML... |        27 |           1 | true   -- Chunk 1
 30 | Le deep learning est...  |        27 |           2 | true   -- Chunk 2
```

**Suppression en cascade** : Supprimer le document source (id=27) supprime automatiquement tous ses chunks grâce à `ON DELETE CASCADE`.

```bash
curl -X DELETE http://localhost:3000/api/documents/27
# → Les documents 28, 29, 30 sont automatiquement supprimés
```

**Calcul du step** :

```
step = chunkSize - overlap = 500 - 100 = 400

Document de 1200 caractères :
  Chunk 1 : position 0 → 500 (500 chars)
  Chunk 2 : position 400 → 900 (500 chars)
  Chunk 3 : position 800 → 1200 (400 chars)

Estimation : ceil((1200 - 100) / 400) = ceil(2.75) = 3 chunks
```

**Avantages de l'overlap** :

| Avantage                     | Explication                                                |
| ---------------------------- | ---------------------------------------------------------- |
| **Préservation du contexte** | Une phrase coupée en deux sera complète dans un des chunks |
| **Meilleure recherche**      | Plus de chances de retrouver l'info pertinente             |
| **Cohérence sémantique**     | Les embeddings captent mieux le sens                       |
| **Coût minimal**             | ~20% de tokens en plus, mais qualité bien meilleure        |

### 8.7 Modèles d'embedding

| Modèle                   | Fournisseur | Dimension | Coût             |
| ------------------------ | ----------- | --------- | ---------------- |
| `mistral-embed`          | Mistral     | 1024      | ~0.1€/1M tokens  |
| `text-embedding-3-small` | OpenAI      | 1536      | ~0.02$/1M tokens |
| `text-embedding-3-large` | OpenAI      | 3072      | ~0.13$/1M tokens |
| `all-MiniLM-L6-v2`       | Open source | 384       | Gratuit (local)  |
| `nomic-embed-text`       | Open source | 768       | Gratuit (local)  |

### 8.8 Le System Prompt est réécrit à chaque message

**Point clé** : Le system prompt n'est pas statique. Il est **enrichi dynamiquement** à chaque nouveau message avec les documents pertinents pour cette question spécifique.

```typescript
// À CHAQUE message de l'utilisateur :

// 1. Récupérer l'historique (avec le system prompt original)
const chatHistory = await conversationService.getChatHistory(conversationId);
// chatHistory[0] = { role: 'system', content: 'Tu es un assistant...' }

// 2. Construire un NOUVEAU system prompt basé sur la question
const ragContext = await ragService.buildEnrichedPrompt(message);
// ragContext.enrichedPrompt = 'Tu es un assistant... [Document 1] WiFi = Secret123...'

// 3. REMPLACER le system prompt original
chatHistory[0].content = ragContext.enrichedPrompt;

// 4. Envoyer à Mistral avec le nouveau contexte
mistralClient.streamComplete(chatHistory);
```

**Pourquoi ?** Chaque question peut nécessiter des documents différents :

```
Message 1 : "Salut !"
  → RAG cherche docs pour "Salut" → Rien de pertinent
  → System prompt = basique

Message 2 : "C'est quoi le WiFi ?"
  → RAG cherche docs pour "WiFi" → Trouve le doc WiFi !
  → System prompt = enrichi avec infos WiFi

Message 3 : "Et les horaires ?"
  → RAG cherche docs pour "horaires" → Trouve le doc horaires !
  → System prompt = enrichi avec infos horaires (différent !)
```

**Note** : L'enrichissement est fait **à la volée**. Le system prompt original en base de données n'est jamais modifié.

### 8.9 Exemple complet de requête Mistral avec RAG

Voici exactement ce qui est envoyé à l'API Mistral quand le RAG trouve un document :

**Scénario** : L'utilisateur demande "C'est quoi le mot de passe WiFi ?" et un document existe en base avec cette info.

```json
{
  "model": "mistral-tiny",
  "temperature": 0.7,
  "stream": true,
  "messages": [
    {
      "role": "system",
      "content": "Tu es un assistant IA amical et serviable. Tu réponds en français de manière concise et utile.\n\nTu as accès aux documents suivants pour t'aider à répondre :\n\n[Document 1]\nLe mot de passe WiFi du bureau est SuperSecret123. Le réseau s'appelle BureauNet.\n\nInstructions :\n- Utilise ces documents pour répondre si pertinent\n- Si l'information n'est pas dans les documents, utilise tes connaissances générales\n- Ne mentionne pas explicitement \"selon les documents\" sauf si l'utilisateur le demande"
    },
    {
      "role": "user",
      "content": "Salut !"
    },
    {
      "role": "assistant",
      "content": "Bonjour ! Comment puis-je t'aider ?"
    },
    {
      "role": "user",
      "content": "C'est quoi le mot de passe WiFi ?"
    }
  ]
}
```

**Points importants** :

- Le contenu du document est **littéralement copié** dans le system prompt
- L'**historique complet** de conversation est envoyé
- Le RAG est basé sur la **dernière question** uniquement
- Mistral "voit" les documents comme du texte normal dans le system prompt

**Réponse de Mistral** :

```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Le mot de passe WiFi est SuperSecret123 et le réseau s'appelle BureauNet."
      }
    }
  ]
}
```

### 8.9 Coût du RAG

Le RAG consomme des tokens supplémentaires car les documents sont envoyés à chaque requête :

| Composant                   | Tokens (exemple) |
| --------------------------- | ---------------- |
| System prompt de base       | ~50              |
| Documents injectés (3 docs) | ~300-500         |
| Historique conversation     | ~200             |
| Question utilisateur        | ~20              |
| **Total entrée**            | **~600-800**     |
| Réponse                     | ~100             |

**Coût approximatif** : ~0.001€ par message avec RAG (mistral-tiny)

### 8.10 Reranking - Améliorer la précision des résultats

#### 8.10.1 Le problème avec la recherche vectorielle seule

La recherche vectorielle (embedding + distance cosinus) est **rapide et scalable**, mais elle a des limites :

| Aspect        | Recherche vectorielle   | Limitation                |
| ------------- | ----------------------- | ------------------------- |
| **Méthode**   | Compare les embeddings  | Approximation du sens     |
| **Vitesse**   | ~10ms pour 10K docs     | ✅ Rapide                 |
| **Précision** | ~80-90%                 | ⚠️ Peut rater des nuances |
| **Contexte**  | Encode texte séparément | ❌ Pas de cross-attention |

**Exemple du problème** :

```
Question : "mot de passe WiFi"
Document 1 : "Le WiFi du bureau est BureauNet" → Distance 0.3 ✅
Document 2 : "Le mot de passe WiFi est Secret123" → Distance 0.35 ⚠️

La recherche vectorielle peut mal classer ces documents car les embeddings
sont générés SÉPARÉMENT pour la question et chaque document.
```

#### 8.10.2 La solution : Cross-Encoder Reranking

Un **Cross-Encoder** analyse la question ET le document **ensemble**, ce qui permet de capturer les relations fines entre eux.

```
Recherche vectorielle (rapide, large net)
            ↓
      10 candidats
            ↓
Cross-Encoder (précis, analyse paire par paire)
            ↓
      Top 3 rerankés
            ↓
    Contexte pour le LLM
```

**Différence fondamentale** :

| Bi-Encoder (Embeddings)     | Cross-Encoder (Reranking) |
| --------------------------- | ------------------------- |
| Encode Q et D séparément    | Encode (Q, D) ensemble    |
| `embed(Q)` ↔ `embed(D)`    | `score(Q, D)`             |
| Rapide (~1ms par doc)       | Lent (~50ms par paire)    |
| Scalable (millions de docs) | Top-K seulement           |
| Précision ~85%              | Précision ~95%+           |

#### 8.10.3 Choix technique : bge-reranker-base

Nous avons choisi le modèle **BAAI/bge-reranker-base** :

| Critère         | bge-reranker-base   | Alternatives      |
| --------------- | ------------------- | ----------------- |
| **Taille**      | 278 MB              | large: 560 MB     |
| **Précision**   | ⭐⭐⭐⭐ Très bonne | large: ⭐⭐⭐⭐⭐ |
| **Vitesse**     | ~50ms / 10 docs     | large: ~100ms     |
| **Licence**     | MIT (libre)         | ✅                |
| **Multilingue** | Français ✅         | ✅                |

**Pourquoi pas un modèle plus gros ?**

- Le gain de précision entre `base` et `large` est marginal (~2-3%)
- La latence double
- Pour notre cas d'usage (FAQ interne), `base` est suffisant

**Alternatives considérées** :

| Option                | Avantage                      | Inconvénient               | Choix     |
| --------------------- | ----------------------------- | -------------------------- | --------- |
| **bge-reranker**      | Open source, local            | Nécessite Python           | ✅ Choisi |
| **Cohere Rerank API** | Très précis                   | Payant, dépendance externe | ❌        |
| **LLM Reranking**     | Utilise Mistral déjà en place | Lent, coûteux en tokens    | ❌        |
| **ms-marco-MiniLM**   | Léger (66MB)                  | Moins précis, anglais      | ❌        |

#### 8.10.4 Architecture du service de reranking

Nous avons créé un **microservice Python séparé** plutôt que d'intégrer le modèle dans Node.js :

```
┌─────────────────────────────────────────────────────────────────┐
│                        Node.js (App principale)                  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ RAGService                                                │   │
│  │   1. searchByQuery() → 10 candidats (pgvector)           │   │
│  │   2. rerankClient.rerank() → appel HTTP                  │   │
│  │   3. Top 3 rerankés → contexte enrichi                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP POST /rerank
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Python (Rerank Service)                       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ FastAPI + CrossEncoder                                    │   │
│  │   - Modèle chargé en mémoire au démarrage                │   │
│  │   - POST /rerank : score chaque paire (query, doc)       │   │
│  │   - Retourne les docs triés par score                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Modèle : BAAI/bge-reranker-base (~278 MB en RAM)              │
└─────────────────────────────────────────────────────────────────┘
```

**Pourquoi un service Python séparé ?**

| Raison                  | Explication                                     |
| ----------------------- | ----------------------------------------------- |
| **Écosystème ML**       | PyTorch, Transformers sont natifs Python        |
| **Isolation**           | Le modèle ne bloque pas l'event loop Node.js    |
| **Scaling indépendant** | On peut scaler le reranker séparément           |
| **Fallback gracieux**   | Si le service tombe, on continue sans reranking |

#### 8.10.5 Implémentation détaillée

**Service Python (FastAPI)** :

```python
# rerank-service/main.py

from sentence_transformers import CrossEncoder
from fastapi import FastAPI
from pydantic import BaseModel

# Chargement du modèle au démarrage (une seule fois)
model = CrossEncoder('BAAI/bge-reranker-base', max_length=512)

class RerankRequest(BaseModel):
    query: str
    documents: list[dict]  # [{id, content}, ...]
    top_k: int = 3

@app.post("/rerank")
async def rerank(request: RerankRequest):
    # 1. Créer les paires (query, document)
    pairs = [(request.query, doc["content"]) for doc in request.documents]

    # 2. Scorer chaque paire avec le cross-encoder
    scores = model.predict(pairs)  # Retourne un score pour chaque paire

    # 3. Trier par score décroissant et prendre le top_k
    results = sorted(zip(request.documents, scores),
                     key=lambda x: x[1], reverse=True)

    return {"results": results[:request.top_k]}
```

**Client TypeScript** :

```typescript
// src/infrastructure/external/rerank/RerankClient.ts

export class RerankClient implements IRerankClient {
  private readonly serviceUrl: string;
  private available: boolean | null = null; // Cache de disponibilité

  constructor() {
    this.serviceUrl = process.env.RERANK_SERVICE_URL!;
  }

  async isAvailable(): Promise<boolean> {
    // Cache le résultat pour éviter des appels répétés
    if (this.available !== null) return this.available;

    try {
      const res = await fetch(`${this.serviceUrl}/health`);
      this.available = res.ok;
    } catch {
      this.available = false;
    }
    return this.available;
  }

  async rerank(
    query: string,
    documents: RerankDocument[],
    topK: number
  ): Promise<RerankResult[]> {
    const response = await fetch(`${this.serviceUrl}/rerank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, documents, top_k: topK }),
    });

    const data = await response.json();
    return data.results;
  }
}
```

**Intégration dans RAGService** :

```typescript
// src/application/services/rag/RAGService.ts

async buildEnrichedPrompt(userMessage: string): Promise<RAGContext> {
  // 1. Recherche vectorielle large (10 candidats)
  const candidates = await documentService.searchByQuery(userMessage, {
    limit: this.config.rerankCandidates,  // 10
    maxDistance: this.config.maxDistance,
  });

  // 2. Reranking si disponible
  let finalChunks: ChunkWithDistance[];

  if (this.config.useReranking && isRerankConfigured()) {
    const reranked = await this.rerankChunks(userMessage, candidates);
    finalChunks = reranked.chunks;  // Top 3 après reranking
  } else {
    // Fallback : prendre les premiers résultats vectoriels
    finalChunks = candidates.slice(0, this.config.maxDocuments);
  }

  // 3. Construire le contexte avec les documents rerankés
  return this.buildContext(finalChunks);
}

private async rerankChunks(query: string, chunks: ChunkWithDistance[]) {
  const rerankClient = getRerankClient();

  // Vérifier la disponibilité (avec cache)
  if (!await rerankClient.isAvailable()) {
    console.warn('⚠️ Rerank service not available, using vector search only');
    return this.fallbackToVectorSearch(chunks);
  }

  // Préparer les documents pour le reranking
  const documents = chunks.map(c => ({ id: c.id, content: c.content }));

  // Appeler le service
  const results = await rerankClient.rerank(query, documents, this.config.maxDocuments);

  // Mapper les résultats aux chunks originaux
  return this.mapRerankResults(results, chunks);
}
```

#### 8.10.6 Configuration

```typescript
// src/application/services/rag/types.ts

export interface RAGConfig {
  maxDocuments: number; // Nombre final de docs (défaut: 3)
  maxDistance: number; // Distance max pour recherche vectorielle (défaut: 0.8)
  useReranking: boolean; // Activer le reranking (défaut: true)
  rerankCandidates: number; // Candidats avant reranking (défaut: 10)
}

export const DEFAULT_RAG_CONFIG: RAGConfig = {
  maxDocuments: 3,
  maxDistance: 0.8,
  useReranking: true,
  rerankCandidates: 10,
};
```

**Variables d'environnement** :

```bash
# docker-compose.yml
RERANK_SERVICE_URL=http://rerank:8001
```

#### 8.10.7 Fallback gracieux

Le système est conçu pour **continuer à fonctionner** même si le service de reranking est indisponible :

```
                    Service Rerank
                         │
            ┌────────────┴────────────┐
            │                         │
        Disponible ✅            Indisponible ❌
            │                         │
     Cross-encoder            Fallback vectoriel
     reranking                (top 3 par distance)
            │                         │
            └────────────┬────────────┘
                         │
                  Contexte enrichi
                         │
                      Mistral
```

**Comportement en cas d'erreur** :

| Situation           | Comportement       | Log                               |
| ------------------- | ------------------ | --------------------------------- |
| Service non démarré | Fallback vectoriel | `⚠️ Rerank service not available` |
| Timeout             | Fallback vectoriel | `Rerank service timeout`          |
| Erreur 500          | Fallback vectoriel | `Reranking failed, falling back`  |
| Service OK          | Reranking normal   | `🔄 Reranked 10 → 3 chunks`       |

#### 8.10.8 Scores et similarité

Le cross-encoder retourne des **scores bruts** (logits) qu'on convertit en pourcentage :

```typescript
// Score cross-encoder : entre -10 et +10 typiquement
// On applique une sigmoid pour normaliser en 0-100%

function rerankScoreToSimilarity(score: number): number {
  const normalized = 1 / (1 + Math.exp(-score)); // Sigmoid
  return Math.round(normalized * 100);
}

// Exemples :
// score = 5.0  → 99%  (très pertinent)
// score = 0.0  → 50%  (neutre)
// score = -5.0 → 1%   (pas pertinent)
```

**Différence avec la distance cosinus** :

| Métrique         | Interprétation             | Origine          |
| ---------------- | -------------------------- | ---------------- |
| Distance cosinus | 0 = identique, 2 = opposé  | Embeddings       |
| Score reranking  | Plus haut = plus pertinent | Cross-encoder    |
| Similarité %     | Plus haut = plus pertinent | Notre conversion |

#### 8.10.9 Performance et latence

| Étape                           | Latence typique | Impact       |
| ------------------------------- | --------------- | ------------ |
| Recherche vectorielle (10 docs) | ~10-50ms        | Minimal      |
| Appel HTTP au service rerank    | ~5ms            | Réseau local |
| Cross-encoder (10 paires)       | ~50-100ms       | Principal    |
| **Total avec reranking**        | **~70-150ms**   | Acceptable   |
| Sans reranking                  | ~15-50ms        | Plus rapide  |

**Optimisations possibles** :

1. **Batching** : Grouper plusieurs requêtes de reranking
2. **GPU** : Utiliser CUDA pour accélérer le modèle
3. **Modèle plus léger** : `bge-reranker-small` si latence critique
4. **Cache** : Mettre en cache les résultats de reranking

#### 8.10.11 Docker et déploiement

```yaml
# docker-compose.yml

services:
  rerank:
    image: ia-project-rerank:latest
    build:
      context: ./rerank-service
      dockerfile: Dockerfile
    ports:
      - '8001:8001'
    environment:
      - RERANK_MODEL=BAAI/bge-reranker-base
      - DEFAULT_TOP_K=3
    volumes:
      - rerank_cache:/root/.cache # Cache du modèle HuggingFace
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:8001/health']
      interval: 30s
      start_period: 60s # Temps pour charger le modèle
```

**Commandes utiles** :

```bash
# Construire l'image (télécharge le modèle)
docker build --network=host -t ia-project-rerank ./rerank-service

# Démarrer le service
docker compose up -d rerank

# Vérifier la santé
curl http://localhost:8001/health
# {"status":"healthy","model":"BAAI/bge-reranker-base","model_loaded":true}

# Tester le reranking
curl -X POST http://localhost:8001/rerank \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mot de passe wifi",
    "documents": [
      {"id": 1, "content": "Les horaires sont 8h-20h"},
      {"id": 2, "content": "Le mot de passe WiFi est Secret123"}
    ],
    "top_k": 2
  }'
# {"results":[{"id":2,"score":0.99,...},{"id":1,"score":0.01,...}]}
```

#### 8.10.12 Points clés à retenir

| Concept                         | Explication                                  |
| ------------------------------- | -------------------------------------------- |
| **Bi-Encoder vs Cross-Encoder** | Embeddings séparés vs analyse conjointe      |
| **Two-stage retrieval**         | Recherche large puis reranking précis        |
| **Fallback gracieux**           | Le système fonctionne sans reranking         |
| **Microservice**                | Isolation du modèle ML dans un service dédié |
| **Score → Similarité**          | Sigmoid pour normaliser les logits           |
| **Cache de disponibilité**      | Évite les appels répétés à /health           |

---

## 9. Query Rewriting - Reformulation de requêtes

### 9.1 Le problème

Les utilisateurs formulent souvent leurs questions de manière **imprécise** :

| Problème             | Exemple                | Impact sur la recherche    |
| -------------------- | ---------------------- | -------------------------- |
| **Abréviations**     | "mdp wifi ?"           | Embedding ≠ "mot de passe" |
| **Questions vagues** | "ça marche comment ?"  | Pas de contexte            |
| **Pronoms**          | "c'est quoi le prix ?" | Référence ambiguë          |
| **Fautes/typos**     | "commnet installer"    | Embedding dégradé          |

### 9.2 La solution : Query Rewriting

Le **Query Rewriting** utilise le LLM pour reformuler la requête **avant** la recherche vectorielle :

```
User: "mdp wifi ?"
        │
        ▼ [Query Rewriting - Mistral]
"Quel est le mot de passe du réseau WiFi ?"
        │
        ▼ [Embedding + Recherche]
Documents pertinents trouvés ✅
```

### 9.3 Implémentation

**Interface (Port)** :

```typescript
// src/application/ports/out/IQueryRewriterService.ts

export interface QueryRewriteResult {
  originalQuery: string;
  rewrittenQuery: string;
  wasRewritten: boolean;
}

export interface IQueryRewriterService {
  rewrite(
    query: string,
    conversationContext?: string[]
  ): Promise<QueryRewriteResult>;
}
```

**Service** :

```typescript
// src/application/services/queryRewriter/QueryRewriterService.ts

const REWRITE_SYSTEM_PROMPT = `Tu es un expert en reformulation de requêtes...

RÈGLES:
- Développe les abréviations (mdp → mot de passe, wifi → réseau WiFi...)
- Reformule les questions vagues en questions précises
- Si la question fait référence au contexte (ça, il, elle), inclus explicitement le sujet
- Garde la requête concise (max 30 mots)
- Réponds UNIQUEMENT avec la question reformulée`;

export class QueryRewriterService implements IQueryRewriterService {
  async rewrite(
    query: string,
    conversationContext: string[] = []
  ): Promise<QueryRewriteResult> {
    // Skip si query trop courte
    if (query.trim().length < 2) {
      return {
        originalQuery: query,
        rewrittenQuery: query,
        wasRewritten: false,
      };
    }

    try {
      const userPrompt = this.buildUserPrompt(query, conversationContext);

      const rewrittenQuery = await this.mistralClient.complete(
        [
          { role: 'system', content: REWRITE_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        { temperature: 0.1, maxTokens: 100 }
      );

      console.log(`✏️ Query rewrite: "${query}" → "${rewrittenQuery}"`);

      return {
        originalQuery: query,
        rewrittenQuery: rewrittenQuery.trim(),
        wasRewritten: true,
      };
    } catch (error) {
      // Fallback : utiliser la query originale
      return {
        originalQuery: query,
        rewrittenQuery: query,
        wasRewritten: false,
      };
    }
  }

  private buildUserPrompt(query: string, context: string[]): string {
    if (context.length > 0) {
      return `CONTEXTE CONVERSATIONNEL:
${context
  .slice(-3)
  .map((msg, i) => `${i + 1}. ${msg}`)
  .join('\n')}

QUESTION À REFORMULER:
${query}`;
    }
    return `QUESTION À REFORMULER:\n${query}`;
  }
}
```

### 9.4 Intégration dans le RAG

```typescript
// src/application/services/rag/RAGService.ts

async buildEnrichedPrompt(
  userMessage: string,
  options: RAGOptions = {}
): Promise<RAGContext> {
  // Étape 0: Query Rewriting (si activé)
  const shouldRewrite = options.useQueryRewrite ?? true;
  let searchQuery = userMessage;

  if (shouldRewrite) {
    const queryRewriter = getQueryRewriterService();
    const rewriteResult = await queryRewriter.rewrite(
      userMessage,
      options.conversationHistory ?? []
    );
    searchQuery = rewriteResult.rewrittenQuery;
  }

  // Étape 1: Recherche avec la query réécrite
  const candidates = await documentService.searchByQuery(searchQuery, {
    limit: searchLimit,
    maxDistance: this.config.maxDistance,
  });

  // ... reste du pipeline (reranking, enrichissement)
}
```

### 9.5 Utilisation du contexte conversationnel

Le Query Rewriter reçoit les **derniers messages utilisateur** pour résoudre les références :

```
Conversation :
  User: "Comment se connecter au WiFi ?"
  Assistant: "Allez dans Paramètres > WiFi > BureauNet"
  User: "c'est quoi le mdp ?"  ← Référence implicite au WiFi

Query Rewriting avec contexte :
  "c'est quoi le mdp ?" → "Quel est le mot de passe du réseau WiFi BureauNet ?"
```

### 9.6 Configuration

```typescript
// src/application/services/queryRewriter/types.ts

export interface QueryRewriterConfig {
  enabled: boolean; // Activer/désactiver
  minQueryLength: number; // Longueur min pour rewriting (défaut: 2)
  maxContextMessages: number; // Nb messages de contexte (défaut: 3)
}

export const DEFAULT_QUERY_REWRITER_CONFIG: QueryRewriterConfig = {
  enabled: true,
  minQueryLength: 2,
  maxContextMessages: 3,
};
```

### 9.7 Toggle Frontend

L'interface de chat propose un toggle ✏️ **Rewrite** :

```
┌─────────────────────────────────────────────┐
│  ☑ 📚 RAG    ☑ ✏️ Rewrite    ☑ 🔄 Rerank   │
│  ┌───────────────────────────────────────┐ │
│  │ Écris ton message...                  │ │
│  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### 9.8 Performance et coût

| Aspect        | Impact                                |
| ------------- | ------------------------------------- |
| **Latence**   | +200-400ms (appel LLM)                |
| **Coût**      | ~0.0001€ par requête (mistral-small)  |
| **Précision** | +15-30% de recall sur queries courtes |

**Quand désactiver ?**

- Queries déjà bien formulées
- Latence critique
- Coût à minimiser

### 9.9 Exemples de reformulation

| Original       | Reformulé                                         |
| -------------- | ------------------------------------------------- |
| "mdp"          | "Quel est le mot de passe ?"                      |
| "wifi ?"       | "Comment se connecter au réseau WiFi ?"           |
| "horaires"     | "Quels sont les horaires d'ouverture ?"           |
| "c koi docker" | "Qu'est-ce que Docker et comment ça fonctionne ?" |
| "et le prix ?" | "Quel est le prix de [sujet précédent] ?"         |

---

## 10. Hybrid Search - Recherche hybride

### 10.1 Le problème avec la recherche vectorielle seule

La recherche vectorielle (embeddings + distance cosinus) est excellente pour trouver des documents **sémantiquement similaires**, mais elle a des limites :

| Type de requête    | Exemple                       | Recherche vectorielle |
| ------------------ | ----------------------------- | --------------------- |
| **Concepts**       | "Comment fonctionne Docker ?" | ✅ Excellent          |
| **Synonymes**      | "conteneurs" vs "containers"  | ✅ Bon                |
| **Codes produits** | "XR-7500"                     | ❌ Peut rater         |
| **Noms propres**   | "Jean Dupont"                 | ❌ Peut rater         |
| **Acronymes**      | "FAQ", "API"                  | ⚠️ Variable           |
| **Mots exacts**    | "erreur 404"                  | ⚠️ Variable           |

**Pourquoi ?** Les embeddings capturent le **sens**, pas les **mots exacts**. Un code produit "XR-7500" n'a pas de sens sémantique intrinsèque.

### 10.2 La solution : combiner Vector + Keyword

Le **Hybrid Search** combine deux méthodes de recherche :

```
                    ┌─────────────────────┐
                    │      Query          │
                    │  "mot de passe XR"  │
                    └─────────┬───────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
    ┌─────────────────┐             ┌─────────────────┐
    │ Vector Search   │             │ Keyword Search  │
    │ (Embeddings)    │             │ (Full-Text)     │
    │                 │             │                 │
    │ "sens global"   │             │ "mots exacts"   │
    │ Trouve: pwd,    │             │ Trouve: XR-7500 │
    │ password...     │             │ exactement      │
    └────────┬────────┘             └────────┬────────┘
             │                               │
             │   Résultats par               │  Résultats par
             │   distance cosinus            │  score BM25
             │                               │
             └───────────────┬───────────────┘
                             ▼
                   ┌─────────────────┐
                   │  Fusion (RRF)   │
                   │  Combine les    │
                   │  deux rankings  │
                   └────────┬────────┘
                            ▼
                   ┌─────────────────┐
                   │ Résultats finaux│
                   │ (best of both)  │
                   └─────────────────┘
```

### 10.3 Full-Text Search dans PostgreSQL

PostgreSQL offre un support natif puissant pour la recherche textuelle via les types `tsvector` et `tsquery`.

#### 10.3.1 tsvector - Le vecteur de recherche

Un `tsvector` est une représentation optimisée d'un texte pour la recherche :

```sql
SELECT to_tsvector('french', 'Le mot de passe WiFi est SuperSecret123');
-- Résultat : 'mot':2 'pass':4 'supersecret123':6 'wifi':5
```

**Ce qui se passe** :

1. **Tokenisation** : Le texte est découpé en mots
2. **Normalisation** : Conversion en minuscules
3. **Stemming** : Réduction aux racines (ex: "passes" → "pass")
4. **Stop words** : Suppression des mots vides ("le", "est", "de"...)
5. **Positions** : Chaque token garde sa position dans le texte

#### 10.3.2 tsquery - La requête de recherche

Une `tsquery` est une requête de recherche textuelle :

```sql
SELECT plainto_tsquery('french', 'mot de passe wifi');
-- Résultat : 'mot' & 'pass' & 'wifi'

-- Opérateurs disponibles :
-- & : AND (tous les termes)
-- | : OR (au moins un terme)
-- ! : NOT (exclure un terme)
-- <-> : FOLLOWED BY (ordre)
```

#### 10.3.3 L'opérateur @@ (matching)

L'opérateur `@@` teste si un `tsvector` correspond à une `tsquery` :

```sql
SELECT 'mot':1 'pass':2 'wifi':3'::tsvector @@ 'wifi & pass'::tsquery;
-- Résultat : true

SELECT 'mot':1 'pass':2 'wifi':3'::tsvector @@ 'docker'::tsquery;
-- Résultat : false
```

#### 10.3.4 ts_rank - Le scoring

`ts_rank` calcule un score de pertinence :

```sql
SELECT ts_rank(
  to_tsvector('french', 'Le mot de passe WiFi est SuperSecret'),
  plainto_tsquery('french', 'mot de passe')
) as rank;
-- Résultat : 0.0991 (plus c'est haut, plus c'est pertinent)
```

**Facteurs de ranking** :

- Fréquence des termes
- Proximité des termes
- Position dans le document
- Longueur du document

#### 10.3.5 Index GIN

L'index **GIN** (Generalized Inverted Index) accélère drastiquement les recherches :

```sql
-- Sans index : scan séquentiel O(n)
-- Avec index GIN : recherche O(log n)

CREATE INDEX chunks_search_idx ON chunks USING GIN(search_vector);
```

**Comment ça marche ?**

```
GIN Index (inversé)
─────────────────────
"wifi"    → [doc_1, doc_5, doc_12]
"passe"   → [doc_1, doc_3, doc_7]
"docker"  → [doc_2, doc_8]
...

Requête: "wifi passe"
→ Intersection: [doc_1] ✅
```

### 10.4 Migration SQL pour Hybrid Search

```sql
-- src/migrations/006_add_fulltext_search.sql

-- 1. Ajouter la colonne tsvector
ALTER TABLE chunks ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Créer l'index GIN
CREATE INDEX IF NOT EXISTS chunks_search_idx ON chunks USING GIN(search_vector);

-- 3. Peupler les chunks existants (français + anglais)
UPDATE chunks
SET search_vector = to_tsvector('french', content) || to_tsvector('english', content)
WHERE search_vector IS NULL;

-- 4. Trigger pour auto-update sur INSERT/UPDATE
CREATE OR REPLACE FUNCTION update_chunks_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('french', NEW.content)
                    || to_tsvector('english', NEW.content);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chunks_search_vector_trigger
  BEFORE INSERT OR UPDATE OF content ON chunks
  FOR EACH ROW
  EXECUTE FUNCTION update_chunks_search_vector();
```

**Pourquoi français ET anglais ?**

- Le stemming varie selon la langue
- "documentation" en français ≠ "documentation" en anglais
- On maximise les chances de match

### 10.5 Implémentation Repository

```typescript
// src/infrastructure/persistence/DocumentRepository.ts

public async searchByKeywords(
  query: string,
  limit = 10
): Promise<ChunkWithRank[]> {
  const results = await this.prisma.$queryRawUnsafe<{
    id: number;
    document_id: number;
    document_title: string | null;
    content: string;
    chunk_index: number;
    rank: number;
  }[]>(
    `SELECT c.id, c.document_id, d.title as document_title,
            c.content, c.chunk_index,
            ts_rank(
              c.search_vector,
              plainto_tsquery('french', $1) || plainto_tsquery('english', $1)
            ) as rank
     FROM chunks c
     JOIN documents d ON c.document_id = d.id
     WHERE c.search_vector @@ (
       plainto_tsquery('french', $1) || plainto_tsquery('english', $1)
     )
     ORDER BY rank DESC
     LIMIT $2`,
    query,
    limit
  );

  return results.map((r) => ({
    id: Number(r.id),
    documentId: Number(r.document_id),
    documentTitle: r.document_title,
    content: r.content,
    chunkIndex: r.chunk_index,
    rank: Number(r.rank),
  }));
}
```

### 10.6 RRF - Reciprocal Rank Fusion

L'algorithme **RRF** (Reciprocal Rank Fusion) combine les résultats de plusieurs sources de ranking.

#### 10.6.1 Le problème de la fusion

Comment combiner deux rankings différents ?

```
Vector Search:          Keyword Search:
1. Doc A (dist: 0.2)    1. Doc C (rank: 0.95)
2. Doc B (dist: 0.3)    2. Doc A (rank: 0.80)
3. Doc C (dist: 0.4)    3. Doc D (rank: 0.75)
4. Doc D (dist: 0.5)    4. Doc B (rank: 0.60)

Problème : Les scores ne sont pas comparables !
- Distance cosinus : 0-2 (plus bas = mieux)
- ts_rank : 0-1 (plus haut = mieux)
```

#### 10.6.2 La solution RRF

RRF ignore les scores bruts et utilise uniquement les **positions** (rangs) :

```
Score RRF = Σ (1 / (k + rang))

Où k est une constante (typiquement 60)
```

**Pourquoi k=60 ?**

- k trop petit : les premiers rangs dominent trop
- k trop grand : les différences de rang sont aplaties
- k=60 est empiriquement un bon compromis

#### 10.6.3 Exemple de calcul

```
k = 60

Doc A: rang_vector=1, rang_keyword=2
Score_A = 1/(60+1) + 1/(60+2) = 0.0164 + 0.0161 = 0.0325

Doc B: rang_vector=2, rang_keyword=4
Score_B = 1/(60+2) + 1/(60+4) = 0.0161 + 0.0156 = 0.0317

Doc C: rang_vector=3, rang_keyword=1
Score_C = 1/(60+3) + 1/(60+1) = 0.0159 + 0.0164 = 0.0323

Doc D: rang_vector=4, rang_keyword=3
Score_D = 1/(60+4) + 1/(60+3) = 0.0156 + 0.0159 = 0.0315

Ranking final: A > C > B > D
```

**Observation** : Doc A gagne car il est bien classé dans LES DEUX rankings.

#### 10.6.4 Implémentation

```typescript
// src/application/services/rag/HybridSearchService.ts

export class HybridSearchService {
  private readonly documentService: IDocumentService;
  private readonly RRF_K = 60;

  async search(
    query: string,
    options: HybridSearchOptions = {}
  ): Promise<HybridSearchResult[]> {
    // 1. Exécuter les deux recherches en parallèle
    const [vectorResults, keywordResults] = await Promise.all([
      this.documentService.searchByQuery(query, { limit: options.limit * 2 }),
      this.documentService.searchByKeywords(query, options.limit * 2),
    ]);

    // 2. Fusionner avec RRF
    return this.fuseWithRRF(vectorResults, keywordResults, options.limit);
  }

  private fuseWithRRF(
    vectorResults: ChunkWithDistance[],
    keywordResults: ChunkWithRank[],
    limit: number
  ): HybridSearchResult[] {
    const scoreMap = new Map<number, HybridSearchResult>();

    // Scores des résultats vectoriels
    vectorResults.forEach((chunk, index) => {
      const vectorRank = index + 1;
      const rrfScore = 1 / (this.RRF_K + vectorRank);

      scoreMap.set(chunk.id, {
        id: chunk.id,
        documentId: chunk.documentId,
        documentTitle: chunk.documentTitle,
        content: chunk.content,
        vectorRank,
        rrfScore,
        distance: chunk.distance,
      });
    });

    // Ajouter les scores keyword
    keywordResults.forEach((chunk, index) => {
      const keywordRank = index + 1;
      const keywordScore = 1 / (this.RRF_K + keywordRank);

      const existing = scoreMap.get(chunk.id);
      if (existing) {
        // Document trouvé par les deux méthodes → boost !
        existing.keywordRank = keywordRank;
        existing.rrfScore += keywordScore;
      } else {
        // Trouvé uniquement par keyword
        scoreMap.set(chunk.id, {
          id: chunk.id,
          documentId: chunk.documentId,
          documentTitle: chunk.documentTitle,
          content: chunk.content,
          keywordRank,
          rrfScore: keywordScore,
        });
      }
    });

    // Trier par score RRF décroissant
    return Array.from(scoreMap.values())
      .sort((a, b) => b.rrfScore - a.rrfScore)
      .slice(0, limit);
  }
}
```

### 10.7 Intégration dans le RAG

```typescript
// src/application/services/rag/RAGService.ts

async buildEnrichedPrompt(
  userMessage: string,
  options: RAGOptions = {}
): Promise<RAGContext> {
  // Query rewriting...
  const searchQuery = await this.rewriteQueryIfEnabled(userMessage, options);

  // Hybrid Search activé ?
  if (this.shouldUseHybridSearch(options)) {
    return this.performHybridSearch(searchQuery, options);
  }

  // Sinon : recherche vectorielle classique
  return this.performVectorSearch(searchQuery, options);
}

private async performHybridSearch(
  searchQuery: string,
  options: RAGOptions
): Promise<RAGContext> {
  // Recherche hybride
  const hybridResults = await this.hybridSearchService.search(searchQuery, {
    limit: this.config.rerankCandidates,
    maxDistance: this.config.maxDistance,
  });

  if (hybridResults.length === 0) {
    return this.emptyContext();
  }

  this.logger.info(`🔍 Hybrid search: ${hybridResults.length} results`);

  // Convertir en ChunkWithDistance pour compatibilité
  const chunks = this.hybridResultsToChunks(hybridResults);

  // Reranking optionnel
  if (this.shouldUseReranking(options)) {
    const { chunks: rerankedChunks, sources } =
      await this.rerankChunks(searchQuery, chunks);
    return this.buildContextFromChunks(rerankedChunks, sources);
  }

  return this.buildContextFromChunks(chunks, this.buildHybridSources(hybridResults));
}
```

### 10.8 Configuration et Toggle Frontend

**Backend** :

```typescript
// RAGConfig
export interface RAGConfig {
  maxDocuments: number; // 3
  maxDistance: number; // 0.8
  useReranking: boolean; // true
  useHybridSearch: boolean; // false (opt-in)
  rerankCandidates: number; // 10
}

// RAGOptions (par requête)
export interface RAGOptions {
  useReranking?: boolean;
  useQueryRewrite?: boolean;
  useHybridSearch?: boolean; // ← Nouveau
  conversationHistory?: string[];
}
```

**Frontend** :

```vue
<div class="options-row">
  <label class="rag-toggle">
    <input type="checkbox" v-model="useRAG" />
    <span>📚 RAG</span>
  </label>
  <label class="rag-toggle" :class="{ disabled: !useRAG }">
    <input type="checkbox" v-model="useQueryRewrite" :disabled="!useRAG" />
    <span>✏️ Rewrite</span>
  </label>
  <label class="rag-toggle" :class="{ disabled: !useRAG }">
    <input type="checkbox" v-model="useReranking" :disabled="!useRAG" />
    <span>🔄 Rerank</span>
  </label>
  <label class="rag-toggle" :class="{ disabled: !useRAG }">
    <input type="checkbox" v-model="useHybridSearch" :disabled="!useRAG" />
    <span>🔎 Hybrid</span>
  </label>
</div>
```

### 10.9 Comparaison des méthodes de recherche

| Critère             | Vector seul  | Keyword seul | Hybrid       |
| ------------------- | ------------ | ------------ | ------------ |
| **Sens/Synonymes**  | ✅ Excellent | ❌ Aucun     | ✅ Excellent |
| **Mots exacts**     | ⚠️ Variable  | ✅ Excellent | ✅ Excellent |
| **Codes/Acronymes** | ❌ Faible    | ✅ Excellent | ✅ Excellent |
| **Noms propres**    | ❌ Faible    | ✅ Excellent | ✅ Excellent |
| **Latence**         | ~50ms        | ~20ms        | ~70ms        |
| **Complexité**      | Moyenne      | Faible       | Haute        |

### 10.10 Performance et optimisation

#### Latence

| Étape                 | Temps      | Optimisation                   |
| --------------------- | ---------- | ------------------------------ |
| Génération embedding  | ~100ms     | Cache embeddings fréquents     |
| Recherche vectorielle | ~30ms      | Index HNSW                     |
| Recherche full-text   | ~20ms      | Index GIN                      |
| Fusion RRF            | ~1ms       | En mémoire                     |
| **Total hybrid**      | **~150ms** | Parallélisation des recherches |

#### Parallélisation

```typescript
// Les deux recherches sont indépendantes → Promise.all
const [vectorResults, keywordResults] = await Promise.all([
  this.documentService.searchByQuery(query, options),
  this.documentService.searchByKeywords(query, limit),
]);
```

### 10.11 Quand utiliser Hybrid Search ?

**✅ Recommandé pour** :

- Bases de connaissances avec codes/références techniques
- Documents contenant des noms propres (personnes, produits)
- Requêtes potentiellement contenant des acronymes
- Quand la précision est plus importante que la latence

**❌ Pas nécessaire pour** :

- Requêtes purement conversationnelles
- Petits corpus (<100 documents)
- Quand la latence est critique
- Documents homogènes sans termes techniques

### 10.12 Schéma de la base de données

```sql
-- Table chunks avec support hybrid search
CREATE TABLE chunks (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1024) NOT NULL,     -- Pour vector search
  search_vector tsvector,               -- Pour keyword search
  chunk_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour vector search (HNSW ou IVFFlat)
CREATE INDEX chunks_embedding_idx ON chunks
USING hnsw (embedding vector_cosine_ops);

-- Index pour keyword search (GIN)
CREATE INDEX chunks_search_idx ON chunks
USING GIN(search_vector);
```

### 10.13 Points clés à retenir

| Concept             | Explication                                             |
| ------------------- | ------------------------------------------------------- |
| **tsvector**        | Représentation tokenisée d'un texte pour recherche      |
| **tsquery**         | Requête de recherche textuelle                          |
| **GIN index**       | Index inversé pour recherche full-text rapide           |
| **RRF**             | Algorithme de fusion basé sur les rangs, pas les scores |
| **k=60**            | Constante RRF pour équilibrer les rangs                 |
| **Parallélisation** | Les deux recherches sont indépendantes                  |
| **Trigger**         | Auto-update du search_vector à l'insertion              |

---

## 11. Architecture Clean Architecture

Le projet utilise une **Clean Architecture** (aussi appelée Hexagonal Architecture ou Ports & Adapters) pour une meilleure séparation des responsabilités et testabilité.

### 11.1 Les couches

```
┌─────────────────────────────────────────────────────────────────┐
│                        INFRASTRUCTURE                            │
│  (HTTP, Base de données, APIs externes)                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                        APPLICATION                         │  │
│  │  (Use Cases, Services, Ports)                             │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │                      DOMAIN                          │  │  │
│  │  │  (Entités, Value Objects, Règles métier)            │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Règle de dépendance** : Les couches internes ne connaissent pas les couches externes.

### 11.2 Structure des fichiers

```
src/
├── domain/                          # 🟢 COUCHE DOMAINE (cœur métier)
│   ├── conversation/
│   │   ├── entities/
│   │   │   ├── Conversation.ts      # Entité Conversation
│   │   │   └── Message.ts           # Entité Message
│   │   ├── errors/
│   │   │   └── ConversationErrors.ts
│   │   ├── repositories/
│   │   │   └── IConversationRepository.ts  # Interface (port)
│   │   └── valueObjects/
│   │       └── MessageRole.ts
│   ├── document/
│   │   ├── entities/
│   │   │   └── Document.ts
│   │   ├── repositories/
│   │   │   └── IDocumentRepository.ts
│   │   └── valueObjects/
│   │       └── Embedding.ts
│   └── shared/
│       ├── errors/
│       │   └── DomainError.ts
│       └── valueObjects/
│           └── UUID.ts
│
├── application/                     # 🔵 COUCHE APPLICATION (orchestration)
│   ├── ports/
│   │   ├── in/                      # Ports d'entrée (ce que l'app expose)
│   │   │   ├── conversation.ts      # Interfaces des use cases
│   │   │   └── document.ts
│   │   └── out/                     # Ports de sortie (ce dont l'app a besoin)
│   │       ├── IConversationService.ts
│   │       ├── IDocumentService.ts
│   │       ├── IMistralClient.ts
│   │       └── IRAGService.ts
│   ├── services/
│   │   ├── conversation/
│   │   │   └── ConversationService.ts
│   │   ├── document/
│   │   │   └── DocumentService.ts
│   │   └── rag/
│   │       └── RAGService.ts        # Service RAG
│   └── usecases/
│       ├── conversation/
│       │   ├── CreateConversationUseCase.ts
│       │   ├── SendMessageUseCase.ts
│       │   └── StreamMessageUseCase.ts  # Use case principal du chat
│       └── document/
│           ├── AddDocumentUseCase.ts
│           ├── SearchDocumentsUseCase.ts
│           └── ...
│
├── infrastructure/                  # 🔴 COUCHE INFRASTRUCTURE (détails techniques)
│   ├── http/
│   │   ├── controllers/
│   │   │   ├── conversationController.ts
│   │   │   └── documentController.ts
│   │   ├── routes/
│   │   │   ├── conversationRoutes.ts
│   │   │   └── documentRoutes.ts
│   │   └── middlewares/
│   │       └── errorHandler.ts
│   ├── persistence/
│   │   ├── ConversationRepository.ts  # Implémente IConversationRepository
│   │   └── DocumentRepository.ts      # Implémente IDocumentRepository
│   ├── external/
│   │   ├── mistral/
│   │   │   ├── MistralClient.ts       # Implémente IMistralClient
│   │   │   ├── tokenizer.ts
│   │   │   └── errors.ts
│   │   └── rerank/
│   │       ├── RerankClient.ts        # Client HTTP pour le service Python
│   │       ├── types.ts
│   │       └── errors.ts
│   ├── common/
│   │   └── retry.ts                   # Exponential backoff
│   └── config/
│       └── prisma.ts
│
├── server.ts                        # Point d'entrée
│
rerank-service/                      # 🐍 SERVICE PYTHON (microservice ML)
├── main.py                          # FastAPI + CrossEncoder
├── requirements.txt                 # Dépendances Python
└── Dockerfile                       # Image Docker
```

### 11.3 Responsabilités par couche

| Couche             | Contient                                  | Responsabilité                                 |
| ------------------ | ----------------------------------------- | ---------------------------------------------- |
| **Domain**         | Entities, Value Objects, Interfaces repos | Règles métier pures, aucune dépendance externe |
| **Application**    | Use Cases, Services, Ports                | Orchestrer les cas d'utilisation               |
| **Infrastructure** | Controllers, Repositories, Clients API    | Implémenter les détails techniques             |

### 11.4 Les Ports (Interfaces)

Les **ports** définissent des contrats que l'infrastructure doit respecter :

```typescript
// application/ports/out/IMistralClient.ts
export interface IMistralClient {
  chat(message: string, options?: ChatOptions): Promise<string | null>;
  streamComplete(messages: ChatMessage[]): AsyncIterable<string>;
  generateEmbedding(text: string): Promise<number[]>;
}

// infrastructure/external/mistral/MistralClient.ts
export class MistralClient implements IMistralClient {
  // Implémentation concrète avec le SDK Mistral
}
```

**Avantage** : On peut remplacer `MistralClient` par un mock pour les tests !

### 11.5 Les Use Cases

Un **Use Case** représente une action métier unique :

```typescript
// application/usecases/conversation/StreamMessageUseCase.ts

export class StreamMessageUseCase {
  constructor(
    private conversationService: IConversationService,
    private mistralClient: IMistralClient,
    private ragService: IRAGService,  // Injection de dépendances
  ) {}

  async *execute(input: StreamMessageInput): AsyncGenerator<StreamMessageChunk> {
    // 1. Sauvegarder le message
    await this.conversationService.addMessage(...);

    // 2. Récupérer l'historique
    const chatHistory = await this.conversationService.getChatHistory(...);

    // 3. Enrichir avec RAG
    const ragContext = await this.ragService.buildEnrichedPrompt(message);
    chatHistory[0].content = ragContext.enrichedPrompt;

    // 4. Streamer la réponse
    for await (const chunk of this.mistralClient.streamComplete(chatHistory)) {
      yield { chunk };
    }
  }
}
```

### 11.6 Flux d'une requête (Clean Architecture)

```
POST /api/chat/stream
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ INFRASTRUCTURE: conversationController.ts                       │
│   → Valide la requête HTTP                                      │
│   → Appelle le Use Case                                         │
└─────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ APPLICATION: StreamMessageUseCase.ts                            │
│   → Orchestre la logique métier                                 │
│   → Utilise les Services via leurs interfaces (ports)          │
│   │                                                             │
│   ├── ConversationService.addMessage()                          │
│   ├── ConversationService.getChatHistory()                      │
│   ├── RAGService.buildEnrichedPrompt()  ◄── Recherche docs     │
│   └── MistralClient.streamComplete()                            │
└─────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ INFRASTRUCTURE: Implémentations concrètes                       │
│   │                                                             │
│   ├── ConversationRepository (Prisma + PostgreSQL)              │
│   ├── DocumentRepository (pgvector)                             │
│   └── MistralClient (SDK Mistral)                               │
└─────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ EXTERNAL: APIs et Base de données                               │
│   ├── Mistral AI API                                            │
│   └── PostgreSQL + pgvector                                     │
└─────────────────────────────────────────────────────────────────┘
```

### 11.7 Avantages de cette architecture

| Avantage           | Description                                   |
| ------------------ | --------------------------------------------- |
| **Testabilité**    | On peut mocker les dépendances externes       |
| **Maintenabilité** | Chaque couche a une responsabilité claire     |
| **Flexibilité**    | Changer de DB ou d'API sans toucher au métier |
| **Indépendance**   | Le domaine ne dépend de rien                  |

---

## 12. Frontend Vue.js

### 12.1 Composants

```
frontend/src/
├── views/
│   └── ChatBot.vue           # Vue principale
├── components/
│   ├── ChatInput.vue         # Champ de saisie
│   ├── ChatMessage.vue       # Bulle de message
│   └── ChatSidebar.vue       # Liste des conversations
└── router/
    └── index.ts              # Vue Router
```

### 12.2 Gestion du streaming

```vue
<script setup>
const messages = ref([]);

async function sendMessage(content) {
  // 1. Ajouter le message user
  messages.value.push({ role: 'user', content });

  // 2. Préparer le message assistant (vide)
  const assistantIndex = messages.value.length;
  messages.value.push({ role: 'assistant', content: '' });

  // 3. Stream la réponse
  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // 4. Mettre à jour en temps réel
    messages.value[assistantIndex].content += chunk;
  }
}
</script>
```

---

## 13. Concepts clés à retenir

### 13.1 Patterns

| Pattern                  | Où                           | Pourquoi                               |
| ------------------------ | ---------------------------- | -------------------------------------- |
| **Clean Architecture**   | Structure du projet          | Séparation des responsabilités         |
| **Ports & Adapters**     | Interfaces + Implémentations | Découplage, testabilité                |
| **Use Case**             | StreamMessageUseCase         | Une action métier = une classe         |
| **Dependency Injection** | Constructeurs Use Cases      | Injecter les dépendances (mocks)       |
| **Repository**           | ConversationRepository       | Abstraction de la persistance          |
| **Singleton**            | getMistralClient()           | Une seule instance, config partagée    |
| **AsyncIterator**        | streamComplete()             | Traiter les données au fur et à mesure |
| **Exponential Backoff**  | withRetry()                  | Résilience aux erreurs API             |
| **Sliding Window**       | tokenizer.ts                 | Gérer les limites de contexte          |
| **RAG**                  | RAGService                   | Enrichir le LLM avec des docs privés   |
| **Query Rewriting**      | QueryRewriterService         | Optimiser la query avant recherche     |
| **Two-Stage Retrieval**  | RAGService + RerankClient    | Recherche large → reranking précis     |
| **Hybrid Search**        | HybridSearchService          | Combiner vector + keyword search       |
| **RRF (Rank Fusion)**    | HybridSearchService          | Fusionner rankings sans scores bruts   |
| **Fallback gracieux**    | RerankClient.isAvailable()   | Continuer si service indisponible      |
| **Microservice**         | rerank-service (Python)      | Isoler le modèle ML du backend Node.js |
| **Zod Validation**       | schemas/\*.schema.ts         | Validation typée et réutilisable       |

### 13.2 Bonnes pratiques

1. **Séparation des responsabilités** : Routes → Controllers → Services
2. **Typage fort** : Interfaces TypeScript partout
3. **Gestion des erreurs** : Classes d'erreurs custom
4. **Configuration** : Variables d'environnement, pas de hardcode
5. **Logging** : Console.log pour debug, avec préfixes `[ServiceName]`
6. **Paramètres SQL** : Toujours utiliser `$1, $2` au lieu de concaténation

### 13.3 Points de vigilance

| Problème                 | Solution                       |
| ------------------------ | ------------------------------ |
| Rate limiting (429)      | Retry avec exponential backoff |
| Context overflow (400)   | Sliding window                 |
| Latence UX               | Streaming SSE                  |
| Perte de contexte        | Persistance PostgreSQL         |
| Erreurs silencieuses     | Classes d'erreurs typées       |
| Longs documents          | Chunking avant embedding       |
| Résultats non pertinents | Filtrer par maxDistance        |
| Queries mal formulées    | Query Rewriting avec LLM       |
| Résultats mal classés    | Reranking avec cross-encoder   |
| Service rerank down      | Fallback vers recherche vector |
| Latence reranking        | Limiter les candidats (10 max) |
| Codes/noms non trouvés   | Hybrid Search (vector+keyword) |
| Validation manuelle      | Schémas Zod centralisés        |

### 13.4 Commandes utiles

```bash
# Générer le client Prisma
pnpm prisma:generate

# Pousser le schéma en DB
pnpm db:push

# Reset la DB
pnpm db:push --force-reset

# Migrations SQL personnalisées (pour pgvector)
docker compose exec app sh -c "cd /app/src && pnpm migrate"

# Logs Docker
docker compose logs app --tail=20
docker compose logs frontend --tail=20

# Activer pgvector
docker compose exec postgres psql -U postgres -d ia_chat -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Voir les documents indexés (avec tracking des chunks)
docker compose exec postgres psql -U postgres -d ia_chat -c "SELECT id, LEFT(content, 50), source_id, chunk_index FROM documents;"

# Voir les migrations appliquées
docker compose exec postgres psql -U postgres -d ia_chat -c "SELECT * FROM _migrations;"

# === Service de Reranking ===

# Construire l'image (télécharge le modèle ~280MB)
docker build --network=host -t ia-project-rerank ./rerank-service

# Démarrer le service
docker compose up -d rerank

# Vérifier la santé du service
curl http://localhost:8001/health

# Logs du service rerank
docker compose logs rerank --tail=20

# Tester le reranking manuellement
curl -X POST http://localhost:8001/rerank \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "documents": [{"id": 1, "content": "doc"}], "top_k": 1}'

# === Hybrid Search (Full-Text) ===

# Vérifier la colonne search_vector
docker compose exec postgres psql -U postgres -d ia_chat -c \
  "SELECT id, LEFT(content, 30), search_vector IS NOT NULL as has_fts FROM chunks LIMIT 5;"

# Tester la recherche full-text
docker compose exec postgres psql -U postgres -d ia_chat -c \
  "SELECT id, ts_rank(search_vector, plainto_tsquery('french', 'wifi')) as rank
   FROM chunks WHERE search_vector @@ plainto_tsquery('french', 'wifi');"

# Vérifier l'index GIN
docker compose exec postgres psql -U postgres -d ia_chat -c \
  "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'chunks';"
```

### 13.5 Système de migrations SQL

Prisma ne supporte pas le type `vector` de pgvector, donc on utilise un système de migrations SQL personnalisé :

```
src/migrations/
├── 001_create_documents_table.sql   # Table de base
├── 002_add_chunk_tracking.sql       # Colonnes source_id, chunk_index
└── migrate.ts                       # Script d'exécution
```

**Structure de la table `_migrations`** :

| id  | name                           | applied_at |
| --- | ------------------------------ | ---------- |
| 1   | 001_create_documents_table.sql | 2024-12-21 |
| 2   | 002_add_chunk_tracking.sql     | 2024-12-21 |

**Créer une nouvelle migration** :

```sql
-- src/migrations/003_add_my_feature.sql
ALTER TABLE documents ADD COLUMN IF NOT EXISTS my_column TEXT;
```

Puis exécuter : `docker compose exec app sh -c "cd /app/src && pnpm migrate"`

### 13.6 Fixtures et Seeding

Pour tester l'application avec des données réalistes :

```bash
# Voir ce qui serait inséré (sans exécuter)
docker compose exec app sh -c "cd /app/src && pnpm seed:dry"

# Insérer les fixtures (conserve les données existantes)
docker compose exec app sh -c "cd /app/src && pnpm seed"

# Nettoyer et réinsérer (reset complet)
docker compose exec app sh -c "cd /app/src && pnpm seed:clean"
```

**Structure des fixtures** :

```
src/fixtures/
├── documents.ts   # Données de test (FAQ, procédures, docs techniques)
├── seed.ts        # Script d'exécution
└── index.ts       # Exports
```

**Types de documents inclus** :

| Catégorie       | Exemples                  | Chunking       |
| --------------- | ------------------------- | -------------- |
| Infos pratiques | WiFi, horaires, contacts  | Non            |
| Procédures      | Congés, notes de frais    | Non            |
| Technique       | Docker, Architecture, API | Oui (3 chunks) |
| FAQ             | Questions fréquentes      | Non            |
| RH              | Télétravail               | Non            |

**Exemple de fixture** :

```typescript
// src/fixtures/documents.ts
export const documentFixtures: DocumentFixture[] = [
  {
    title: 'WiFi et Réseau',
    content: `Le mot de passe WiFi est SecretWifi2024!...`,
    useChunking: false, // Document court → pas de chunking
  },
  {
    title: 'Guide Docker',
    content: `Guide complet de 800 mots...`,
    useChunking: true, // Document long → chunking
    chunkSize: 400,
    overlap: 80,
  },
];
```

---

## 📝 Checklist de révision

### Clean Architecture

- [ ] Je connais les 3 couches : Domain, Application, Infrastructure
- [ ] Je comprends la règle de dépendance (vers l'intérieur)
- [ ] Je sais ce qu'est un Port (interface) et pourquoi c'est utile
- [ ] Je sais ce qu'est un Use Case et son rôle
- [ ] Je comprends l'injection de dépendances

### Patterns

- [ ] Je comprends le pattern Singleton
- [ ] Je sais implémenter un retry avec exponential backoff
- [ ] Je comprends pourquoi le jitter est important
- [ ] Je sais ce qu'est une sliding window et pourquoi c'est nécessaire

### Streaming & Frontend

- [ ] Je peux expliquer le flux SSE (Server-Sent Events)
- [ ] Je comprends les AsyncIterables (`async *` et `yield`)
- [ ] Je peux consommer un stream côté frontend

### Base de données

- [ ] Je sais créer un schéma Prisma
- [ ] Je comprends les transactions et niveaux d'isolation
- [ ] Je sais utiliser `$queryRawUnsafe` avec des paramètres positionnels
- [ ] Je sais créer des migrations SQL pour les types non supportés par Prisma (vector)

### Embeddings & RAG

- [ ] Je comprends ce qu'est un embedding (texte → vecteur)
- [ ] Je sais générer un embedding avec `mistral-embed`
- [ ] Je comprends la distance cosinus et comment l'interpréter
- [ ] Je sais stocker des vecteurs avec pgvector
- [ ] Je peux implémenter une recherche sémantique
- [ ] Je comprends le concept de RAG et son utilité
- [ ] Je sais que le system prompt est réécrit à chaque message avec le contexte RAG
- [ ] Je sais pourquoi le chunking est important pour les longs documents
- [ ] Je comprends le chunking avec overlap et pourquoi c'est mieux que sans
- [ ] Je sais calculer le step : `step = chunkSize - overlap`
- [ ] Je connais les algorithmes de recherche vectorielle (Force brute, IVFFlat, HNSW)

### Reranking

- [ ] Je comprends la différence entre Bi-Encoder (embeddings) et Cross-Encoder (reranking)
- [ ] Je sais pourquoi le reranking améliore la précision vs la recherche vectorielle seule
- [ ] Je connais le pattern "two-stage retrieval" (recherche large → reranking précis)
- [ ] Je comprends pourquoi on utilise un service Python séparé (écosystème ML, isolation)
- [ ] Je sais implémenter un fallback gracieux (continuer sans reranking si le service tombe)
- [ ] Je comprends la conversion score → similarité avec la fonction sigmoid
- [ ] Je sais configurer et déployer un service de reranking avec Docker

### Microservices & Architecture distribuée

- [ ] Je comprends l'intérêt d'isoler les modèles ML dans des services dédiés
- [ ] Je sais implémenter un healthcheck pour vérifier la disponibilité d'un service
- [ ] Je comprends le cache de disponibilité (éviter les appels répétés)
- [ ] Je sais gérer les erreurs réseau (timeout, service indisponible)

### Hybrid Search

- [ ] Je comprends la différence entre recherche vectorielle et recherche par mots-clés
- [ ] Je sais quand utiliser Hybrid Search (codes produits, noms propres, acronymes)
- [ ] Je comprends ce qu'est un `tsvector` et un `tsquery` dans PostgreSQL
- [ ] Je sais créer un index GIN pour accélérer la recherche full-text
- [ ] Je comprends l'algorithme RRF (Reciprocal Rank Fusion)
- [ ] Je sais pourquoi RRF utilise les rangs et non les scores bruts
- [ ] Je comprends le rôle de la constante k=60 dans RRF
- [ ] Je sais paralléliser les recherches vectorielle et keyword avec Promise.all
- [ ] Je peux créer un trigger PostgreSQL pour auto-update de colonnes

### Validation (Zod)

- [ ] Je comprends les avantages de Zod vs validation manuelle
- [ ] Je sais créer des schémas de validation avec Zod
- [ ] Je comprends l'inférence de types avec `z.infer<typeof Schema>`
- [ ] Je sais utiliser `.refine()` pour des validations cross-field
- [ ] Je peux créer des helpers de validation réutilisables

---

_Document mis à jour le 22/12/2024_
