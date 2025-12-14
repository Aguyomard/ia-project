#!/bin/bash

echo "🔍 Vérification de l'environnement de développement..."
echo ""

# Vérifier Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js: $NODE_VERSION"
    
    # Vérifier la version minimale
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_MAJOR" -lt 18 ]; then
        echo "❌ Node.js 18+ requis (version actuelle: $NODE_VERSION)"
        exit 1
    fi
else
    echo "❌ Node.js n'est pas installé"
    exit 1
fi

# Vérifier pnpm
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm --version)
    echo "✅ pnpm: $PNPM_VERSION"
    
    # Vérifier la version minimale
    PNPM_MAJOR=$(echo $PNPM_VERSION | cut -d'.' -f1)
    if [ "$PNPM_MAJOR" -lt 8 ]; then
        echo "❌ pnpm 8+ requis (version actuelle: $PNPM_VERSION)"
        exit 1
    fi
else
    echo "❌ pnpm n'est pas installé"
    echo "💡 Installation: npm install -g pnpm"
    exit 1
fi

# Vérifier Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo "✅ Docker: $DOCKER_VERSION"
else
    echo "⚠️  Docker n'est pas installé (optionnel pour le développement local)"
fi

# Vérifier Docker Compose
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version)
    echo "✅ Docker Compose: $COMPOSE_VERSION"
else
    echo "⚠️  Docker Compose n'est pas installé (optionnel pour le développement local)"
fi

# Vérifier les fichiers de configuration
echo ""
echo "📁 Vérification des fichiers de configuration..."

if [ -f "package.json" ]; then
    echo "✅ package.json"
else
    echo "❌ package.json manquant"
    exit 1
fi

if [ -f "pnpm-workspace.yaml" ]; then
    echo "✅ pnpm-workspace.yaml"
else
    echo "❌ pnpm-workspace.yaml manquant"
    exit 1
fi

if [ -d "src" ]; then
    echo "✅ Dossier backend (src/)"
else
    echo "❌ Dossier backend (src/) manquant"
    exit 1
fi

if [ -d "frontend" ]; then
    echo "✅ Dossier frontend"
else
    echo "❌ Dossier frontend manquant"
    exit 1
fi

if [ -f "docker-compose.yml" ]; then
    echo "✅ docker-compose.yml"
else
    echo "❌ docker-compose.yml manquant"
    exit 1
fi

echo ""
echo "🎉 Environnement vérifié avec succès !"
echo ""
echo "🚀 Pour démarrer le projet:"
echo "  ./scripts/dev.sh        # Script de développement"
echo "  make dev               # Avec Makefile"
echo "  pnpm dev               # Directement avec pnpm"
echo ""
echo "📚 Documentation: README.md" 