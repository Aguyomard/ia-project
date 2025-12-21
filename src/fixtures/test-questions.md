# 🧪 Questions de test pour le RAG

Ce document liste des questions à poser au chatbot pour vérifier que le RAG fonctionne correctement.

## Comment tester

1. Lancer l'application : `docker compose up`
2. Aller sur http://localhost:5173
3. Créer une nouvelle conversation
4. Poser les questions ci-dessous
5. Vérifier que la réponse contient les informations attendues

---

## 📡 WiFi et Réseau

### Question 1

> **C'est quoi le mot de passe WiFi ?**

**Réponse attendue :**

- Réseau : `BureauNet-5G`
- Mot de passe : `SecretWifi2024!`

### Question 2

> **Il y a un WiFi pour les visiteurs ?**

**Réponse attendue :**

- Réseau guest : `BureauNet-Guest`
- Mot de passe : `Bienvenue123`

### Question 3

> **J'ai un problème de connexion WiFi, je fais quoi ?**

**Réponse attendue :**

- Vérifier le bon réseau
- Oublier et reconnecter
- Contacter IT au poste 4242

---

## 🕐 Horaires et Accès

### Question 4

> **C'est quoi les horaires d'ouverture ?**

**Réponse attendue :**

- Lundi-Vendredi : 8h00 - 20h00
- Samedi : 9h00 - 13h00
- Dimanche : Fermé

### Question 5

> **C'est quoi le code du parking ?**

**Réponse attendue :**

- Code : `4589#`
- Change tous les mois

### Question 6

> **J'ai oublié mon badge, je fais quoi ?**

**Réponse attendue :**

- Se présenter à l'accueil avec pièce d'identité

---

## 📞 Contacts

### Question 7

> **Comment je contacte le support IT ?**

**Réponse attendue :**

- Email : support@entreprise.com
- Poste : 4242

### Question 8

> **Qui est le responsable IT ?**

**Réponse attendue :**

- Jean Dupont
- jean.dupont@entreprise.com

### Question 9

> **C'est quoi le numéro des RH ?**

**Réponse attendue :**

- rh@entreprise.com
- Poste 3100

---

## 🏖️ Congés

### Question 10

> **Comment je demande des congés ?**

**Réponse attendue :**

- Aller sur l'intranet
- Mon espace > Demandes de congés
- Sélectionner dates et type
- Validation manager sous 48h

### Question 11

> **J'ai combien de jours de congés par an ?**

**Réponse attendue :**

- Congés payés : 25 jours
- RTT : 12 jours

### Question 12

> **C'est quoi le délai pour demander des congés ?**

**Réponse attendue :**

- < 5 jours : 2 semaines avant
- > 5 jours : 1 mois avant

---

## 💰 Notes de frais

### Question 13

> **Comment faire une note de frais ?**

**Réponse attendue :**

- Garder les justificatifs
- Intranet > Mon espace > Notes de frais
- Ajouter chaque dépense avec photo

### Question 14

> **C'est quoi le plafond pour un repas ?**

**Réponse attendue :**

- Repas midi : 18€ max
- Repas soir (déplacement) : 25€ max

### Question 15

> **En combien de temps je suis remboursé ?**

**Réponse attendue :**

- 2 semaines après validation

---

## 🐳 Docker (technique)

### Question 16

> **Comment je lance le projet avec Docker ?**

**Réponse attendue :**

- `docker compose up -d`
- `docker compose logs -f app`

### Question 17

> **C'est quoi la commande pour voir les conteneurs actifs ?**

**Réponse attendue :**

- `docker ps`

### Question 18

> **Comment entrer dans un conteneur ?**

**Réponse attendue :**

- `docker exec -it <id> bash`

---

## 🏗️ Architecture

### Question 19

> **C'est quoi la Clean Architecture ?**

**Réponse attendue :**

- 3 couches : Domain, Application, Infrastructure
- Dépendances vers l'intérieur
- Séparation des responsabilités

### Question 20

> **C'est quoi un Use Case ?**

**Réponse attendue :**

- Une action métier = une classe
- Exemple : StreamMessageUseCase
- Dans la couche Application

---

## 🔌 API

### Question 21

> **C'est quoi l'endpoint pour envoyer un message ?**

**Réponse attendue :**

- `POST /api/chat/stream`
- Streaming SSE

### Question 22

> **Comment faire une recherche sémantique via l'API ?**

**Réponse attendue :**

- `POST /api/documents/search`
- Body : `{"query": "...", "limit": 3}`

---

## ❓ FAQ

### Question 23

> **Comment réinitialiser mon mot de passe ?**

**Réponse attendue :**

- Aller sur https://intranet.entreprise.com/reset-password
- Email de réinitialisation envoyé

### Question 24

> **Comment réserver une salle de réunion ?**

**Réponse attendue :**

- Via Outlook
- Créer une réunion
- Ajouter la salle comme participant

### Question 25

> **Comment accéder au VPN ?**

**Réponse attendue :**

- Installer le client VPN (sur l'intranet)
- Se connecter avec identifiants habituels
- Code 2FA par SMS

---

## 🏠 Télétravail

### Question 26

> **Je peux faire du télétravail ?**

**Réponse attendue :**

- CDI après 3 mois d'ancienneté
- Max 2 jours/semaine
- Accord manager requis

### Question 27

> **C'est quoi les horaires de joignabilité en télétravail ?**

**Réponse attendue :**

- 9h-12h et 14h-17h

### Question 28

> **J'ai droit à une aide pour internet en télétravail ?**

**Réponse attendue :**

- Participation forfaitaire de 30€/mois

---

## 🔴 Questions qui NE devraient PAS trouver de réponse dans les docs

Ces questions testent que l'IA n'invente pas d'informations :

### Question 29

> **C'est quoi le salaire moyen dans l'entreprise ?**

**Réponse attendue :**

- L'IA devrait dire qu'elle n'a pas cette information

### Question 30

> **Qui est le CEO de l'entreprise ?**

**Réponse attendue :**

- L'IA devrait dire qu'elle n'a pas cette information

---

## 📊 Résumé des tests

| #   | Question           | Document source   | Priorité   |
| --- | ------------------ | ----------------- | ---------- |
| 1   | Mot de passe WiFi  | WiFi et Réseau    | 🔴 Haute   |
| 4   | Horaires           | Horaires et Accès | 🔴 Haute   |
| 10  | Demande congés     | Demande de congés | 🔴 Haute   |
| 16  | Docker compose     | Guide Docker      | 🟡 Moyenne |
| 19  | Clean Architecture | Architecture      | 🟡 Moyenne |
| 29  | Salaire (négatif)  | Aucun             | 🔴 Haute   |

---

_Document généré pour tester les fixtures RAG_
