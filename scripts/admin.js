/* Outil en ligne de commande :
   npm run admin -- create  email  "Nom"  motdepasse  [admin|member]
   npm run admin -- reset   email  nouveaumotdepasse
   npm run admin -- list */
import { db } from '../server/db.js';
import { hashPassword, passwordProblem, revokeUserSessions } from '../server/auth.js';

const [cmd, a, b, c, d] = process.argv.slice(2);
if (cmd === 'list') {
  console.table(db.prepare('SELECT id, email, name, role, active FROM users').all());
} else if (cmd === 'create') {
  const err = passwordProblem(c); if (err || !a || !b) { console.error(err || 'Usage : create email "Nom" motdepasse [admin|member]'); process.exit(1); }
  db.prepare('INSERT INTO users(email, name, role, pass_hash, must_change) VALUES(?,?,?,?,?)').run(a, b, d === 'admin' ? 'admin' : 'member', hashPassword(c), d === 'admin' ? 0 : 1);
  console.log('✅ Compte créé :', a);
} else if (cmd === 'reset') {
  const err = passwordProblem(b); if (err) { console.error(err); process.exit(1); }
  const u = db.prepare('SELECT id FROM users WHERE email = ?').get(a); if (!u) { console.error('Compte introuvable'); process.exit(1); }
  db.prepare('UPDATE users SET pass_hash = ?, active = 1 WHERE id = ?').run(hashPassword(b), u.id); revokeUserSessions(u.id);
  console.log('✅ Mot de passe changé pour', a);
} else {
  console.log('Usage : npm run admin -- list | create email "Nom" motdepasse [admin|member] | reset email motdepasse');
}
