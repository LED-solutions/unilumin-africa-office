# Unilumin Africa Office

Site interne de suivi pour l'équipe Unilumin Tunisia Africa Office. Il remplace le Google Sheet « Suivi des dossiers » :

- 📺 Projets · 🎤 Events · 📄 Appels d'offres · ✈️ Export · 🔧 SAV · 📞 Contacts siège (avec transfert)
- 🏠 Accueil avec système d'alerte, « À surveiller », « Cette semaine » et l'équipe
- 📋 Agenda (avec « ⏱ Dans 10 h »), 📅 Calendrier du mois, 📦 Stock jour par jour
- Page complète de chaque dossier (impression / PDF), historique des modifications, 🗑️ corbeille, recherche
- Comptes avec mot de passe : **admin** et **membres**. Français / English.

## 🔒 Où sont les données ?

**Uniquement sur le PC du bureau**, dans le dossier `data/`. Ce dossier n'est **jamais** envoyé sur GitHub
(voir `.gitignore`). Ce dépôt public contient seulement le code : sans compte, personne ne voit le moindre dossier.

- Mots de passe : jamais stockés en clair (empreinte *scrypt*), 8 essais maximum par 15 minutes.
- Sauvegarde automatique chaque jour dans `data/backups/` (les 30 derniers jours sont gardés).
- Si le réseau coupe, les modifications faites dans un onglet ouvert sont gardées et envoyées au retour de la connexion.

## Installation sur le PC du bureau (Windows)

1. Installer **Node.js LTS** (version 22 ou plus) : <https://nodejs.org>
2. Sur cette page GitHub : **Code → Download ZIP**, puis extraire par exemple dans `C:\UniluminOffice`.
3. Double-cliquer sur **`demarrer.bat`**. La première fois, il installe ce qu'il faut (1 minute).
4. La fenêtre noire affiche :
   - l'adresse à ouvrir sur ce PC : `http://localhost:3000`
   - l'adresse pour les autres PC et téléphones du réseau : `http://192.168.x.x:3000`
   - au premier démarrage, un **code d'installation** pour créer le compte administrateur.
5. Ouvrir le site, entrer le code, créer votre compte admin.
6. Si Windows demande l'accès au réseau (pare-feu) : cocher **Réseaux privés** et autoriser.

**La fenêtre noire doit rester ouverte** (le PC du bureau est le serveur). Pour le démarrer tout seul avec Windows :
Planificateur de tâches → Créer une tâche → Déclencheur « Au démarrage » → Action « Démarrer un programme » → `demarrer.bat`.

## Importer le Google Sheet (une seule fois)

1. Dans le Google Sheet : **Fichier → Télécharger → Microsoft Excel (.xlsx)**.
2. Fermer la fenêtre noire du serveur, puis dans le dossier du site (clic droit → *Ouvrir dans le Terminal*) :

   ```
   npm run import -- "C:\Users\...\Téléchargements\Suivi.xlsx"
   ```

3. Relancer `demarrer.bat`. Tous les dossiers, le stock et l'équipe sont là. Le fichier .xlsx n'est pas envoyé sur GitHub.

## Comptes

- L'admin crée les comptes dans **👥 Équipe & comptes** (mot de passe provisoire : la personne choisit le sien à la première connexion).
- Admin : comptes, organigramme, listes de suggestions, restaurer ou supprimer définitivement depuis la corbeille.
- Membres : tout le reste (créer, modifier, mettre à la corbeille).
- Mot de passe admin oublié : `npm run admin -- reset votre@email.tn NouveauMotDePasse`

## Mettre à jour le site

Télécharger le nouveau ZIP, remplacer les fichiers **sauf le dossier `data/`**, relancer `demarrer.bat`.

## Bon à savoir

- Le site fonctionne sur le réseau du bureau (Wi-Fi / câble). Pour l'utiliser depuis l'extérieur (events, 4G),
  il faudra ajouter un réseau privé sécurisé (par ex. Tailscale) — à faire dans une prochaine étape.
- Sur le réseau du bureau, le site est en `http://` : les mots de passe passent en clair sur le Wi-Fi interne.
  Utilisez un Wi-Fi protégé par mot de passe ; un passage en `https://` est possible plus tard.
- Copier le dossier `data/` sur une clé USB de temps en temps = sauvegarde hors du PC.

## Pour les développeurs

Node.js ≥ 22.5 (SQLite intégré), Express, JavaScript sans étape de compilation.

```
npm install
npm start          # http://localhost:3000
npm test
UAO_DATA=./demo-data node --no-warnings scripts/demo-seed.js   # données fictives pour essayer
```
