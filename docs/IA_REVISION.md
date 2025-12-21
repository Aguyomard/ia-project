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
9. [Architecture Clean Architecture](#9-architecture-clean-architecture)
10. [Frontend Vue.js](#10-frontend-vuejs)
11. [Concepts clés à retenir](#11-concepts-clés-à-retenir)

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
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐    ┌─────────────────────────┐
│     MISTRAL AI API      │    │     POSTGRESQL          │
│  - Chat (mistral-tiny)  │    │  - Prisma ORM           │
│  - Embeddings           │    │  - pgvector (RAG)       │
└─────────────────────────┘    └─────────────────────────┘
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

---

## 9. Architecture Clean Architecture

Le projet utilise une **Clean Architecture** (aussi appelée Hexagonal Architecture ou Ports & Adapters) pour une meilleure séparation des responsabilités et testabilité.

### 9.1 Les couches

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

### 9.2 Structure des fichiers

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
│   │   └── mistral/
│   │       ├── MistralClient.ts       # Implémente IMistralClient
│   │       ├── tokenizer.ts
│   │       └── errors.ts
│   ├── common/
│   │   └── retry.ts                   # Exponential backoff
│   └── config/
│       └── prisma.ts
│
└── server.ts                        # Point d'entrée
```

### 9.3 Responsabilités par couche

| Couche             | Contient                                  | Responsabilité                                 |
| ------------------ | ----------------------------------------- | ---------------------------------------------- |
| **Domain**         | Entities, Value Objects, Interfaces repos | Règles métier pures, aucune dépendance externe |
| **Application**    | Use Cases, Services, Ports                | Orchestrer les cas d'utilisation               |
| **Infrastructure** | Controllers, Repositories, Clients API    | Implémenter les détails techniques             |

### 9.4 Les Ports (Interfaces)

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

### 9.5 Les Use Cases

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

### 9.6 Flux d'une requête (Clean Architecture)

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

### 9.7 Avantages de cette architecture

| Avantage           | Description                                   |
| ------------------ | --------------------------------------------- |
| **Testabilité**    | On peut mocker les dépendances externes       |
| **Maintenabilité** | Chaque couche a une responsabilité claire     |
| **Flexibilité**    | Changer de DB ou d'API sans toucher au métier |
| **Indépendance**   | Le domaine ne dépend de rien                  |

---

## 10. Frontend Vue.js

### 10.1 Composants

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

### 10.2 Gestion du streaming

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

## 11. Concepts clés à retenir

### 11.1 Patterns

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

### 11.2 Bonnes pratiques

1. **Séparation des responsabilités** : Routes → Controllers → Services
2. **Typage fort** : Interfaces TypeScript partout
3. **Gestion des erreurs** : Classes d'erreurs custom
4. **Configuration** : Variables d'environnement, pas de hardcode
5. **Logging** : Console.log pour debug, avec préfixes `[ServiceName]`
6. **Paramètres SQL** : Toujours utiliser `$1, $2` au lieu de concaténation

### 11.3 Points de vigilance

| Problème                 | Solution                       |
| ------------------------ | ------------------------------ |
| Rate limiting (429)      | Retry avec exponential backoff |
| Context overflow (400)   | Sliding window                 |
| Latence UX               | Streaming SSE                  |
| Perte de contexte        | Persistance PostgreSQL         |
| Erreurs silencieuses     | Classes d'erreurs typées       |
| Longs documents          | Chunking avant embedding       |
| Résultats non pertinents | Filtrer par maxDistance        |

### 11.4 Commandes utiles

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
```

### 11.5 Système de migrations SQL

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

### 11.6 Fixtures et Seeding

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

---

_Document mis à jour le 21/12/2024_
