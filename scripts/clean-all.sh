#!/bin/bash

echo "🧹 Nettoyage complet du monorepo Node.js + Vue 3"
echo "================================================"
echo ""

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher des messages colorés
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Demander confirmation
echo "⚠️  ATTENTION: Ce script va supprimer:"
echo "   - Tous les node_modules"
echo "   - Tous les dossiers dist/build"
echo "   - Tous les fichiers de cache"
echo "   - Tous les logs"
echo ""
read -p "Êtes-vous sûr de vouloir continuer ? (y/N): " confirm

if [[ ! $confirm =~ ^[Yy]$ ]]; then
    print_warning "Nettoyage annulé"
    exit 0
fi

echo ""

# Arrêter les services Docker s'ils tournent
print_status "Arrêt des services Docker..."
if command -v docker-compose &> /dev/null; then
    docker-compose down > /dev/null 2>&1
    print_success "Services Docker arrêtés"
fi

# Nettoyer les dossiers de build
print_status "Suppression des dossiers de build..."

# Backend
if [ -d "src/dist" ]; then
    rm -rf src/dist
    print_success "Dossier src/dist supprimé"
fi

if [ -d "src/coverage" ]; then
    rm -rf src/coverage
    print_success "Dossier src/coverage supprimé"
fi

# Frontend
if [ -d "frontend/dist" ]; then
    rm -rf frontend/dist
    print_success "Dossier frontend/dist supprimé"
fi

if [ -d "frontend/node_modules/.vite" ]; then
    rm -rf frontend/node_modules/.vite
    print_success "Cache Vite supprimé"
fi

# Nettoyer les node_modules
print_status "Suppression des node_modules..."

if [ -d "node_modules" ]; then
    rm -rf node_modules
    print_success "node_modules racine supprimé"
fi

if [ -d "src/node_modules" ]; then
    rm -rf src/node_modules
    print_success "node_modules backend supprimé"
fi

if [ -d "frontend/node_modules" ]; then
    rm -rf frontend/node_modules
    print_success "node_modules frontend supprimé"
fi

# Nettoyer les caches pnpm
print_status "Nettoyage des caches pnpm..."
if [ -d ".pnpm-store" ]; then
    rm -rf .pnpm-store
    print_success "Cache pnpm supprimé"
fi

# Nettoyer les logs
print_status "Suppression des logs..."
find . -name "*.log" -type f -delete 2>/dev/null
print_success "Logs supprimés"

# Nettoyer les fichiers temporaires
print_status "Suppression des fichiers temporaires..."
find . -name "*.tmp" -type f -delete 2>/dev/null
find . -name "*.temp" -type f -delete 2>/dev/null
print_success "Fichiers temporaires supprimés"

# Nettoyer les caches TypeScript
print_status "Nettoyage des caches TypeScript..."
find . -name "*.tsbuildinfo" -type f -delete 2>/dev/null
print_success "Cache TypeScript supprimé"

echo ""
print_success "🧹 Nettoyage terminé avec succès !"
echo ""
echo "📋 Pour réinstaller et redémarrer:"
echo "  ./scripts/quick-start.sh    # Démarrage rapide"
echo "  pnpm install                # Installation des dépendances"
echo "  pnpm dev                    # Démarrage du développement"
echo ""
print_status "Le projet est maintenant propre ! 🎉" 