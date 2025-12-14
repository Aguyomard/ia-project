#!/bin/bash

echo "🔄 Mise à jour des dépendances du monorepo"
echo "=========================================="
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

# Vérifier que pnpm est installé
if ! command -v pnpm &> /dev/null; then
    print_error "pnpm n'est pas installé"
    print_status "Installation: npm install -g pnpm"
    exit 1
fi

# Fonction pour mettre à jour un package
update_package() {
    local package_name=$1
    local package_path=$2
    
    if [ -d "$package_path" ]; then
        print_status "Mise à jour de $package_name..."
        cd "$package_path"
        
        # Vérifier s'il y a des mises à jour
        if pnpm outdated | grep -q "Package"; then
            print_status "Mises à jour disponibles pour $package_name:"
            pnpm outdated
            
            echo ""
            read -p "Mettre à jour $package_name ? (y/N): " update_confirm
            
            if [[ $update_confirm =~ ^[Yy]$ ]]; then
                print_status "Mise à jour de $package_name..."
                
                # Mise à jour interactive
                pnpm update --interactive
                
                if [ $? -eq 0 ]; then
                    print_success "$package_name mis à jour avec succès"
                else
                    print_error "Erreur lors de la mise à jour de $package_name"
                fi
            else
                print_warning "Mise à jour de $package_name annulée"
            fi
        else
            print_success "$package_name est à jour"
        fi
        
        cd - > /dev/null
    else
        print_warning "Dossier $package_path non trouvé"
    fi
    
    echo ""
}

# Sauvegarder les versions actuelles
print_status "Sauvegarde des versions actuelles..."
if [ -f "pnpm-lock.yaml" ]; then
    cp pnpm-lock.yaml pnpm-lock.yaml.backup
    print_success "pnpm-lock.yaml sauvegardé"
fi

# Mise à jour des dépendances racine
print_status "Mise à jour des dépendances racine..."
if pnpm outdated | grep -q "Package"; then
    print_status "Mises à jour disponibles pour les dépendances racine:"
    pnpm outdated
    
    echo ""
    read -p "Mettre à jour les dépendances racine ? (y/N): " update_root
    
    if [[ $update_root =~ ^[Yy]$ ]]; then
        print_status "Mise à jour des dépendances racine..."
        pnpm update --interactive
        
        if [ $? -eq 0 ]; then
            print_success "Dépendances racine mises à jour"
        else
            print_error "Erreur lors de la mise à jour des dépendances racine"
        fi
    else
        print_warning "Mise à jour des dépendances racine annulée"
    fi
else
    print_success "Dépendances racine à jour"
fi

echo ""

# Mise à jour des packages du workspace
print_status "Mise à jour des packages du workspace..."

# Backend
update_package "Backend" "src"

# Frontend
update_package "Frontend" "frontend"

# Mise à jour globale des dépendances
echo ""
print_status "Mise à jour globale des dépendances..."
read -p "Voulez-vous forcer la mise à jour de toutes les dépendances ? (y/N): " force_update

if [[ $force_update =~ ^[Yy]$ ]]; then
    print_status "Mise à jour forcée en cours..."
    
    # Supprimer le lockfile et réinstaller
    rm -f pnpm-lock.yaml
    pnpm install
    
    if [ $? -eq 0 ]; then
        print_success "Mise à jour forcée terminée"
    else
        print_error "Erreur lors de la mise à jour forcée"
        
        # Restaurer la sauvegarde
        if [ -f "pnpm-lock.yaml.backup" ]; then
            print_status "Restauration de la sauvegarde..."
            mv pnpm-lock.yaml.backup pnpm-lock.yaml
            pnpm install
        fi
    fi
else
    print_status "Mise à jour forcée annulée"
fi

# Vérifier les vulnérabilités
echo ""
print_status "Vérification des vulnérabilités..."
if pnpm audit; then
    print_success "Aucune vulnérabilité critique détectée"
else
    print_warning "Vulnérabilités détectées. Considérez pnpm audit --fix"
fi

# Nettoyer les caches
echo ""
print_status "Nettoyage des caches..."
pnpm store prune

if [ $? -eq 0 ]; then
    print_success "Caches nettoyés"
else
    print_warning "Erreur lors du nettoyage des caches"
fi

# Résumé
echo ""
echo "📊 Résumé de la mise à jour:"
echo "============================="
echo "✅ Sauvegarde créée: pnpm-lock.yaml.backup"
echo "✅ Dépendances vérifiées et mises à jour"
echo "✅ Vulnérabilités vérifiées"
echo "✅ Caches nettoyés"
echo ""
echo "📋 Prochaines étapes:"
echo "  1. Tester l'application: pnpm dev"
echo "  2. Lancer les tests: pnpm test"
echo "  3. Vérifier la santé: ./scripts/health-check.sh"
echo ""
echo "🔄 Pour annuler les changements:"
echo "  mv pnpm-lock.yaml.backup pnpm-lock.yaml && pnpm install"
echo ""
print_success "Mise à jour terminée ! 🎉" 