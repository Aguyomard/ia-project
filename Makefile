.PHONY: help install dev build clean docker-up docker-down docker-build

help: ## Affiche cette aide
	@echo "🚀 Commandes disponibles:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Installe toutes les dépendances
	@echo "📦 Installation des dépendances..."
	pnpm install

dev: ## Démarre backend + frontend en mode développement
	@echo "🚀 Démarrage du développement..."
	pnpm dev

dev-backend: ## Démarre uniquement le backend
	@echo "🔧 Démarrage du backend..."
	pnpm dev:backend

dev-frontend: ## Démarre uniquement le frontend
	@echo "🎨 Démarrage du frontend..."
	pnpm dev:frontend

build: ## Build tous les packages
	@echo "🏗️ Build en cours..."
	pnpm build

build-backend: ## Build uniquement le backend
	@echo "🔧 Build du backend..."
	pnpm build:backend

build-frontend: ## Build uniquement le frontend
	@echo "🎨 Build du frontend..."
	pnpm build:frontend

lint: ## Lance le linting sur tous les packages
	@echo "🔍 Vérification du code..."
	pnpm lint

lint-fix: ## Corrige automatiquement les erreurs de linting
	@echo "🔧 Correction automatique..."
	pnpm lint-fix

type-check: ## Vérifie les types TypeScript
	@echo "📝 Vérification des types..."
	pnpm type-check

test: ## Lance les tests
	@echo "🧪 Lancement des tests..."
	pnpm test

test-watch: ## Lance les tests en mode watch
	@echo "🧪 Tests en mode watch..."
	pnpm test:watch

clean: ## Nettoie tous les packages
	@echo "🧹 Nettoyage..."
	pnpm clean

docker-up: ## Démarre les services Docker
	@echo "🐳 Démarrage des services Docker..."
	docker-compose up -d

docker-down: ## Arrête les services Docker
	@echo "🐳 Arrêt des services Docker..."
	docker-compose down

docker-build: ## Build les images Docker
	@echo "🐳 Build des images Docker..."
	docker-compose build

docker-logs: ## Affiche les logs Docker
	@echo "🐳 Affichage des logs..."
	docker-compose logs -f

setup: ## Configuration initiale du projet
	@echo "⚙️ Configuration initiale..."
	./scripts/setup.sh

format: ## Formate le code avec Prettier
	@echo "✨ Formatage du code..."
	pnpm format-fix

all: install dev ## Installation + démarrage complet 