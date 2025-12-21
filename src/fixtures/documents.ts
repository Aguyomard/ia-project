/**
 * Fixtures de documents pour tester le RAG
 *
 * Ces documents simulent une base de connaissances d'entreprise
 * avec différents types de contenu : FAQ, procédures, infos techniques, etc.
 */

export interface DocumentFixture {
  /** Titre/catégorie du document (pour les logs) */
  title: string;
  /** Contenu du document */
  content: string;
  /** Utiliser le chunking automatique ? */
  useChunking?: boolean;
  /** Taille des chunks (si chunking activé) */
  chunkSize?: number;
  /** Overlap (si chunking activé) */
  overlap?: number;
}

export const documentFixtures: DocumentFixture[] = [
  // === INFORMATIONS PRATIQUES ===
  {
    title: 'WiFi et Réseau',
    content: `Informations de connexion WiFi du bureau :
    
Le réseau WiFi principal s'appelle "BureauNet-5G". Le mot de passe est "SecretWifi2024!".

Pour les visiteurs, utilisez le réseau "BureauNet-Guest" avec le mot de passe "Bienvenue123".

En cas de problème de connexion :
1. Vérifiez que vous êtes bien sur le bon réseau
2. Oubliez le réseau et reconnectez-vous
3. Contactez le support IT au poste 4242`,
  },

  {
    title: 'Horaires et Accès',
    content: `Horaires d'ouverture des bureaux :

Lundi à Vendredi : 8h00 - 20h00
Samedi : 9h00 - 13h00
Dimanche et jours fériés : Fermé

L'accès au bâtiment se fait avec votre badge. En cas d'oubli de badge, présentez-vous à l'accueil avec une pièce d'identité.

Le code de la porte du parking est 4589#. Ce code change tous les mois.

Pour accéder au datacenter (niveau -1), vous devez avoir une autorisation spéciale. Contactez le service IT.`,
  },

  {
    title: 'Contacts Utiles',
    content: `Annuaire des contacts importants :

- Support IT : support@entreprise.com ou poste 4242
- Ressources Humaines : rh@entreprise.com ou poste 3100
- Service Comptabilité : compta@entreprise.com ou poste 3200
- Accueil : accueil@entreprise.com ou poste 1000
- Urgence sécurité : 0800 123 456 (24h/24)

Le responsable IT est Jean Dupont (jean.dupont@entreprise.com).
La DRH est Marie Martin (marie.martin@entreprise.com).`,
  },

  // === PROCÉDURES ===
  {
    title: 'Demande de congés',
    content: `Procédure pour demander des congés :

1. Connectez-vous sur l'intranet (https://intranet.entreprise.com)
2. Allez dans "Mon espace" > "Demandes de congés"
3. Cliquez sur "Nouvelle demande"
4. Sélectionnez les dates et le type de congé
5. Ajoutez un commentaire si nécessaire
6. Validez votre demande

Votre manager recevra une notification et devra approuver dans les 48h.

Types de congés disponibles :
- Congés payés (25 jours/an)
- RTT (12 jours/an)
- Congés sans solde
- Congés exceptionnels (mariage, naissance, décès)

Délai minimum : 2 semaines pour moins de 5 jours, 1 mois pour plus.`,
  },

  {
    title: 'Note de frais',
    content: `Comment faire une note de frais :

1. Conservez tous vos justificatifs (tickets, factures)
2. Connectez-vous sur l'intranet
3. Allez dans "Mon espace" > "Notes de frais"
4. Créez une nouvelle note
5. Ajoutez chaque dépense avec :
   - Date
   - Montant
   - Catégorie (transport, repas, hébergement, etc.)
   - Photo du justificatif
6. Soumettez pour validation

Plafonds de remboursement :
- Repas midi : 18€ max
- Repas soir (déplacement) : 25€ max
- Hôtel : 120€/nuit max
- Train : 2ème classe sauf trajet > 3h
- Taxi : uniquement si pas de transport en commun

Délai de remboursement : 2 semaines après validation.`,
  },

  // === TECHNIQUE ===
  {
    title: 'Guide Docker',
    content: `Guide de démarrage Docker pour les développeurs :

Installation :
- Mac : brew install docker
- Linux : sudo apt install docker.io
- Windows : Installer Docker Desktop

Commandes essentielles :
- docker ps : voir les conteneurs actifs
- docker images : voir les images disponibles
- docker run <image> : lancer un conteneur
- docker stop <id> : arrêter un conteneur
- docker logs <id> : voir les logs
- docker exec -it <id> bash : entrer dans un conteneur

Docker Compose :
- docker compose up : démarrer les services
- docker compose down : arrêter les services
- docker compose logs : voir tous les logs
- docker compose build : reconstruire les images

Pour notre projet, utilisez :
docker compose up -d
docker compose logs -f app`,
    useChunking: true,
    chunkSize: 400,
    overlap: 80,
  },

  {
    title: 'Architecture du projet',
    content: `Architecture Clean Architecture du projet :

Le projet suit les principes de la Clean Architecture avec 3 couches :

1. DOMAIN (src/domain/)
Contient les entités métier et les interfaces des repositories.
Aucune dépendance externe.
Exemples : Conversation, Message, Document

2. APPLICATION (src/application/)
Contient la logique métier : Use Cases et Services.
Dépend uniquement du Domain.
Exemples : StreamMessageUseCase, RAGService, ChunkingService

3. INFRASTRUCTURE (src/infrastructure/)
Contient les implémentations concrètes : API, base de données, services externes.
Implémente les interfaces définies dans Domain/Application.
Exemples : MistralClient, DocumentRepository, Express routes

Règle d'or : Les dépendances vont toujours vers l'intérieur (Infrastructure → Application → Domain).

Cela permet :
- De tester facilement (mocks)
- De changer d'implémentation sans toucher au métier
- De garder le code organisé et maintenable`,
    useChunking: true,
    chunkSize: 500,
    overlap: 100,
  },

  {
    title: 'API Endpoints',
    content: `Documentation des endpoints API :

=== Conversations ===
POST /api/conversations - Créer une conversation
GET /api/conversations/:id - Récupérer une conversation
POST /api/chat/stream - Envoyer un message (streaming SSE)

=== Documents (RAG) ===
POST /api/documents - Ajouter un document simple
POST /api/documents/batch - Ajouter plusieurs documents
POST /api/documents/chunked - Ajouter avec chunking automatique
GET /api/documents - Lister les documents
GET /api/documents/:id - Récupérer un document
DELETE /api/documents/:id - Supprimer un document
POST /api/documents/search - Recherche sémantique

=== Exemples ===

Créer une conversation :
curl -X POST http://localhost:3000/api/conversations

Envoyer un message :
curl -X POST http://localhost:3000/api/chat/stream \\
  -H "Content-Type: application/json" \\
  -d '{"conversationId": "...", "message": "Bonjour"}'

Recherche sémantique :
curl -X POST http://localhost:3000/api/documents/search \\
  -H "Content-Type: application/json" \\
  -d '{"query": "mot de passe wifi", "limit": 3}'`,
    useChunking: true,
    chunkSize: 450,
    overlap: 50,
  },

  // === FAQ ===
  {
    title: 'FAQ Générale',
    content: `Questions fréquemment posées :

Q: Comment réinitialiser mon mot de passe ?
R: Allez sur https://intranet.entreprise.com/reset-password et suivez les instructions. Vous recevrez un email de réinitialisation.

Q: Où trouver les documents partagés ?
R: Sur le SharePoint de l'entreprise : https://sharepoint.entreprise.com. Chaque équipe a son espace dédié.

Q: Comment réserver une salle de réunion ?
R: Via Outlook, créez une réunion et ajoutez la salle comme participant. Les salles disponibles s'affichent automatiquement.

Q: Qui contacter pour un problème informatique ?
R: Le support IT au poste 4242 ou par email à support@entreprise.com. Pour les urgences, utilisez le formulaire sur l'intranet.

Q: Comment accéder au VPN depuis chez moi ?
R: Installez le client VPN (disponible sur l'intranet), puis connectez-vous avec vos identifiants habituels. Le code 2FA est envoyé par SMS.

Q: Où sont les imprimantes ?
R: Une imprimante par étage, près de la machine à café. Utilisez votre badge pour débloquer vos impressions.`,
  },

  {
    title: 'Politique de télétravail',
    content: `Règles du télétravail :

Éligibilité :
- Tous les employés en CDI après 3 mois d'ancienneté
- Accord du manager requis
- Poste compatible avec le travail à distance

Modalités :
- Maximum 2 jours par semaine en télétravail
- Les mardi et jeudi sont généralement réservés au présentiel
- Horaires de joignabilité : 9h-12h et 14h-17h

Équipement fourni :
- Ordinateur portable
- Casque audio
- Clavier et souris (sur demande)
- Participation forfaitaire de 30€/mois pour internet

Obligations :
- Environnement de travail adapté
- Connexion internet stable
- Disponibilité sur Teams/Slack
- Respect de la confidentialité des données

Pour demander le télétravail, remplissez le formulaire sur l'intranet > RH > Télétravail.`,
  },
];

export default documentFixtures;
