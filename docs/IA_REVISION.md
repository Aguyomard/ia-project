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
7. [Architecture MVC](#7-architecture-mvc)
8. [Frontend Vue.js](#8-frontend-vuejs)
9. [Concepts clés à retenir](#9-concepts-clés-à-retenir)

---

## 1. Architecture globale

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vue.js)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  ChatBot    │  │  Components │  │  Vue Router             │  │
│  │  View       │  │  (Input,    │  │  /chatbot               │  │
│  │             │  │   Messages) │  │                         │  │
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
│  │  POST /api/chat/stream   GET  /api/conversations          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     CONTROLLERS                           │   │
│  │  conversationController.ts    aiController.ts             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                       SERVICES                            │   │
│  │  ┌─────────────────┐    ┌─────────────────────────────┐  │   │
│  │  │ MistralService  │    │ ConversationService         │  │   │
│  │  │ - chat()        │    │ - create()                  │  │   │
│  │  │ - complete()    │    │ - addMessage()              │  │   │
│  │  │ - streamComplete│    │ - getChatHistory()          │  │   │
│  │  │ - chatJSON()    │    │                             │  │   │
│  │  └─────────────────┘    └─────────────────────────────┘  │   │
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
│   (via SDK officiel)    │    │   (via Prisma ORM)      │
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

## 7. Architecture MVC

### 7.1 Structure des fichiers

```
src/
├── routes/
│   ├── index.ts              # Agrège toutes les routes
│   └── conversationRoutes.ts # Routes /conversations, /chat
├── controllers/
│   └── conversationController.ts  # Logique HTTP
├── services/
│   ├── mistral/
│   │   ├── MistralService.ts # Logique IA
│   │   ├── types.ts          # Interfaces
│   │   ├── errors.ts         # Erreurs custom
│   │   └── index.ts          # Exports
│   └── conversation/
│       └── ConversationService.ts  # Logique DB
├── utils/
│   ├── retry.ts              # Exponential backoff
│   └── tokenizer.ts          # Sliding window
└── server.ts                 # Point d'entrée
```

### 7.2 Responsabilités

| Couche      | Responsabilité                            |
| ----------- | ----------------------------------------- |
| Routes      | Définir les endpoints                     |
| Controllers | Gérer HTTP (req/res), valider, orchestrer |
| Services    | Logique métier (IA, DB)                   |
| Utils       | Fonctions réutilisables                   |

### 7.3 Flux d'une requête

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

## 8. Frontend Vue.js

### 8.1 Composants

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

### 8.2 Gestion du streaming

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

## 9. Concepts clés à retenir

### 9.1 Patterns

| Pattern                  | Où                   | Pourquoi                               |
| ------------------------ | -------------------- | -------------------------------------- |
| **Singleton**            | MistralService       | Une seule instance, config partagée    |
| **Dependency Injection** | ConversationService  | Testabilité (injecter mock Prisma)     |
| **AsyncIterator**        | streamComplete()     | Traiter les données au fur et à mesure |
| **Exponential Backoff**  | withRetry()          | Résilience aux erreurs API             |
| **Sliding Window**       | applySlidingWindow() | Gérer les limites de contexte          |

### 9.2 Bonnes pratiques

1. **Séparation des responsabilités** : Routes → Controllers → Services
2. **Typage fort** : Interfaces TypeScript partout
3. **Gestion des erreurs** : Classes d'erreurs custom
4. **Configuration** : Variables d'environnement, pas de hardcode
5. **Logging** : Console.log pour debug, avec préfixes `[ServiceName]`

### 9.3 Points de vigilance

| Problème               | Solution                       |
| ---------------------- | ------------------------------ |
| Rate limiting (429)    | Retry avec exponential backoff |
| Context overflow (400) | Sliding window                 |
| Latence UX             | Streaming SSE                  |
| Perte de contexte      | Persistance PostgreSQL         |
| Erreurs silencieuses   | Classes d'erreurs typées       |

### 9.4 Commandes utiles

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
```

---

## 📝 Checklist de révision

- [ ] Je sais expliquer l'architecture MVC
- [ ] Je comprends le pattern Singleton
- [ ] Je sais implémenter un retry avec exponential backoff
- [ ] Je comprends pourquoi le jitter est important
- [ ] Je sais ce qu'est une sliding window et pourquoi c'est nécessaire
- [ ] Je peux expliquer le flux SSE (Server-Sent Events)
- [ ] Je comprends les AsyncIterables (`async *` et `yield`)
- [ ] Je sais créer un schéma Prisma
- [ ] Je comprends les transactions et niveaux d'isolation
- [ ] Je peux consommer un stream côté frontend

---

_Document généré le 15/12/2024_
