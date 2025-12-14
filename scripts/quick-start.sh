#!/bin/bash

echo "🚀 Démarrage rapide du monorepo Node.js + Vue 3"
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

# Vérifier l'environnement
print_status "Vérification de l'environnement..."
if ! ./scripts/check-env.sh > /dev/null 2>&1; then
    print_error "L'environnement n'est pas correctement configuré"
    print_status "Exécutez: ./scripts/check-env.sh"
    exit 1
fi
print_success "Environnement OK"

# Installation des dépendances
print_status "Installation des dépendances..."
if pnpm install; then
    print_success "Dépendances installées"
else
    print_error "Échec de l'installation des dépendances"
    exit 1
fi

# Vérifier si Docker est disponible
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    print_status "Docker détecté - Option disponible"
    echo ""
    echo "Choisissez votre méthode de démarrage:"
    echo "1) Développement local (recommandé pour le développement)"
    echo "2) Avec Docker (recommandé pour la production)"
    echo "3) Vérifier la santé des services"
    echo ""
    read -p "Votre choix (1, 2 ou 3): " choice
    
    case $choice in
        2)
            print_status "Démarrage avec Docker..."
            docker-compose up -d
            print_success "Services démarrés avec Docker"
            echo ""
            echo "🌐 Accès aux services:"
            echo "  Backend:  http://localhost:3000"
            echo "  Frontend: http://localhost:5173"
            echo ""
            echo "📋 Commandes utiles:"
            echo "  docker-compose logs -f    # Voir les logs"
            echo "  docker-compose down       # Arrêter les services"
            echo "  ./scripts/health-check.sh # Vérifier la santé"
            ;;
        3)
            print_status "Vérification de la santé des services..."
            ./scripts/health-check.sh
            exit 0
            ;;
        *)
            print_status "Démarrage en mode développement local..."
            ;;
    esac
fi

# Démarrage en mode développement local
if [ "$choice" != "2" ] && [ "$choice" != "3" ]; then
    print_status "Démarrage en mode développement local..."
    echo ""
    echo "🌐 Accès aux services:"
    echo "  Backend:  http://localhost:3000"
    echo "  Frontend: http://localhost:5173"
    echo ""
    echo "📋 Commandes utiles:"
    echo "  pnpm dev              # Backend + Frontend"
    echo "  pnpm dev:backend      # Backend uniquement"
    echo "  pnpm dev:frontend     # Frontend uniquement"
    echo "  make help             # Aide Makefile"
    echo "  ./scripts/dev.sh      # Script de développement"
    echo "  ./scripts/health-check.sh # Vérifier la santé"
    echo ""
    
    # Démarrer automatiquement
    read -p "Démarrer automatiquement ? (y/n): " auto_start
    if [[ $auto_start =~ ^[Yy]$ ]]; then
        print_status "Démarrage automatique..."
        pnpm dev
    else
        print_status "Pour démarrer manuellement: pnpm dev"
    fi
fi

echo ""
print_success "Configuration terminée !"
echo ""
echo "📚 Documentation: README.md"
echo "🔧 Scripts: ./scripts/"
echo "🐳 Docker: docker-compose.yml"
echo "📋 Makefile: make help"
echo ""
print_status "Bon développement ! 🚀" 