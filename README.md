# Unilumin Africa Office

**Site : https://led-solutions.github.io/unilumin-africa-office/**

Site interne de suivi de l'équipe Unilumin Tunisia Africa Office (Projets, Events, Appels d'offres, Export, SAV,
Contacts siège, Agenda, Calendrier, Stock). Connexion par nom d'utilisateur et mot de passe ; l'administrateur crée
les comptes et choisit, pour chaque onglet, si la personne peut le voir ou le modifier.

## 🔒 Données

Le site (dossier `docs/`) est publié par GitHub Pages. Les données sont enregistrées dans la branche `data` de ce
dépôt, **chiffrées dans le navigateur** (AES-256) avant l'envoi : sans compte et mot de passe, les fichiers sont
illisibles, et les noms d'utilisateur n'y apparaissent pas en clair. Chaque personne ne reçoit que les clés des
onglets qu'elle a le droit de voir.

Premier démarrage : se connecter avec **admin / admin**, puis choisir un vrai mot de passe (10 caractères minimum)
et coller un jeton GitHub (Fine-grained, dépôt `unilumin-africa-office`, *Contents : Read and write*).

---

## Version « PC du bureau » (optionnelle)

Le reste de ce document décrit l'ancienne version qui tourne sur un PC du bureau (dossiers `server/`, `public/`).

Elle remplace aussi le Google Sheet « Suivi des dossiers » :

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

**Démarrage automatique (recommandé)** : clic droit sur **`installer-demarrage-auto.bat`** → *Exécuter en tant
qu'administrateur*. Le site tourne alors en arrière-plan, redémarre avec Windows (même sans ouvrir de session) et le PC
ne se met plus en veille. Le code d'installation et le journal sont dans `data\serveur.log`.

Conseil : extraire le site dans un dossier **sans espace** dans le chemin, par exemple `C:\UniluminOffice`.

## 🌍 Accès depuis partout (events, maison, 4G)

Le PC du bureau reste le serveur ; **Tailscale Funnel** (gratuit) lui donne une adresse publique sécurisée
`https://…ts.net`, sans acheter de nom de domaine ni toucher à la box Internet. Les collègues n'installent rien :
ils ouvrent simplement le lien sur leur téléphone ou leur PC.

1. Créer un compte gratuit sur <https://tailscale.com> (avec un compte Google, par exemple).
2. Installer **Tailscale sur le PC du bureau uniquement** et se connecter.
3. Dans la console Tailscale (<https://login.tailscale.com/admin>) :
   - **Machines** → renommer le PC du bureau, par exemple `unilumin-office` (ce nom apparaît dans l'adresse) ;
   - **DNS** → activer **MagicDNS** et **HTTPS Certificates**.
4. Sur le PC du bureau, ouvrir un terminal **en administrateur** et taper :

   ```
   tailscale funnel --bg 3000
   ```

   La première fois, Tailscale affiche un lien pour autoriser Funnel : l'ouvrir et accepter.
   La commande affiche l'adresse du site, par exemple `https://unilumin-office.tailXXXX.ts.net`.
5. Donner cette adresse à l'équipe. Elle fonctionne partout, en `https://` (cadenas), et reste la même.

Pour arrêter l'accès depuis Internet : `tailscale funnel reset` (le site reste utilisable au bureau).

**Protection** : le site est alors visible sur Internet, mais rien n'est lisible sans compte. Les connexions passent en
`https://`, les cookies sont sécurisés, et les essais de mot de passe sont limités (par compte et par adresse).
Choisissez des mots de passe solides et désactivez dans « Équipe & comptes » le compte d'une personne qui quitte l'équipe.

Si le PC du bureau est éteint ou si Internet est coupé au bureau, le site n'est plus joignable depuis l'extérieur.

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

- Au bureau, l'adresse `http://192.168.x.x:3000` passe en clair sur le Wi-Fi interne : de préférence, utilisez
  partout l'adresse `https://…ts.net` (elle marche aussi au bureau).
- Copier le dossier `data/` sur une clé USB de temps en temps = sauvegarde hors du PC.

## Pour les développeurs

Node.js ≥ 22.5 (SQLite intégré), Express, JavaScript sans étape de compilation.

```
npm install
npm start          # http://localhost:3000
npm test
UAO_DATA=./demo-data node --no-warnings scripts/demo-seed.js   # données fictives pour essayer
```
