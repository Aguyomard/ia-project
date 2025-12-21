# 🤖 Assistant IA avec RAG

Un chatbot intelligent utilisant **Mistral AI** et le **RAG (Retrieval Augmented Generation)** pour répondre aux questions en s'appuyant sur une base de documents.

## ✨ Fonctionnalités

- 💬 **Chat en temps réel** avec streaming des réponses
- 📚 **RAG** : Enrichissement des réponses avec des documents pertinents
- 🔍 **Recherche sémantique** par embeddings vectoriels
- 📄 **Gestion de documents** avec chunking automatique
- 🗂️ **Historique des conversations** persistant
- 🎨 **Interface moderne** Vue 3

## 🏗️ Architecture

```
ia-project/
├── src/                          # Backend Node.js
│   ├── application/
│   │   ├── ports/               # Interfaces (ports hexagonaux)
│   │   ├── services/            # Services métier
│   │   │   ├── chunking/        # Découpage de documents
│   │   │   ├── conversation/    # Gestion des conversations
│   │   │   ├── document/        # Gestion des documents
│   │   │   └── rag/             # Service RAG
│   │   └── usecases/            # Cas d'utilisation
│   │       ├── ai/              # Tests IA
│   │       ├── conversation/    # Créer, envoyer messages
│   │       └── document/        # CRUD documents
│   ├── domain/                  # Entités métier
│   │   ├── conversation/        # Conversation, Message
│   │   └── document/            # Document, Chunk
│   ├── infrastructure/          # Implémentations
│   │   ├── external/mistral/    # Client Mistral AI
│   │   ├── http/                # API REST Express
│   │   └── persistence/         # Repositories PostgreSQL
│   └── prisma/                  # Schéma base de données
├── frontend/                    # Frontend Vue 3
│   └── src/
│       ├── components/chat/     # Composants du chat
│       └── views/               # Pages (ChatBot, Documents)
└── docker-compose.yml           # Orchestration
```

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

# Lancer avec Docker
docker-compose up -d

# Initialiser la base de données
docker compose exec app pnpm --filter backend prisma:migrate:deploy
docker compose exec app pnpm --filter backend migrate
```

## 📱 Accès

| Service         | URL                   |
| --------------- | --------------------- |
| Frontend (Chat) | http://localhost:5173 |
| Backend API     | http://localhost:3000 |
| Debug Node.js   | http://localhost:9229 |

## 🔧 API Endpoints

### Conversations

```bash
# Créer une conversation
POST /api/conversations

# Envoyer un message (streaming SSE)
POST /api/conversations/:id/messages/stream

# Récupérer une conversation
GET /api/conversations/:id
```

### Documents

```bash
# Lister les documents
GET /api/documents

# Ajouter un document (avec chunking automatique)
POST /api/documents

# Rechercher dans les documents
GET /api/documents/search?query=...
```

## 🧠 Comment fonctionne le RAG

1. **Ingestion** : Les documents sont découpés en chunks avec overlap
2. **Embeddings** : Chaque chunk est vectorisé via Mistral Embeddings
3. **Stockage** : Les vecteurs sont stockés dans PostgreSQL
4. **Recherche** : Les questions utilisateur sont vectorisées et comparées
5. **Enrichissement** : Les chunks pertinents enrichissent le prompt système
6. **Génération** : Mistral génère une réponse contextuelle

```
Question utilisateur
        ↓
   [Embedding]
        ↓
   [Recherche vectorielle] → Documents pertinents
        ↓
   [Prompt enrichi] = System prompt + Documents + Question
        ↓
   [Mistral AI]
        ↓
   Réponse contextuelle
```

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

### Tests disponibles (61 tests)

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

### Backend

| Technologie       | Usage                      |
| ----------------- | -------------------------- |
| Node.js + Express | Serveur API                |
| TypeScript        | Typage statique            |
| Mistral AI        | LLM + Embeddings           |
| PostgreSQL        | Base de données + Vecteurs |
| Prisma            | ORM                        |
| Vitest            | Tests unitaires            |

### Frontend

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

# Optionnel
NODE_ENV=development
PORT=3000
```

## 🤝 Contribution

1. Installer les dépendances : `pnpm install`
2. Lancer les tests : `pnpm test`
3. Vérifier le lint : `pnpm lint`
4. Vérifier les types : `pnpm type-check`

## 📝 License

ISC
