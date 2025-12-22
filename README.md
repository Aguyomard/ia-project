# 🤖 Assistant IA avec RAG + Hybrid Search

Un chatbot intelligent utilisant **Mistral AI** et le **RAG (Retrieval Augmented Generation)** avec **Reranking** et **Hybrid Search** pour répondre aux questions en s'appuyant sur une base de documents.

## ✨ Fonctionnalités

- 💬 **Chat en temps réel** avec streaming des réponses (SSE)
- 📚 **RAG** : Enrichissement des réponses avec des documents pertinents
- ✏️ **Query Rewriting** : Reformulation automatique des requêtes via LLM
- 🔄 **Reranking** : Amélioration de la pertinence avec un cross-encoder
- 🔎 **Hybrid Search** : Combinaison recherche vectorielle + full-text (RRF)
- 🔍 **Recherche sémantique** par embeddings vectoriels (pgvector)
- 📄 **Gestion de documents** avec chunking automatique et overlap
- 🗂️ **Historique des conversations** persistant
- 🎨 **Interface moderne** Vue 3 avec toggles RAG/Rewrite/Rerank/Hybrid
- 📊 **Affichage des sources** utilisées pour chaque réponse
- ✅ **Validation Zod** des entrées API

## 🏗️ Architecture

```
ia-project/
├── src/                          # Backend Node.js (port 3000)
│   ├── application/
│   │   ├── ports/               # Interfaces (ports hexagonaux)
│   │   ├── services/            # Services métier
│   │   │   ├── chunking/        # Découpage de documents
│   │   │   ├── conversation/    # Gestion des conversations
│   │   │   ├── document/        # Gestion des documents
│   │   │   ├── queryRewriter/   # Reformulation de requêtes
│   │   │   └── rag/             # Service RAG + Reranking
│   │   └── usecases/            # Cas d'utilisation
│   │       ├── ai/              # Tests IA
│   │       ├── conversation/    # Créer, envoyer messages
│   │       └── document/        # CRUD documents
│   ├── domain/                  # Entités métier
│   │   ├── conversation/        # Conversation, Message
│   │   └── document/            # Document, Chunk
│   ├── infrastructure/          # Implémentations
│   │   ├── external/
│   │   │   ├── mistral/         # Client Mistral AI
│   │   │   └── rerank/          # Client Rerank (cross-encoder)
│   │   ├── http/                # API REST Express
│   │   │   └── schemas/         # Validation Zod
│   │   └── persistence/         # Repositories PostgreSQL
│   ├── migrations/              # Migrations SQL (pgvector)
│   ├── fixtures/                # Données de test
│   └── prisma/                  # Schéma base de données
├── rerank-service/              # Microservice Python (port 8001)
│   ├── main.py                  # FastAPI + CrossEncoder
│   ├── requirements.txt         # Dépendances Python
│   └── Dockerfile               # Image Docker
├── frontend/                    # Frontend Vue 3 (port 5173)
│   └── src/
│       ├── components/chat/     # Composants du chat
│       └── views/               # Pages (ChatBot, Documents)
├── docs/                        # Documentation
│   └── IA_REVISION.md           # Guide de révision IA
└── docker-compose.yml           # Orchestration (4 services)
```

### Services Docker

| Service  | Port | Description                         |
| -------- | ---- | ----------------------------------- |
| app      | 3000 | Backend Node.js/Express             |
| postgres | 5432 | PostgreSQL + pgvector               |
| rerank   | 8001 | Microservice Python (cross-encoder) |
| frontend | 5173 | Vue 3 (dev server)                  |

## 🚀 Installation

### Prérequis

- **Docker** et **Docker Compose**
- **Node.js** 18+ et **pnpm** 8+ (pour dev local)

### Démarrage rapide

```bash
# Cloner et démarrer
git clone <repo>
cd ia-project

# Configurer les variables d'environnement
cp env.example .env
# Ajouter votre clé MISTRAL_API_KEY dans .env

# Lancer tous les services (app, postgres, rerank, frontend)
docker-compose up -d

# Initialiser la base de données
docker compose exec app pnpm prisma:migrate:deploy
docker compose exec app pnpm migrate

# (Optionnel) Ajouter des documents de test
docker compose exec app pnpm seed
```

### Vérifier que tout fonctionne

```bash
# Vérifier les services
docker compose ps

# Vérifier le service de reranking
curl http://localhost:8001/health

# Tester le chat
curl -X POST http://localhost:3000/api/conversations \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 📱 Accès

| Service         | URL                   |
| --------------- | --------------------- |
| Frontend (Chat) | http://localhost:5173 |
| Backend API     | http://localhost:3000 |
| Rerank Service  | http://localhost:8001 |
| Debug Node.js   | http://localhost:9229 |

## 🔧 API Endpoints

### Conversations

```bash
# Créer une conversation
POST /api/conversations

