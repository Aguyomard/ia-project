# 🚀 Projet Node.js + Vue 3 Monorepo

Ce projet utilise **pnpm** comme gestionnaire de paquets pour organiser un monorepo contenant un backend Node.js et un frontend Vue 3.

## 🏗️ Structure du projet

```
nodejs-project/
├── src/                    # Backend Node.js
│   ├── package.json       # Dépendances backend
│   ├── server.ts          # Serveur Express
│   └── ...                # Autres fichiers backend
├── frontend/              # Frontend Vue 3
│   ├── package.json       # Dépendances frontend
│   ├── src/               # Code source Vue
│   └── ...                # Autres fichiers frontend
├── package.json           # Configuration racine
├── pnpm-workspace.yaml    # Configuration workspace pnpm
└── docker-compose.yml     # Orchestration Docker
```

## 🛠️ Prérequis

- **Node.js** 18+
- **pnpm** 8+ (installer avec `npm install -g pnpm`)

## 🚀 Installation et démarrage

### 1. Installation des dépendances

```bash
# Installer toutes les dépendances du monorepo
pnpm install:all

# Ou simplement
pnpm install
```

### 2. Démarrage des services

```bash
# Démarrer backend + frontend en parallèle
pnpm dev

# Démarrer uniquement le backend
pnpm dev:backend

# Démarrer uniquement le frontend
pnpm dev:frontend
```

### 3. Avec Docker

```bash
# Démarrer tous les services
docker-compose up

# Démarrer en arrière-plan
docker-compose up -d
```

## 📱 Accès aux services

- **Backend**: http://localhost:3000
- **Frontend**: http://localhost:5173
- **Debug Backend**: http://localhost:9229

## 🧹 Scripts disponibles

### Scripts racine (monorepo)

- `pnpm dev` - Démarre backend + frontend en parallèle
- `pnpm build` - Build tous les packages
- `pnpm lint` - Lint tous les packages
- `pnpm test` - Lance les tests du backend
- `pnpm clean` - Nettoie tous les packages

### Scripts backend (`src/`)

- `pnpm dev` - Serveur de développement avec nodemon
- `pnpm build` - Compilation TypeScript
- `pnpm start` - Serveur de production

### Scripts frontend (`frontend/`)

- `pnpm dev` - Serveur de développement Vite
- `pnpm build` - Build de production
- `pnpm preview` - Prévisualisation du build

## 🔧 Configuration pnpm

Le projet utilise les options pnpm suivantes dans `.npmrc` :

- `shamefully-hoist=true` - Compatibilité avec certains packages
- `strict-peer-dependencies=false` - Gestion flexible des peer dependencies
- `auto-install-peers=true` - Installation automatique des peers
- `prefer-frozen-lockfile=true` - Utilisation du lockfile pour la cohérence

## 🐳 Docker

### Backend

- Port: 3000 (API) + 9229 (debug)
- Hot-reload avec nodemon
- Support TypeScript avec tsx

### Frontend

- Port: 5173
- Hot-reload avec Vite
- Build optimisé pour la production

## 📚 Technologies utilisées

### Backend

- **Node.js** + **Express**
- **TypeScript**
- **GraphQL** (GraphQL Yoga)
- **Prisma** (ORM)
- **PostgreSQL**

### Frontend

- **Vue 3** (Composition API)
- **TypeScript**
- **Vite** (build tool)
- **CSS3** (variables CSS, responsive)

## 🚀 Déploiement

```bash
# Build de production
pnpm build

# Démarrage production
pnpm start
```

## 🤝 Contribution

1. Installer les dépendances : `pnpm install`
2. Lancer les tests : `pnpm test`
3. Vérifier le code : `pnpm lint`
4. Vérifier les types : `pnpm type-check`
