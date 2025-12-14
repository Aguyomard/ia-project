# 📜 Scripts de développement

Ce dossier contient tous les scripts utiles pour le développement du monorepo Node.js + Vue 3.

## 🚀 Scripts principaux

### `setup.sh` - Configuration initiale

Configuration automatique de l'environnement de développement.

```bash
./scripts/setup.sh
```

**Fonctionnalités:**

- Vérification de Node.js et pnpm
- Installation des dépendances
- Configuration de l'environnement

### `quick-start.sh` - Démarrage rapide

Script interactif pour démarrer rapidement le projet.

```bash
./scripts/quick-start.sh
```

**Fonctionnalités:**

- Vérification de l'environnement
- Installation des dépendances
- Choix entre développement local et Docker
- Démarrage automatique optionnel

### `dev.sh` - Script de développement

Script flexible pour démarrer les services de développement.

```bash
./scripts/dev.sh [OPTIONS]
```

**Options:**

- `-h, --help` - Affiche l'aide
- `-b, --backend` - Démarre uniquement le backend
- `-f, --frontend` - Démarre uniquement le frontend
- `-a, --all` - Démarre backend + frontend (défaut)
- `-d, --docker` - Démarre avec Docker
- `-i, --install` - Installe les dépendances avant de démarrer

**Exemples:**

```bash
./scripts/dev.sh              # Backend + Frontend
./scripts/dev.sh -b           # Backend uniquement
./scripts/dev.sh -f           # Frontend uniquement
./scripts/dev.sh -d           # Avec Docker
./scripts/dev.sh -i -a        # Installation + démarrage
```

## 🧹 Scripts de maintenance

### `clean-all.sh` - Nettoyage complet

Nettoie complètement le projet (node_modules, dist, cache, etc.).

```bash
./scripts/clean-all.sh
```

**⚠️ ATTENTION:** Ce script supprime tous les fichiers générés et dépendances.

### `check-env.sh` - Vérification de l'environnement

Vérifie que l'environnement de développement est correctement configuré.

```bash
./scripts/check-env.sh
```

**Vérifications:**

- Node.js 18+
- pnpm 8+
- Docker (optionnel)
- Fichiers de configuration

## 🏥 Scripts de monitoring

### `health-check.sh` - Vérification de la santé des services

Vérifie l'état et l'accessibilité de tous les services.

```bash
./scripts/health-check.sh
```

**Vérifications:**

- Processus locaux (backend/frontend)
- Services Docker
- Ports en écoute
- Accessibilité HTTP
- Résumé de l'état des services

## 🔄 Scripts de gestion des dépendances

### `update-deps.sh` - Mise à jour des dépendances

Met à jour toutes les dépendances du monorepo de manière interactive.

```bash
./scripts/update-deps.sh
```

**Fonctionnalités:**

- Vérification des mises à jour disponibles
- Mise à jour interactive par package
- Sauvegarde automatique du lockfile
- Vérification des vulnérabilités
- Nettoyage des caches

## 💾 Scripts de sauvegarde et restauration

### `backup.sh` - Sauvegarde du projet

Crée une sauvegarde complète du projet.

```bash
./scripts/backup.sh
```

**Types de sauvegarde:**

1. **Complète** - Avec toutes les dépendances
2. **Légère** - Sans les dépendances (recommandée)
3. **Incrémentale** - Seulement les changements
4. **Production** - Optimisée pour la production

**Fonctionnalités:**

- Sauvegarde automatique avec horodatage
- Création d'archives compressées
- Fichier d'information détaillé
- Gestion des sauvegardes multiples

### `restore.sh` - Restauration d'une sauvegarde

Restaure le projet à partir d'une sauvegarde.

```bash
./scripts/restore.sh
```

**Fonctionnalités:**

- Liste interactive des sauvegardes disponibles
- Sauvegarde automatique de l'état actuel
- Restauration complète du projet
- Vérification de l'intégrité
- Installation automatique des dépendances

## 🔧 Utilisation avec Makefile

Tous les scripts sont également accessibles via le Makefile racine :

```bash
make help           # Affiche l'aide
make setup          # Configuration initiale
make dev            # Démarrage du développement
make clean          # Nettoyage
make docker-up      # Démarrage Docker
make docker-down    # Arrêt Docker
```

## 🐳 Utilisation avec Docker

Pour utiliser les services avec Docker :

```bash
# Démarrage
docker-compose up -d

# Arrêt
docker-compose down

# Logs
docker-compose logs -f

# Build
docker-compose build
```

## 📋 Scripts pnpm

Le projet utilise pnpm avec des scripts de monorepo :

```bash
# Démarrage
pnpm dev              # Backend + Frontend
pnpm dev:backend      # Backend uniquement
pnpm dev:frontend     # Frontend uniquement

# Build
pnpm build            # Tous les packages
pnpm build:backend    # Backend uniquement
pnpm build:frontend   # Frontend uniquement

# Linting et tests
pnpm lint             # Lint tous les packages
pnpm type-check       # Vérification des types
pnpm test             # Tests du backend
```

## 🎯 Workflow recommandé

### 1. Première installation

```bash
./scripts/setup.sh
```

### 2. Démarrage quotidien

```bash
./scripts/dev.sh
```

### 3. Vérification de la santé

```bash
./scripts/health-check.sh
```

### 4. Mise à jour des dépendances (mensuel)

```bash
./scripts/update-deps.sh
```

### 5. Sauvegarde (hebdomadaire)

```bash
./scripts/backup.sh
```

### 6. Nettoyage (si nécessaire)

```bash
./scripts/clean-all.sh
./scripts/quick-start.sh
```

## 🔍 Dépannage

### Problèmes courants

**Erreur de dépendances:**

```bash
./scripts/clean-all.sh
./scripts/setup.sh
```

**Services non accessibles:**

```bash
./scripts/health-check.sh
```

**Problèmes Docker:**

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

**Dépendances obsolètes:**

```bash
./scripts/update-deps.sh
```

**Restauration d'une version précédente:**

```bash
./scripts/restore.sh
```

### Logs utiles

```bash
# Logs Docker
docker-compose logs -f

# Logs backend
pnpm dev:backend

# Logs frontend
pnpm dev:frontend
```

## 📊 Gestion des sauvegardes

### Créer une sauvegarde

```bash
./scripts/backup.sh
```

### Lister les sauvegardes

```bash
ls -lh backups/
```

### Restaurer une sauvegarde

```bash
./scripts/restore.sh
```

### Nettoyer les anciennes sauvegardes

```bash
# Garder seulement les 5 dernières
ls -t backups/*.tar.gz | tail -n +6 | xargs rm -f
```

## 📚 Documentation

- **README principal:** `../README.md`
- **Configuration pnpm:** `../pnpm-workspace.yaml`
- **Docker:** `../docker-compose.yml`
- **Makefile:** `../Makefile`

## 🤝 Contribution

Pour ajouter de nouveaux scripts :

1. Créez le script dans ce dossier
2. Rendez-le exécutable : `chmod +x scripts/nom-du-script.sh`
3. Ajoutez-le au Makefile si nécessaire
4. Documentez-le dans ce README
5. Testez-le sur différents environnements

## 🔒 Sécurité

- Les scripts de sauvegarde et restauration demandent confirmation
- Les sauvegardes incluent des informations sur la restauration
- Les scripts vérifient l'environnement avant exécution
- Les opérations destructives sont clairement indiquées