# Envoyer un message (streaming SSE)
POST /api/chat/stream
# Body: { message, conversationId, useRAG?, useQueryRewrite?, useReranking?, useHybridSearch? }

# Récupérer les messages d'une conversation
GET /api/conversations/:id/messages
```

### Documents

```bash
# Lister les documents
GET /api/documents

# Ajouter un document (avec chunking automatique)
POST /api/documents/chunked
# Body: { title, content, chunkSize?: number, overlap?: number }

# Recherche sémantique
POST /api/documents/search
# Body: { query, limit?: number, maxDistance?: number }

# Supprimer un document
DELETE /api/documents/:id
```

### Rerank Service

```bash
# Vérifier la santé du service
GET http://localhost:8001/health

# Reranker des documents
POST http://localhost:8001/rerank
# Body: { query, documents: [{id, content}], top_k?: number }
```

## 🧠 Comment fonctionne le RAG + Reranking

### Pipeline complet

1. **Ingestion** : Les documents sont découpés en chunks avec overlap
2. **Embeddings** : Chaque chunk est vectorisé via Mistral Embeddings (1024 dims)
3. **Full-Text Index** : Chaque chunk est indexé pour recherche par mots-clés (tsvector)
4. **Stockage** : Les vecteurs et index sont stockés dans PostgreSQL + pgvector
5. **Query Rewriting** : La question est reformulée par le LLM pour optimiser la recherche
6. **Recherche** : Vector search OU Hybrid search (vector + keyword + RRF fusion)
7. **Reranking** : Cross-encoder re-score les candidats → Top 3
8. **Enrichissement** : Les chunks pertinents enrichissent le prompt système
9. **Génération** : Mistral génère une réponse contextuelle

```
Question utilisateur: "mdp wifi ?"
        │
        ▼
   [✏️ Query Rewriting - Mistral]
   "mdp wifi ?" → "Quel est le mot de passe du réseau WiFi ?"
        │
        ▼
   [Embedding Mistral]
        │
        ├──────────────────────────────────────────┐
        ▼                                          ▼
   [🔍 Vector Search]                    [🔎 Keyword Search]
   (pgvector cosinus)                    (PostgreSQL tsvector)
        │                                          │
        └────────────┬─────────────────────────────┘
                     ▼
              [RRF Fusion] (si Hybrid activé)
              10 candidats fusionnés
                     │
                     ▼
   [🔄 Reranking - Cross-encoder]
   bge-reranker-base re-score (query, doc)
   10 → Top 3
        │
        ▼
   [Prompt enrichi] System + Documents + Question
        │
        ▼
   [🤖 Mistral AI - mistral-small-latest]
        │
        ▼
   Réponse: "Le mot de passe WiFi est SecretWifi2024!"
   📚 Sources: WiFi (73%), Mot de passe (50%)
```

### Pourquoi le Query Rewriting ?

Le **Query Rewriting** optimise la recherche en reformulant les requêtes utilisateur :

| Requête originale     | Requête réécrite                            |
| --------------------- | ------------------------------------------- |
| "mdp wifi ?"          | "Quel est le mot de passe du réseau WiFi ?" |
| "horaires"            | "Quels sont les horaires d'ouverture ?"     |
| "ça marche comment ?" | "Comment fonctionne [sujet du contexte] ?"  |

**Avantages** :

- Développe les abréviations (mdp → mot de passe)
- Reformule les questions vagues
- Utilise le contexte de conversation pour les pronoms (ça, il, elle...)

### Pourquoi le Reranking ?

| Étape            | Modèle        | Vitesse   | Précision |
| ---------------- | ------------- | --------- | --------- |
| Recherche vector | Bi-encoder    | ⚡ Rapide | Moyenne   |
| Reranking        | Cross-encoder | 🐢 Lent   | Élevée    |

- **Bi-encoder** : Encode query et documents séparément, rapide mais moins précis
- **Cross-encoder** : Encode (query, doc) ensemble, lent mais très précis

Le reranking combine les deux : recherche rapide puis re-scoring précis.

### Pourquoi le Hybrid Search ?

La recherche vectorielle peut rater les **termes exacts** comme les codes produits ou noms propres :

| Type de requête | Vector seul  | Hybrid       |
| --------------- | ------------ | ------------ |
| Sens/Synonymes  | ✅ Excellent | ✅ Excellent |
| Codes (XR-7500) | ❌ Faible    | ✅ Excellent |
| Noms propres    | ❌ Faible    | ✅ Excellent |
| Acronymes       | ⚠️ Variable  | ✅ Excellent |

**Hybrid Search** combine :

- **Recherche vectorielle** : Trouve les documents sémantiquement similaires
- **Recherche full-text** : Trouve les correspondances exactes de mots-clés
- **Fusion RRF** : Combine les deux rankings sans biais de score

## 🧪 Tests

Le backend utilise **Vitest** pour les tests unitaires.

```bash
# Lancer les tests
docker compose exec app pnpm --filter backend test

