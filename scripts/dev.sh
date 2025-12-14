#!/bin/bash

echo "🚀 Script de développement pour le monorepo Node.js + Vue 3"
echo ""

# Fonction pour afficher l'aide
show_help() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Affiche cette aide"
    echo "  -b, --backend  Démarre uniquement le backend"
    echo "  -f, --frontend Démarre uniquement le frontend"
    echo "  -a, --all      Démarre backend + frontend (défaut)"
    echo "  -d, --docker   Démarre avec Docker"
    echo "  -i, --install  Installe les dépendances avant de démarrer"
    echo ""
    echo "Exemples:"
    echo "  $0              # Démarre backend + frontend"
    echo "  $0 -b           # Démarre uniquement le backend"
    echo "  $0 -f           # Démarre uniquement le frontend"
    echo "  $0 -d           # Démarre avec Docker"
    echo "  $0 -i -a        # Installe puis démarre tout"
}

# Variables par défaut
START_BACKEND=true
START_FRONTEND=true
USE_DOCKER=false
INSTALL_DEPS=false

# Parsing des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -b|--backend)
            START_BACKEND=true
            START_FRONTEND=false
            shift
            ;;
        -f|--frontend)
            START_BACKEND=false
            START_FRONTEND=true
            shift
            ;;
        -a|--all)
            START_BACKEND=true
            START_FRONTEND=true
            shift
            ;;
        -d|--docker)
            USE_DOCKER=true
            shift
            ;;
        -i|--install)
            INSTALL_DEPS=true
            shift
            ;;
        *)
            echo "Option inconnue: $1"
            show_help
            exit 1
            ;;
    esac
done

# Installation des dépendances si demandé
if [ "$INSTALL_DEPS" = true ]; then
    echo "📦 Installation des dépendances..."
    pnpm install
    echo ""
fi

# Démarrage avec Docker
if [ "$USE_DOCKER" = true ]; then
    echo "🐳 Démarrage avec Docker..."
    docker-compose up
    exit 0
fi

# Démarrage des services
echo "🚀 Démarrage des services..."

if [ "$START_BACKEND" = true ] && [ "$START_FRONTEND" = true ]; then
    echo "🔧 Backend + 🎨 Frontend"
    pnpm dev
elif [ "$START_BACKEND" = true ]; then
    echo "🔧 Backend uniquement"
    pnpm dev:backend
elif [ "$START_FRONTEND" = true ]; then
    echo "🎨 Frontend uniquement"
    pnpm dev:frontend
fi 