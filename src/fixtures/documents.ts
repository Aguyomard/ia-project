/**
 * Fixtures de documents pour tester le RAG
 *
 * Documents rédigés en format Q&A pour optimiser la recherche sémantique
 */

export interface DocumentFixture {
  title: string;
  content: string;
  chunkSize?: number;
  overlap?: number;
}

export const documentFixtures: DocumentFixture[] = [
  // === WIFI ET RÉSEAU ===
  {
    title: 'WiFi',
    content: `Quel est le mot de passe WiFi ?
Le mot de passe WiFi est "SecretWifi2024!".
Le nom du réseau WiFi est "BureauNet-5G".

Quel est le WiFi pour les visiteurs ?
Le réseau visiteur s'appelle "BureauNet-Guest".
Le mot de passe visiteur est "Bienvenue123".`,
  },

  // === HORAIRES ===
  {
    title: 'Horaires',
    content: `Quels sont les horaires d'ouverture ?
Les bureaux sont ouverts du lundi au vendredi de 8h à 20h.
Le samedi de 9h à 13h.
Fermé le dimanche et jours fériés.

Quel est le code du parking ?
Le code de la porte du parking est 4589#.`,
  },

  // === CONTACTS ===
  {
    title: 'Contacts',
    content: `Comment contacter le support informatique ?
Le support IT est joignable au poste 4242 ou par email à support@entreprise.com.

Qui est le responsable IT ?
Le responsable IT est Jean Dupont (jean.dupont@entreprise.com).

Comment contacter les RH ?
Les ressources humaines sont au poste 3100 ou rh@entreprise.com.`,
  },

  // === CONGÉS ===
  {
    title: 'Congés',
    content: `Comment poser des congés ?
Pour poser des congés, allez sur l'intranet dans "Mon espace" puis "Demande de congés".
Remplissez le formulaire et soumettez pour validation.

Combien de jours de congés ai-je ?
Chaque salarié a droit à 25 jours de congés payés par an.
Plus 2 jours de RTT par mois travaillé.`,
  },

  // === NOTES DE FRAIS ===
  {
    title: 'Notes de frais',
    content: `Comment faire une note de frais ?
Allez sur l'intranet, section "Mon espace" puis "Notes de frais".
Ajoutez vos dépenses avec les justificatifs scannés.

Quel est le plafond pour les repas ?
Le plafond repas midi est de 18€.
Le plafond repas soir en déplacement est de 25€.
Le plafond hôtel est de 120€ par nuit.`,
  },

  // === TÉLÉTRAVAIL ===
  {
    title: 'Télétravail',
    content: `Qui peut faire du télétravail ?
Le télétravail est accessible aux CDI après 3 mois d'ancienneté.
L'accord du manager est requis.

Combien de jours de télétravail par semaine ?
Maximum 2 jours de télétravail par semaine.
Les mardi et jeudi sont généralement en présentiel.`,
  },

  // === RÉUNIONS ===
  {
    title: 'Réunions',
    content: `Comment réserver une salle de réunion ?
Créez une réunion dans Outlook et ajoutez la salle comme participant.
Les salles disponibles s'affichent automatiquement.

Où sont les salles de réunion ?
Les salles de réunion sont au 2ème étage.
Il y a 5 salles : Everest, K2, Mont-Blanc, Kilimandjaro, Fuji.`,
  },

  // === IMPRIMANTES ===
  {
    title: 'Imprimantes',
    content: `Où sont les imprimantes ?
Il y a une imprimante par étage, près de la machine à café.

Comment imprimer ?
Envoyez votre document à l'imprimante et passez votre badge pour récupérer l'impression.
L'imprimante s'appelle "PRINT-ETAGE-X" où X est le numéro d'étage.`,
  },

  // === VPN ===
  {
    title: 'VPN',
    content: `Comment se connecter au VPN ?
Installez le client VPN disponible sur l'intranet.
Connectez-vous avec vos identifiants habituels.
Le code 2FA est envoyé par SMS.

Pourquoi utiliser le VPN ?
Le VPN est obligatoire pour accéder aux ressources internes depuis l'extérieur.`,
  },

  // === MOT DE PASSE ===
  {
    title: 'Mot de passe',
    content: `Comment réinitialiser mon mot de passe ?
Allez sur https://intranet.entreprise.com/reset-password.
Suivez les instructions, vous recevrez un email.

À quelle fréquence changer son mot de passe ?
Le mot de passe doit être changé tous les 90 jours.
Il doit contenir au moins 12 caractères, une majuscule, un chiffre et un caractère spécial.`,
  },
];

export default documentFixtures;
