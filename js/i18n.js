/* Textes de l'interface FR / EN */
const T = {
  accueil: ['Accueil', 'Home'], agenda: ['Agenda', 'Agenda'], calendrier: ['Calendrier', 'Calendar'], stock: ['Stock', 'Stock'],
  corbeille: ['Corbeille', 'Bin'], admin: ['Équipe & accès', 'Team & access'], versions: ['Versions', 'Versions'],
  logout: ['Se déconnecter', 'Log out'], search: ['Rechercher un dossier, client, lieu, téléphone…', 'Search a file, client, venue, phone…'],
  newDossier: ['Nouveau dossier', 'New file'], save: ['Enregistrer', 'Save'], cancel: ['Annuler', 'Cancel'],
  delete: ['Mettre à la corbeille', 'Move to bin'], restore: ['Restaurer', 'Restore'], purge: ['Supprimer définitivement', 'Delete for good'],
  print: ['Imprimer / PDF', 'Print / PDF'], history: ['Historique', 'History'], all: ['Tous', 'All'], owner: ['Responsable', 'Owner'],
  showClosed: ['Afficher les terminés / perdus', 'Show done / lost'], noData: ['Aucun dossier', 'No files'],
  open: ['Ouvrir', 'Open'], back: ['Retour', 'Back'], add: ['Ajouter', 'Add'], loggedAs: ['Connecté :', 'Signed in:'],
  password: ['Mot de passe', 'Password'], email: ['E-mail', 'E-mail'], login: ['Se connecter', 'Sign in'],
  saved: ['Enregistré ✓', 'Saved ✓'], offline: ['Hors ligne – les modifications attendent la connexion', 'Offline – changes are waiting for the connection'],
  today: ['Aujourd\'hui', 'Today'], tomorrow: ['Demain', 'Tomorrow'], inDays: ['Dans {n} j', 'In {n} days'], daysAgo: ['Il y a {n} j', '{n} days ago'],
  done: ['✅ Terminé', '✅ Done'], now: ['▶ En cours', '▶ Now'], inHours: ['⏱ Dans {n} h', '⏱ In {n} h'], inMin: ['⏱ Dans {n} min', '⏱ In {n} min'],
  changePw: ['Changer mon mot de passe', 'Change my password'], lang: ['English', 'Français']
};
let lang = 'fr';
export function setLang(l) { lang = l === 'en' ? 'en' : 'fr'; document.documentElement.lang = lang; }
export function getLang() { return lang; }
export function t(key, vars) {
  const e = T[key]; let s = e ? e[lang === 'en' ? 1 : 0] : key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace('{' + k + '}', v);
  return s;
}
export function L(fr, en) { return lang === 'en' ? en : fr; }