# Mode watch
docker compose exec app pnpm --filter backend test:watch

# Avec couverture
docker compose exec app pnpm --filter backend test:coverage
```

### Tests disponibles (90 tests)

- **Document UseCases** : CRUD documents, chunking, recherche
- **Conversation UseCases** : Création, envoi de messages, streaming
- **AI UseCases** : Tests d'intégration Mistral
- **Services** : ChunkingService

## 📦 Scripts

### Monorepo (racine)

```bash
pnpm dev              # Démarre backend + frontend
pnpm build            # Build tous les packages
pnpm test             # Lance les tests backend
pnpm lint             # Lint tous les packages
```

### Backend (`src/`)

```bash
pnpm dev              # Serveur dev avec hot-reload
pnpm test             # Tests Vitest
pnpm test:coverage    # Tests avec couverture
pnpm seed             # Injecter des documents de test
pnpm migrate          # Migrations SQL
```

### Frontend (`frontend/`)

```bash
pnpm dev              # Serveur Vite
pnpm build            # Build production
```

## 🛠️ Technologies

### Backend (Node.js)

| Technologie       | Usage                            |
| ----------------- | -------------------------------- |
| Node.js + Express | Serveur API REST                 |
| TypeScript        | Typage statique                  |
| Mistral AI        | LLM (mistral-small) + Embeddings |
| PostgreSQL        | Base de données                  |
| pgvector          | Extension vecteurs + similarité  |
| Prisma            | ORM                              |
| Zod               | Validation des entrées API       |
| Vitest            | Tests unitaires                  |

### Rerank Service (Python)

| Technologie           | Usage                       |
| --------------------- | --------------------------- |
| FastAPI               | API REST Python             |
| Sentence Transformers | Chargement du cross-encoder |
| bge-reranker-base     | Modèle de reranking         |
| PyTorch               | Backend deep learning       |

### Frontend (Vue 3)

| Technologie | Usage                  |
| ----------- | ---------------------- |
| Vue 3       | Framework UI           |
| TypeScript  | Typage statique        |
| Vite        | Build tool             |
| SSE         | Streaming des réponses |

## 📄 Variables d'environnement

```env
# Mistral AI (obligatoire)
MISTRAL_API_KEY=votre_clé_api

# Base de données
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ia_chat

# Rerank Service (optionnel - fallback vers vector search si absent)
RERANK_SERVICE_URL=http://rerank:8001

# Optionnel
NODE_ENV=development
PORT=3000
```

## 🎛️ Options du Chat

L'interface de chat propose quatre toggles :

| Option      | Icône | Description                                      |
| ----------- | ----- | ------------------------------------------------ |
| **RAG**     | 📚    | Active la recherche dans la base de documents    |
| **Rewrite** | ✏️    | Reformule la requête pour optimiser la recherche |
| **Rerank**  | 🔄    | Active le reranking pour améliorer la pertinence |
| **Hybrid**  | 🔎    | Combine recherche vectorielle + mots-clés (RRF)  |

```
┌──────────────────────────────────────────────────────────┐
│  ☑ 📚 RAG   ☑ ✏️ Rewrite   ☑ 🔄 Rerank   ☑ 🔎 Hybrid   │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Écris ton message...                               │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

- **RAG désactivé** : Le chatbot utilise uniquement ses connaissances générales
- **RAG seul** : Recherche vectorielle simple (rapide)
- **RAG + Rewrite** : Reformulation + recherche vectorielle
- **RAG + Rewrite + Rerank** : Pipeline complet (plus précis)
- **RAG + Hybrid** : Combine vector + keywords (idéal pour codes produits, noms propres)

## 🤝 Contribution

1. Installer les dépendances : `pnpm install`
2. Lancer les tests : `pnpm test`
3. Vérifier le lint : `pnpm lint`
4. Vérifier les types : `pnpm type-check`

## 📚 Documentation

- [Guide de révision IA](docs/IA_REVISION.md) - Concepts et implémentations détaillés

## 📝 License

ISC
