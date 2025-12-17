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
9. [Architecture MVC](#9-architecture-mvc)
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
│                         BACKEND (Node.js/Express)                │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                        ROUTES                             │   │
│  │  POST /api/chat          POST /api/conversations          │   │
│  │  POST /api/chat/stream   GET  /api/documents              │   │
│  │  POST /api/documents     POST /api/documents/search       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     CONTROLLERS                           │   │
│  │  conversationController    documentController             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                       SERVICES                            │   │
│  │  ┌─────────────────┐  ┌─────────────┐  ┌──────────────┐  │   │
│  │  │ MistralService  │  │Conversation │  │ Document     │  │   │
│  │  │ - chat()        │  │Service      │  │ Service      │  │   │
│  │  │ - complete()    │  │- create()   │  │- addDocument │  │   │
│  │  │ - streamComplete│  │- addMessage │  │- searchSimilar│ │   │
│  │  │ - generateEmbed │  │- getHistory │  │- (RAG)       │  │   │
│  │  └─────────────────┘  └─────────────┘  └──────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                        UTILS                              │   │
│  │  retry.ts (Exponential Backoff)                          │   │
│  │  tokenizer.ts (Sliding Window)                           │   │
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

Pour les longs documents, on les découpe en **chunks** avant de générer les embeddings :

```typescript
function chunkText(text: string, maxLength = 500): string[] {
  const sentences = text.split(/[.!?]+/);
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + sentence).length > maxLength) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence + '. ';
    }
  }
  if (current) chunks.push(current.trim());

  return chunks;
}

// Utilisation
const longDocument = '... 5000 mots ...';
const chunks = chunkText(longDocument);
await documentService.addDocuments(chunks); // Chaque chunk a son embedding
```

**Pourquoi ?** Un seul vecteur pour un long document "dilue" le sens. Des chunks permettent une recherche plus précise.

### 8.5 Stratégies de chunking

| Stratégie           | Description                | Usage                        |
| ------------------- | -------------------------- | ---------------------------- |
| **Fixed size**      | 500 caractères             | Simple, rapide               |
| **Sentence-based**  | Par phrases                | Préserve le sens             |
| **Paragraph-based** | Par paragraphes            | Documents structurés         |
| **Overlap**         | Chevauchement entre chunks | Évite de couper des idées    |
| **Semantic**        | Par similarité sémantique  | Le plus précis, mais coûteux |

### 8.6 Modèles d'embedding

| Modèle                   | Fournisseur | Dimension | Coût             |
| ------------------------ | ----------- | --------- | ---------------- |
| `mistral-embed`          | Mistral     | 1024      | ~0.1€/1M tokens  |
| `text-embedding-3-small` | OpenAI      | 1536      | ~0.02$/1M tokens |
| `text-embedding-3-large` | OpenAI      | 3072      | ~0.13$/1M tokens |
| `all-MiniLM-L6-v2`       | Open source | 384       | Gratuit (local)  |
| `nomic-embed-text`       | Open source | 768       | Gratuit (local)  |

---

## 9. Architecture MVC

### 9.1 Structure des fichiers

```
src/
├── routes/
│   ├── index.ts              # Agrège toutes les routes
│   ├── conversationRoutes.ts # Routes /conversations, /chat
│   └── documentRoutes.ts     # Routes /documents (RAG)
├── controllers/
│   ├── conversationController.ts  # Logique HTTP chat
│   └── documentController.ts      # Logique HTTP documents
├── services/
│   ├── mistral/
│   │   ├── MistralService.ts # Logique IA (chat + embeddings)
│   │   ├── types.ts          # Interfaces
│   │   ├── errors.ts         # Erreurs custom
│   │   └── index.ts          # Exports
│   ├── conversation/
│   │   └── ConversationService.ts  # Logique DB conversations
│   └── document/
│       └── DocumentService.ts      # Logique DB documents (RAG)
├── utils/
│   ├── retry.ts              # Exponential backoff
│   └── tokenizer.ts          # Sliding window
└── server.ts                 # Point d'entrée
```

### 9.2 Responsabilités

| Couche      | Responsabilité                            |
| ----------- | ----------------------------------------- |
| Routes      | Définir les endpoints                     |
| Controllers | Gérer HTTP (req/res), valider, orchestrer |
| Services    | Logique métier (IA, DB, Embeddings)       |
| Utils       | Fonctions réutilisables                   |

### 9.3 Flux d'une requête

```
POST /api/chat
     │
     ▼
[conversationRoutes.ts]
     │ router.post('/chat', chat)
     ▼
[conversationController.ts]
     │ - Valide les inputs
     │ - Appelle ConversationService.addMessage()
     │ - Appelle MistralService.streamComplete()
     │ - Renvoie la réponse SSE
     ▼
[MistralService.ts]
     │ - Applique sliding window
     │ - Appelle l'API avec retry
     │ - Yield les chunks
     ▼
[Mistral API]
```

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

| Pattern                  | Où                   | Pourquoi                               |
| ------------------------ | -------------------- | -------------------------------------- |
| **Singleton**            | MistralService       | Une seule instance, config partagée    |
| **Dependency Injection** | ConversationService  | Testabilité (injecter mock Prisma)     |
| **AsyncIterator**        | streamComplete()     | Traiter les données au fur et à mesure |
| **Exponential Backoff**  | withRetry()          | Résilience aux erreurs API             |
| **Sliding Window**       | applySlidingWindow() | Gérer les limites de contexte          |
| **RAG**                  | DocumentService      | Enrichir le LLM avec des docs privés   |

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

# Logs Docker
docker compose logs app --tail=20
docker compose logs frontend --tail=20

# Activer pgvector
docker compose exec postgres psql -U postgres -d ia_chat -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Voir les documents indexés
docker compose exec postgres psql -U postgres -d ia_chat -c "SELECT id, LEFT(content, 50) FROM documents;"
```

---

## 📝 Checklist de révision

### Architecture & Patterns

- [ ] Je sais expliquer l'architecture MVC
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

### Embeddings & RAG

- [ ] Je comprends ce qu'est un embedding (texte → vecteur)
- [ ] Je sais générer un embedding avec `mistral-embed`
- [ ] Je comprends la distance cosinus et comment l'interpréter
- [ ] Je sais stocker des vecteurs avec pgvector
- [ ] Je peux implémenter une recherche sémantique
- [ ] Je comprends le concept de RAG et son utilité
- [ ] Je sais pourquoi le chunking est important pour les longs documents

---

_Document mis à jour le 17/12/2024_
