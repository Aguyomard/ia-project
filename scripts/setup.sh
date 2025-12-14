#!/bin/bash

echo "🚀 Configuration du monorepo Node.js + Vue 3 avec pnpm..."

# Vérifier que pnpm est installé
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm n'est pas installé. Installation..."
    npm install -g pnpm
else
    echo "✅ pnpm est déjà installé"
fi

# Vérifier la version de Node.js
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ est requis. Version actuelle: $(node --version)"
    exit 1
else
    echo "✅ Node.js version: $(node --version)"
fi

# Installer les dépendances
echo "📦 Installation des dépendances..."
pnpm install

echo "✅ Installation terminée !"
echo ""
echo "🚀 Pour démarrer le projet:"
echo "  pnpm dev          # Backend + Frontend"
echo "  pnpm dev:backend  # Backend uniquement"
echo "  pnpm dev:frontend # Frontend uniquement"
echo ""
echo "🐳 Avec Docker:"
echo "  docker-compose up"
echo ""
echo "📱 Accès:"
echo "  Backend:  http://localhost:3000"
echo "  Frontend: http://localhost:5173" 