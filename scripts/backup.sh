#!/bin/bash

echo "💾 Sauvegarde du monorepo Node.js + Vue 3"
echo "========================================="
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
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="monorepo_backup_$TIMESTAMP"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

# Créer le dossier de sauvegarde
if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    print_success "Dossier de sauvegarde créé: $BACKUP_DIR"
fi

# Fonction pour créer une sauvegarde
create_backup() {
    local backup_type=$1
    local include_deps=$2
    
    print_status "Création de la sauvegarde: $backup_type"
    
    # Créer le dossier de sauvegarde
    mkdir -p "$BACKUP_PATH"
    
    # Copier les fichiers source
    print_status "Copie des fichiers source..."
    
    # Fichiers de configuration
    cp -r package.json "$BACKUP_PATH/"
    cp -r pnpm-workspace.yaml "$BACKUP_PATH/"
    cp -r docker-compose.yml "$BACKUP_PATH/"
    cp -r .npmrc "$BACKUP_PATH/"
    cp -r .prettierrc "$BACKUP_PATH/"
    cp -r tsconfig.base.json "$BACKUP_PATH/"
    cp -r Makefile "$BACKUP_PATH/"
    cp -r env.example "$BACKUP_PATH/"
    
    # Dossiers source
    cp -r src "$BACKUP_PATH/"
    cp -r frontend "$BACKUP_PATH/"
    cp -r scripts "$BACKUP_PATH/"
    cp -r .vscode "$BACKUP_PATH/"
    
    # Fichiers de configuration supplémentaires
    if [ -f "eslint.config.mjs" ]; then
        cp -r eslint.config.mjs "$BACKUP_PATH/"
    fi
    
    if [ -f ".gitignore" ]; then
        cp -r .gitignore "$BACKUP_PATH/"
    fi
    
    if [ -f ".dockerignore" ]; then
        cp -r .dockerignore "$BACKUP_PATH/"
    fi
    
    # Inclure les dépendances si demandé
    if [ "$include_deps" = true ]; then
        print_status "Inclusion des dépendances..."
        
        # Copier node_modules (optionnel, peut être volumineux)
        if [ -d "node_modules" ]; then
            cp -r node_modules "$BACKUP_PATH/"
        fi
        
        if [ -d "src/node_modules" ]; then
            cp -r src/node_modules "$BACKUP_PATH/"
        fi
        
        if [ -d "frontend/node_modules" ]; then
            cp -r frontend/node_modules "$BACKUP_PATH/"
        fi
        
        # Copier le lockfile
        if [ -f "pnpm-lock.yaml" ]; then
            cp -r pnpm-lock.yaml "$BACKUP_PATH/"
        fi
    fi
    
    # Créer un fichier d'information sur la sauvegarde
    cat > "$BACKUP_PATH/backup_info.txt" << EOF
Sauvegarde du monorepo Node.js + Vue 3
=====================================
Date: $(date)
Type: $backup_type
Dépendances incluses: $include_deps
Version Node.js: $(node --version 2>/dev/null || echo "Non disponible")
Version pnpm: $(pnpm --version 2>/dev/null || echo "Non disponible")

Structure du projet:
- src/: Backend Node.js
- frontend/: Frontend Vue 3
- scripts/: Scripts de développement
- .vscode/: Configuration VS Code
- Configuration: package.json, pnpm-workspace.yaml, docker-compose.yml

Pour restaurer:
1. Copier le contenu dans un nouveau dossier
2. Exécuter: pnpm install
3. Démarrer: pnpm dev

Notes:
- Cette sauvegarde a été créée automatiquement
- Vérifiez la compatibilité des versions avant restauration
EOF
    
    print_success "Fichier d'information créé: backup_info.txt"
}

# Fonction pour créer une archive
create_archive() {
    local archive_name="$BACKUP_NAME.tar.gz"
    local archive_path="$BACKUP_DIR/$archive_name"
    
    print_status "Création de l'archive: $archive_name"
    
    cd "$BACKUP_DIR"
    tar -czf "$archive_name" "$BACKUP_NAME"
    
    if [ $? -eq 0 ]; then
        print_success "Archive créée: $archive_path"
        
        # Calculer la taille
        local size=$(du -h "$archive_path" | cut -f1)
        print_status "Taille de l'archive: $size"
        
        # Nettoyer le dossier temporaire
        rm -rf "$BACKUP_NAME"
        print_success "Dossier temporaire nettoyé"
        
        return 0
    else
        print_error "Erreur lors de la création de l'archive"
        return 1
    fi
}

# Menu principal
echo "Choisissez le type de sauvegarde:"
echo "1) Sauvegarde complète (avec dépendances)"
echo "2) Sauvegarde légère (sans dépendances)"
echo "3) Sauvegarde incrémentale (seulement les changements)"
echo "4) Sauvegarde de production (optimisée)"
echo ""

read -p "Votre choix (1-4): " choice

case $choice in
    1)
        print_status "Sauvegarde complète sélectionnée"
        create_backup "Complète" true
        ;;
    2)
        print_status "Sauvegarde légère sélectionnée"
        create_backup "Légère" false
        ;;
    3)
        print_status "Sauvegarde incrémentale sélectionnée"
        # Pour l'instant, on fait une sauvegarde légère
        # TODO: Implémenter la logique incrémentale
        create_backup "Incrémentale" false
        ;;
    4)
        print_status "Sauvegarde de production sélectionnée"
        create_backup "Production" false
        ;;
    *)
        print_error "Choix invalide"
        exit 1
        ;;
esac

# Créer l'archive
if create_archive; then
    echo ""
    echo "📊 Résumé de la sauvegarde:"
    echo "============================"
    echo "✅ Type: $choice"
    echo "✅ Dossier: $BACKUP_PATH"
    echo "✅ Archive: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
    echo "✅ Date: $(date)"
    echo ""
    
    # Afficher les sauvegardes disponibles
    if [ "$(ls -1 $BACKUP_DIR/*.tar.gz 2>/dev/null | wc -l)" -gt 0 ]; then
        echo "📁 Sauvegardes disponibles:"
        ls -lh "$BACKUP_DIR"/*.tar.gz
        echo ""
    fi
    
    echo "📋 Commandes utiles:"
    echo "  tar -tzf $BACKUP_DIR/$BACKUP_NAME.tar.gz  # Lister le contenu"
    echo "  tar -xzf $BACKUP_DIR/$BACKUP_NAME.tar.gz  # Extraire"
    echo "  ./scripts/restore.sh                       # Restauration (si disponible)"
    echo ""
    
    print_success "Sauvegarde terminée avec succès ! 💾"
else
    print_error "Échec de la création de l'archive"
    exit 1
fi 