#!/bin/bash

echo "🏥 Vérification de la santé des services"
echo "======================================="
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

# Fonction pour vérifier un service HTTP
check_service() {
    local name=$1
    local url=$2
    local timeout=${3:-5}
    
    print_status "Vérification de $name ($url)..."
    
    if command -v curl &> /dev/null; then
        if curl -s --max-time $timeout "$url" > /dev/null 2>&1; then
            print_success "$name est accessible"
            return 0
        else
            print_error "$name n'est pas accessible"
            return 1
        fi
    elif command -v wget &> /dev/null; then
        if wget -q --timeout=$timeout --tries=1 "$url" -O /dev/null 2>&1; then
            print_success "$name est accessible"
            return 0
        else
            print_error "$name n'est pas accessible"
            return 1
        fi
    else
        print_warning "curl/wget non disponible, impossible de vérifier $name"
        return 2
    fi
}

# Vérifier les processus locaux
echo "🔍 Vérification des processus locaux..."
echo ""

# Vérifier le backend
if pgrep -f "tsx.*server.ts" > /dev/null; then
    print_success "Backend en cours d'exécution (tsx)"
elif pgrep -f "nodemon.*server.ts" > /dev/null; then
    print_success "Backend en cours d'exécution (nodemon)"
else
    print_warning "Backend non détecté localement"
fi

# Vérifier le frontend
if pgrep -f "vite.*frontend" > /dev/null; then
    print_success "Frontend en cours d'exécution (vite)"
else
    print_warning "Frontend non détecté localement"
fi

echo ""

# Vérifier les services Docker
echo "🐳 Vérification des services Docker..."
echo ""

if command -v docker-compose &> /dev/null; then
    # Vérifier si les services Docker sont en cours d'exécution
    if docker-compose ps | grep -q "Up"; then
        print_success "Services Docker en cours d'exécution"
        
        # Vérifier le backend Docker
        if docker-compose ps | grep -q "app.*Up"; then
            print_success "Container backend (app) en cours d'exécution"
        else
            print_error "Container backend (app) non en cours d'exécution"
        fi
        
        # Vérifier le frontend Docker
        if docker-compose ps | grep -q "frontend.*Up"; then
            print_success "Container frontend en cours d'exécution"
        else
            print_error "Container frontend non en cours d'exécution"
        fi
        
        echo ""
        echo "🌐 Vérification de l'accessibilité des services..."
        echo ""
        
        # Vérifier l'accessibilité des services
        check_service "Backend" "http://localhost:3000"
        check_service "Frontend" "http://localhost:5173"
        
    else
        print_warning "Aucun service Docker en cours d'exécution"
        print_status "Pour démarrer: docker-compose up -d"
    fi
else
    print_warning "Docker Compose non disponible"
fi

echo ""

# Vérifier les ports utilisés
echo "🔌 Vérification des ports..."
echo ""

# Vérifier le port 3000 (backend)
if netstat -tuln 2>/dev/null | grep -q ":3000 "; then
    print_success "Port 3000 (backend) en écoute"
else
    print_warning "Port 3000 (backend) non en écoute"
fi

# Vérifier le port 5173 (frontend)
if netstat -tuln 2>/dev/null | grep -q ":5173 "; then
    print_success "Port 5173 (frontend) en écoute"
else
    print_warning "Port 5173 (frontend) non en écoute"
fi

# Vérifier le port 9229 (debug backend)
if netstat -tuln 2>/dev/null | grep -q ":9229 "; then
    print_success "Port 9229 (debug backend) en écoute"
else
    print_warning "Port 9229 (debug backend) non en écoute"
fi

echo ""

# Résumé
echo "📊 Résumé de la santé des services:"
echo "==================================="

# Compter les services en cours d'exécution
local_backend=0
local_frontend=0
docker_backend=0
docker_frontend=0

if pgrep -f "tsx.*server.ts\|nodemon.*server.ts" > /dev/null; then
    local_backend=1
fi

if pgrep -f "vite.*frontend" > /dev/null; then
    local_frontend=1
fi

if docker-compose ps 2>/dev/null | grep -q "app.*Up"; then
    docker_backend=1
fi

if docker-compose ps 2>/dev/null | grep -q "frontend.*Up"; then
    docker_frontend=1
fi

echo "🔧 Backend:  $([ $local_backend -eq 1 ] && echo "✅ Local" || echo "❌ Local") $([ $docker_backend -eq 1 ] && echo "✅ Docker" || echo "❌ Docker")"
echo "🎨 Frontend: $([ $local_frontend -eq 1 ] && echo "✅ Local" || echo "❌ Local") $([ $docker_frontend -eq 1 ] && echo "✅ Docker" || echo "❌ Docker")"

echo ""
echo "📋 Commandes utiles:"
echo "  ./scripts/dev.sh        # Démarrage du développement"
echo "  docker-compose up -d    # Démarrage Docker"
echo "  docker-compose logs -f  # Voir les logs Docker"
echo "  make help               # Aide Makefile"
echo ""
print_status "Vérification terminée ! 🏥" 