/* Données de DÉMONSTRATION (fictives) pour essayer le site. N'utilisez pas sur la vraie base.
   UAO_DATA=./demo-data node --no-warnings scripts/demo-seed.js */
import { db, nowIso } from '../server/db.js';
import { hashPassword } from '../server/auth.js';
import { todayStr, addDays } from '../public/js/schema.js';

const T = todayStr(), D = n => addDays(T, n), now = nowIso();
if (!db.prepare('SELECT 1 FROM users').get()) {
  db.prepare('INSERT INTO users(email, name, role, pass_hash) VALUES(?,?,?,?)').run('admin@demo.tn', 'Admin Démo', 'admin', hashPassword('demo1234'));
  db.prepare('INSERT INTO users(email, name, role, pass_hash) VALUES(?,?,?,?)').run('membre@demo.tn', 'Sami', 'member', hashPassword('demo1234'));
}
const team = [['📐', 'Admin Démo', 'Conception et qualité'], ['🤝', 'Sami', 'Commercial'], ['🎬', 'Lina', 'Événementiel'], ['🔧', 'Karim', 'SAV et installations'], ['🛠️', 'Omar', 'Installateur']];
team.forEach(([icon, name, role], i) => db.prepare('INSERT OR IGNORE INTO team(name, icon, role, sort) VALUES(?,?,?,?)').run(name, icon, role, i));
const stock = [['Écran A P3.9 outdoor', 'Écran LED', 96], ['Écran B P2.6 indoor', 'Écran LED', 64], ['Totem tactile', 'Totem / kiosque', 2], ['TV 65"', 'TV / affichage', 4]];
stock.forEach(([art, cat, tot], i) => db.prepare('INSERT INTO stock(art, cat, tot, unit, sort, updated_at) VALUES(?,?,?,?,?,?)').run(art, cat, tot, tot > 10 ? 'Cabinet' : 'Pièce', i, now));
let n = {};
const add = (kind, data, majd = T) => {
  n[kind] = (n[kind] || 0) + 1;
  db.prepare('INSERT INTO dossiers(kind, n, data, created_at, created_by, updated_at, updated_by) VALUES(?,?,?,?,?,?,?)')
    .run(kind, n[kind], JSON.stringify({ majd, majp: 'Sami', ...data }), now, 'Sami', now, 'Sami');
};
add('proj', { name: 'Clinique Exemple', resp: 'Sami', etat: 'Devis en préparation', prio: '🔥 Très haute', l: '4', h: '2.5', io: 'Indoor', first: D(-12), next: 'Envoyer le devis' }, D(-12));
add('proj', { name: 'Hôtel Démo', resp: 'Sami', etat: 'Offre envoyée – attente client', prio: 'Haute', devis: 'Oui', ddevis: D(-15), rep: D(2), constr: D(10), liv: D(20) });
add('proj', { name: 'Hôtel Démo', resp: 'Admin Démo', etat: 'Dossier tech. en préparation', prio: 'Moyenne' });
add('proj', { name: 'Banque Test', resp: 'Admin Démo', etat: 'Livré / Installé', liv: D(-3) });
add('ev', { name: 'Salon Démo', lieu: 'Palais des Congrès', resp: 'Lina', eq: 'Omar, Karim', etat: 'Confirmé', prio: 'Haute', deb: D(1), fin: D(2), hm: '8h', m1: 'Écran A P3.9 outdoor', q1: '60' });
add('ev', { name: 'Gala Test', lieu: 'Hôtel Démo', resp: 'Lina', etat: 'En attente client', deb: D(2), m1: 'Écran A P3.9 outdoor', q1: '50', l1: '4', h1: '3' });
add('ev', { name: 'Concert annulé', lieu: 'Stade', resp: 'Lina', etat: 'Annulé', deb: D(3), m1: 'Écran A P3.9 outdoor', q1: '90' });
add('ev', { name: 'Conférence', lieu: 'Centre Urbain', resp: 'Sami', etat: 'Terminé', deb: T });
add('ao', { name: 'Ministère Exemple', resp: 'Admin Démo', etat: 'Dossier en préparation', depot: D(6), obj: 'Écran outdoor 20 m²' });
add('ex', { name: 'Client Export', pays: 'Algérie', resp: 'Sami', etat: 'En négociation', exp: D(14) });
add('sav', { name: 'Magasin Test', type: 'Intervention sur site', lieu: 'Tunis', resp: 'Karim', etat: 'Nouveau / à diagnostiquer', ech: D(-2), recu: D(-5) });
add('sav', { name: 'Client en ligne', type: 'Assistance en ligne', lieu: 'Online', resp: 'Karim', etat: 'Terminé', ech: T });
add('hq', { name: 'Société Démo', contact: 'M. Exemple', tel: '00 00 00 00', pays: 'Tunisie', demande: 'Écran pour vitrine', etat: 'Nouveau', recu: D(-1) });
console.log('✅ Données de démo ajoutées. Comptes : admin@demo.tn / membre@demo.tn — mot de passe demo1234');
