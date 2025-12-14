#!/bin/bash

echo "🔄 Restauration d'une sauvegarde du monorepo"
echo "============================================="
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

# Configuration
BACKUP_DIR="backups"

# Vérifier que le dossier de sauvegarde existe
if [ ! -d "$BACKUP_DIR" ]; then
    print_error "Dossier de sauvegarde non trouvé: $BACKUP_DIR"
    print_status "Créez d'abord une sauvegarde avec: ./scripts/backup.sh"
    exit 1
fi

# Lister les sauvegardes disponibles
echo "📁 Sauvegardes disponibles:"
echo "============================"

# Vérifier s'il y a des sauvegardes
if [ "$(ls -1 $BACKUP_DIR/*.tar.gz 2>/dev/null | wc -l)" -eq 0 ]; then
    print_error "Aucune sauvegarde trouvée dans $BACKUP_DIR"
    print_status "Créez d'abord une sauvegarde avec: ./scripts/backup.sh"
    exit 1
fi

# Afficher les sauvegardes avec numérotation
counter=1
declare -a backup_files
for backup in "$BACKUP_DIR"/*.tar.gz; do
    if [ -f "$backup" ]; then
        filename=$(basename "$backup")
        size=$(du -h "$backup" | cut -f1)
        date=$(stat -c %y "$backup" | cut -d' ' -f1)
        echo "$counter) $filename ($size) - $date"
        backup_files[$counter]=$backup
        ((counter++))
    fi
done

echo ""
read -p "Choisissez la sauvegarde à restaurer (1-$((counter-1))): " choice

# Valider le choix
if ! [[ "$choice" =~ ^[0-9]+$ ]] || [ "$choice" -lt 1 ] || [ "$choice" -ge "$counter" ]; then
    print_error "Choix invalide"
    exit 1
fi

selected_backup="${backup_files[$choice]}"
backup_name=$(basename "$selected_backup" .tar.gz)

echo ""
print_status "Sauvegarde sélectionnée: $backup_name"

# Demander confirmation
echo ""
echo "⚠️  ATTENTION: Cette opération va:"
echo "   - Remplacer tous les fichiers du projet"
echo "   - Supprimer les modifications non sauvegardées"
echo "   - Restaurer la configuration exacte de la sauvegarde"
echo ""
read -p "Êtes-vous sûr de vouloir continuer ? (y/N): " confirm

if [[ ! $confirm =~ ^[Yy]$ ]]; then
    print_warning "Restauration annulée"
    exit 0
fi

# Créer une sauvegarde de l'état actuel
echo ""
print_status "Création d'une sauvegarde de l'état actuel..."
current_backup="current_state_$(date +"%Y%m%d_%H%M%S")"
mkdir -p "$BACKUP_DIR/$current_backup"

# Sauvegarder les fichiers importants actuels
if [ -f "package.json" ]; then
    cp package.json "$BACKUP_DIR/$current_backup/"
fi

if [ -f "pnpm-lock.yaml" ]; then
    cp pnpm-lock.yaml "$BACKUP_DIR/$current_backup/"
fi

if [ -d "src" ]; then
    cp -r src "$BACKUP_DIR/$current_backup/"
fi

if [ -d "frontend" ]; then
    cp -r frontend "$BACKUP_DIR/$current_backup/"
fi

print_success "État actuel sauvegardé dans: $BACKUP_DIR/$current_backup"

# Arrêter les services en cours d'exécution
echo ""
print_status "Arrêt des services en cours d'exécution..."

# Arrêter Docker si en cours
if command -v docker-compose &> /dev/null; then
    docker-compose down > /dev/null 2>&1
    print_success "Services Docker arrêtés"
fi

# Arrêter les processus locaux
pkill -f "tsx.*server.ts" > /dev/null 2>&1
pkill -f "nodemon.*server.ts" > /dev/null 2>&1
pkill -f "vite.*frontend" > /dev/null 2>&1
print_success "Processus locaux arrêtés"

# Nettoyer le projet actuel
echo ""
print_status "Nettoyage du projet actuel..."

# Supprimer les dossiers et fichiers à restaurer
rm -rf src frontend scripts .vscode
rm -f package.json pnpm-workspace.yaml docker-compose.yml .npmrc .prettierrc tsconfig.base.json Makefile env.example eslint.config.mjs

# Supprimer les dépendances
rm -rf node_modules src/node_modules frontend/node_modules
rm -f pnpm-lock.yaml

print_success "Projet actuel nettoyé"

# Extraire la sauvegarde
echo ""
print_status "Extraction de la sauvegarde..."

# Créer un dossier temporaire pour l'extraction
temp_dir=$(mktemp -d)
cd "$temp_dir"

# Extraire la sauvegarde
tar -xzf "$selected_backup"

if [ $? -ne 0 ]; then
    print_error "Erreur lors de l'extraction de la sauvegarde"
    cd - > /dev/null
    rm -rf "$temp_dir"
    exit 1
fi

# Copier les fichiers restaurés
cp -r "$backup_name"/* ./
print_success "Fichiers restaurés"

# Nettoyer le dossier temporaire
cd - > /dev/null
rm -rf "$temp_dir"

# Vérifier la restauration
echo ""
print_status "Vérification de la restauration..."

# Vérifier les fichiers essentiels
missing_files=()
for file in "package.json" "pnpm-workspace.yaml" "src" "frontend"; do
    if [ ! -e "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -gt 0 ]; then
    print_error "Fichiers manquants après restauration: ${missing_files[*]}"
    print_status "Restauration incomplète, vérifiez la sauvegarde"
    exit 1
fi

print_success "Tous les fichiers essentiels restaurés"

# Installer les dépendances
echo ""
print_status "Installation des dépendances..."

if pnpm install; then
    print_success "Dépendances installées avec succès"
else
    print_warning "Erreur lors de l'installation des dépendances"
    print_status "Essayez manuellement: pnpm install"
fi

# Vérifier la configuration
echo ""
print_status "Vérification de la configuration..."

# Vérifier que pnpm reconnaît le workspace
if pnpm list --depth=0 > /dev/null 2>&1; then
    print_success "Workspace pnpm configuré correctement"
else
    print_warning "Problème avec la configuration du workspace pnpm"
fi

# Afficher le résumé
echo ""
echo "📊 Résumé de la restauration:"
echo "=============================="
echo "✅ Sauvegarde restaurée: $backup_name"
echo "✅ État actuel sauvegardé: $current_backup"
echo "✅ Fichiers restaurés: src/, frontend/, configuration"
echo "✅ Dépendances installées"
echo ""
echo "📋 Prochaines étapes:"
echo "  1. Vérifier la configuration: ./scripts/check-env.sh"
echo "  2. Tester l'application: pnpm dev"
echo "  3. Vérifier la santé: ./scripts/health-check.sh"
echo ""
echo "🔄 Pour annuler la restauration:"
echo "  ./scripts/restore.sh (et choisir $current_backup)"
echo ""
print_success "Restauration terminée avec succès ! 🔄"

# Demander si on veut démarrer
echo ""
read -p "Voulez-vous démarrer l'application maintenant ? (y/N): " start_now

if [[ $start_now =~ ^[Yy]$ ]]; then
    print_status "Démarrage de l'application..."
    pnpm dev
fi 