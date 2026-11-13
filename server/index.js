/* Unilumin Africa Office — serveur.
   Lance avec « npm start », puis ouvrir http://<adresse-du-PC>:3000 depuis n'importe quel PC ou téléphone du réseau. */
import express from 'express';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { db, tx, nowIso, meta, backup, DB_PATH } from './db.js';
import * as auth from './auth.js';
import * as S from '../public/js/schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, '..', 'public');
const PORT = +process.env.PORT || 3000;
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 'loopback');

/* ---------- En-têtes de sécurité ---------- */
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});
app.use(express.json({ limit: '2mb' }));

/* Toute modification doit venir de l'application (protection CSRF en plus du cookie SameSite=Strict) */
app.use('/api', (req, res, next) => {
  if (req.method !== 'GET' && req.headers['x-uao'] !== '1') return res.status(403).json({ error: 'Requête refusée.' });
  next();
});

const usersCount = () => db.prepare('SELECT COUNT(*) AS n FROM users').get().n;

/* ---------- Connexion ---------- */
app.get('/api/status', (req, res) => {
  const u = auth.currentUser(req);
  res.json({ needsSetup: usersCount() === 0, user: u ? publicUser(u) : null, version: S.APP_VERSION });
});
app.post('/api/setup', (req, res) => {
  if (usersCount() > 0) return res.status(403).json({ error: 'Déjà installé.' });
  const { code, email, name, password } = req.body || {};
  if (String(code || '').trim().toUpperCase() !== auth.SETUP_CODE) return res.status(403).json({ error: 'Code d\'installation incorrect (voir la fenêtre du serveur).' });
  const err = checkUserInput(email, name) || auth.passwordProblem(password);
  if (err) return res.status(400).json({ error: err });
  const id = db.prepare('INSERT INTO users(email, name, role, pass_hash) VALUES(?,?,?,?)').run(email.trim(), name.trim(), 'admin', auth.hashPassword(password)).lastInsertRowid;
  ensureTeamMember(name.trim(), email.trim());
  auth.createSession(res, req, id);
  res.json({ ok: true });
});
app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  const key = (req.ip || '') + '|' + String(email || '').toLowerCase();
  if (auth.tooManyAttempts(key)) return res.status(429).json({ error: 'Trop d\'essais. Réessayez dans 15 minutes.' });
  const u = db.prepare('SELECT * FROM users WHERE email = ? AND active = 1').get(String(email || '').trim());
  if (!u || !auth.checkPassword(String(password || ''), u.pass_hash)) {
    auth.noteFailure(key);
    return res.status(401).json({ error: 'E-mail ou mot de passe incorrect.' });
  }
  auth.clearFailures(key);
  auth.createSession(res, req, u.id);
  res.json({ ok: true, user: publicUser(u) });
});
app.post('/api/logout', (req, res) => { auth.destroySession(req, res); res.json({ ok: true }); });

/* ---------- Tout ce qui suit demande d'être connecté ---------- */
app.use('/api', (req, res, next) => {
  const u = auth.currentUser(req);
  if (!u) return res.status(401).json({ error: 'Connexion requise.' });
  req.user = u;
  next();
});
const adminOnly = (req, res, next) => req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Réservé à l\'administrateur.' });

app.post('/api/me/password', (req, res) => {
  const { current, password } = req.body || {};
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!auth.checkPassword(String(current || ''), u.pass_hash)) return res.status(400).json({ error: 'Mot de passe actuel incorrect.' });
  const err = auth.passwordProblem(password); if (err) return res.status(400).json({ error: err });
  db.prepare('UPDATE users SET pass_hash = ?, must_change = 0 WHERE id = ?').run(auth.hashPassword(password), u.id);
  res.json({ ok: true });
});
app.post('/api/me/lang', (req, res) => {
  const lang = req.body?.lang === 'en' ? 'en' : 'fr';
  db.prepare('UPDATE users SET lang = ? WHERE id = ?').run(lang, req.user.id);
  res.json({ ok: true });
});

/* ---------- Données ---------- */
app.get('/api/data', (req, res) => {
  const since = typeof req.query.since === 'string' ? req.query.since : '';
  const rows = since
    ? db.prepare('SELECT * FROM dossiers WHERE updated_at > ? ORDER BY id').all(since)
    : db.prepare('SELECT * FROM dossiers ORDER BY id').all();
  res.json({
    serverTime: nowIso(),
    full: !since,
    dossiers: rows.map(rowOut),
    stock: db.prepare('SELECT * FROM stock ORDER BY sort, id').all(),
    team: db.prepare('SELECT id, name, icon, role, sort FROM team ORDER BY sort, id').all(),
    sugg: suggLists(),
    me: publicUser(req.user)
  });
});

app.post('/api/dossiers', (req, res) => {
  const kind = req.body?.kind;
  if (!S.KINDS[kind]) return res.status(400).json({ error: 'Type de dossier inconnu.' });
  let data;
  try { data = clean(kind, req.body.data || {}); } catch (e) { return res.status(400).json({ error: e.message }); }
  if (!data.name) return res.status(400).json({ error: 'Le nom du dossier est obligatoire.' });
  const out = tx(() => createDossier(kind, data, req.user));
  res.json(out);
});

app.patch('/api/dossiers/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM dossiers WHERE id = ?').get(+req.params.id);
  if (!row || row.deleted_at) return res.status(404).json({ error: 'Dossier introuvable (peut-être supprimé).' });
  let changes;
  try { changes = clean(row.kind, req.body?.changes || {}, true); } catch (e) { return res.status(400).json({ error: e.message }); }
  if ('name' in changes && !changes.name) return res.status(400).json({ error: 'Le nom du dossier est obligatoire.' });
  const out = tx(() => updateDossier(row, changes, req.user));
  res.json(out);
});

/* Corbeille : tout le monde peut mettre à la corbeille ; seul l'admin restaure ou supprime définitivement */
app.delete('/api/dossiers/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM dossiers WHERE id = ?').get(+req.params.id);
  if (!row || row.deleted_at) return res.status(404).json({ error: 'Dossier introuvable.' });
  const t = nowIso();
  db.prepare('UPDATE dossiers SET deleted_at = ?, deleted_by = ?, updated_at = ?, updated_by = ? WHERE id = ?').run(t, req.user.name, t, req.user.name, row.id);
  db.prepare('INSERT INTO history(dossier_id, at, who, field, before, after) VALUES(?,?,?,?,?,?)').run(row.id, t, req.user.name, '🗑️', '', 'Mis à la corbeille');
  res.json(rowOut(db.prepare('SELECT * FROM dossiers WHERE id = ?').get(row.id)));
});
app.post('/api/dossiers/:id/restore', adminOnly, (req, res) => {
  const row = db.prepare('SELECT * FROM dossiers WHERE id = ?').get(+req.params.id);
  if (!row || !row.deleted_at) return res.status(404).json({ error: 'Rien à restaurer.' });
  const t = nowIso();
  db.prepare('UPDATE dossiers SET deleted_at = NULL, deleted_by = NULL, updated_at = ?, updated_by = ? WHERE id = ?').run(t, req.user.name, row.id);
  db.prepare('INSERT INTO history(dossier_id, at, who, field, before, after) VALUES(?,?,?,?,?,?)').run(row.id, t, req.user.name, '♻️', '', 'Restauré');
  res.json(rowOut(db.prepare('SELECT * FROM dossiers WHERE id = ?').get(row.id)));
});
app.delete('/api/dossiers/:id/purge', adminOnly, (req, res) => {
  const row = db.prepare('SELECT * FROM dossiers WHERE id = ?').get(+req.params.id);
  if (!row || !row.deleted_at) return res.status(400).json({ error: 'Seul un dossier de la corbeille peut être supprimé définitivement.' });
  tx(() => {
    db.prepare('DELETE FROM history WHERE dossier_id = ?').run(row.id);
    db.prepare('DELETE FROM dossiers WHERE id = ?').run(row.id);
    meta('purged', JSON.stringify([...(JSON.parse(meta('purged') || '[]')), { id: row.id, at: nowIso() }].slice(-500)));
  });
  res.json({ ok: true, id: row.id, purged: true });
});

app.get('/api/dossiers/:id/history', (req, res) => {
  res.json(db.prepare('SELECT at, who, field, before, after FROM history WHERE dossier_id = ? ORDER BY id DESC LIMIT 300').all(+req.params.id));
});

/* 📞 Contact siège → transfert vers Projets / Events / AO / Export */
app.post('/api/dossiers/:id/transfer', (req, res) => {
  const row = db.prepare('SELECT * FROM dossiers WHERE id = ?').get(+req.params.id);
  const dest = req.body?.dest;
  if (!row || row.kind !== 'hq' || row.deleted_at) return res.status(404).json({ error: 'Contact introuvable.' });
  if (!S.HQ_DEST.includes(dest)) return res.status(400).json({ error: 'Destination inconnue.' });
  const d = JSON.parse(row.data);
  if (d.transfert) return res.status(400).json({ error: 'Déjà transféré vers ' + d.transfert + '.' });
  const out = tx(() => {
    const nd = { name: d.name, resp: d.resp || req.user.name, etat: S.HQ_INIT_STATE[dest], contact: d.contact || '', tel: d.tel || '', next: d.next || '' };
    const com = ['📞 Contact via le siège (Chine)' + (d.recu ? ' le ' + S.fmtDate(d.recu) : ''), d.demande, d.com, d.email ? 'E-mail : ' + d.email : ''].filter(Boolean).join('\n');
    if (dest === 'proj') { nd.com = com; nd.first = d.recu || S.todayStr(); }
    if (dest === 'ev') { nd.com = com; }
    if (dest === 'ao') { nd.com = com; nd.obj = d.demande || ''; }
    if (dest === 'ex') { nd.com = com; nd.pays = d.pays || ''; nd.first = d.recu || S.todayStr(); }
    const created = createDossier(dest, clean(dest, nd), req.user);
    const label = S.KINDS[dest].icon + ' ' + S.KINDS[dest].fr + ' n°' + created.n;
    const hq = updateDossier(row, { etat: 'Accepté – transféré', transfert: label }, req.user);
    return { created, hq };
  });
  res.json(out);
});

/* ---------- Stock ---------- */
app.post('/api/stock', (req, res) => {
  const s = cleanStock(req.body || {}); if (!s.art) return res.status(400).json({ error: 'Nom de l\'article obligatoire.' });
  const max = db.prepare('SELECT COALESCE(MAX(sort),0) AS m FROM stock').get().m;
  const id = db.prepare('INSERT INTO stock(art, cat, info, w, h, tot, sav, unit, lim, rem, sort, updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(s.art, s.cat, s.info, s.w, s.h, s.tot, s.sav, s.unit, s.lim, s.rem, max + 1, nowIso()).lastInsertRowid;
  res.json(db.prepare('SELECT * FROM stock WHERE id = ?').get(id));
});
app.patch('/api/stock/:id', (req, res) => {
  const cur = db.prepare('SELECT * FROM stock WHERE id = ?').get(+req.params.id);
  if (!cur) return res.status(404).json({ error: 'Article introuvable.' });
  const s = cleanStock({ ...cur, ...(req.body || {}) });
  db.prepare('UPDATE stock SET art=?, cat=?, info=?, w=?, h=?, tot=?, sav=?, unit=?, lim=?, rem=?, updated_at=? WHERE id=?')
    .run(s.art, s.cat, s.info, s.w, s.h, s.tot, s.sav, s.unit, s.lim, s.rem, nowIso(), cur.id);
  res.json(db.prepare('SELECT * FROM stock WHERE id = ?').get(cur.id));
});
app.delete('/api/stock/:id', adminOnly, (req, res) => { db.prepare('DELETE FROM stock WHERE id = ?').run(+req.params.id); res.json({ ok: true }); });

/* ---------- Équipe (organigramme) et comptes ---------- */
app.put('/api/team', adminOnly, (req, res) => {
  const list = Array.isArray(req.body) ? req.body : [];
  tx(() => {
    db.prepare('DELETE FROM team').run();
    const ins = db.prepare('INSERT INTO team(name, icon, role, sort) VALUES(?,?,?,?)');
    list.forEach((m, i) => { const n = str(m.name, 60); if (n) ins.run(n, str(m.icon, 8), str(m.role, 200), i); });
  });
  res.json(db.prepare('SELECT id, name, icon, role, sort FROM team ORDER BY sort').all());
});
app.get('/api/users', adminOnly, (req, res) => {
  res.json(db.prepare('SELECT id, email, name, role, active, must_change, created_at FROM users ORDER BY name').all());
});
app.post('/api/users', adminOnly, (req, res) => {
  const { email, name, role, password } = req.body || {};
  const err = checkUserInput(email, name) || auth.passwordProblem(password);
  if (err) return res.status(400).json({ error: err });
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email.trim())) return res.status(400).json({ error: 'Cet e-mail a déjà un compte.' });
  db.prepare('INSERT INTO users(email, name, role, pass_hash, must_change) VALUES(?,?,?,?,1)')
    .run(email.trim(), name.trim(), role === 'admin' ? 'admin' : 'member', auth.hashPassword(password));
  ensureTeamMember(name.trim(), email.trim());
  res.json({ ok: true });
});
app.patch('/api/users/:id', adminOnly, (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(+req.params.id);
  if (!u) return res.status(404).json({ error: 'Compte introuvable.' });
  const b = req.body || {};
  if (u.id === req.user.id && (b.active === false || b.role === 'member')) return res.status(400).json({ error: 'Vous ne pouvez pas retirer vos propres droits d\'admin.' });
  if (b.password !== undefined) {
    const err = auth.passwordProblem(b.password); if (err) return res.status(400).json({ error: err });
    db.prepare('UPDATE users SET pass_hash = ?, must_change = 1 WHERE id = ?').run(auth.hashPassword(b.password), u.id);
    auth.revokeUserSessions(u.id);
  }
  if (b.role) db.prepare('UPDATE users SET role = ? WHERE id = ?').run(b.role === 'admin' ? 'admin' : 'member', u.id);
  if (b.active !== undefined) { db.prepare('UPDATE users SET active = ? WHERE id = ?').run(b.active ? 1 : 0, u.id); if (!b.active) auth.revokeUserSessions(u.id); }
  if (b.name) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(str(b.name, 60), u.id);
  res.json({ ok: true });
});

/* Listes de suggestions (lieux, pays, …) : l'admin peut les nettoyer */
app.put('/api/sugg/:list', adminOnly, (req, res) => {
  const list = req.params.list;
  if (!(list in S.DEFAULT_SUGG)) return res.status(400).json({ error: 'Liste inconnue.' });
  const vals = (Array.isArray(req.body) ? req.body : []).map(v => str(v, 120)).filter(Boolean);
  tx(() => {
    db.prepare('DELETE FROM sugg WHERE list = ?').run(list);
    const ins = db.prepare('INSERT OR IGNORE INTO sugg(list, value) VALUES(?,?)');
    vals.forEach(v => ins.run(list, v));
  });
  meta('sugg_init_' + list, '1');
  res.json(suggLists());
});

/* ---------- Pages ---------- */
app.use(express.static(PUBLIC, { index: false, maxAge: 0 }));
app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(PUBLIC, 'index.html')));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur du serveur : ' + (err.message || err) });
});

/* ================= Fonctions ================= */
function publicUser(u) { return { id: u.id, email: u.email, name: u.name, role: u.role, lang: u.lang, mustChange: !!u.must_change }; }
function rowOut(r) {
  return { id: r.id, kind: r.kind, n: r.n, data: JSON.parse(r.data), created_at: r.created_at, created_by: r.created_by,
           updated_at: r.updated_at, updated_by: r.updated_by, deleted_at: r.deleted_at, deleted_by: r.deleted_by };
}
function str(v, max = 4000) { return v === null || v === undefined ? '' : String(v).replace(/\u0000/g, '').trim().slice(0, max); }
function checkUserInput(email, name) {
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'E-mail invalide.';
  if (typeof name !== 'string' || !name.trim()) return 'Nom obligatoire.';
  return null;
}
function ensureTeamMember(name, email) {
  if (!db.prepare('SELECT 1 FROM team WHERE name = ?').get(name)) {
    const max = db.prepare('SELECT COALESCE(MAX(sort),0) AS m FROM team').get().m;
    db.prepare('INSERT INTO team(name, icon, role, email, sort) VALUES(?,?,?,?,?)').run(name, '', '', email, max + 1);
  }
}

/* Ne garde que les champs connus, au bon format */
function clean(kind, input, partial = false) {
  const out = {};
  for (const f of S.FIELDS[kind]) {
    if (!(f.k in input)) continue;
    if (f.auto && !['transfert'].includes(f.k)) continue;
    let v = input[f.k];
    if (v === null || v === undefined) v = '';
    if (f.t === 'date') {
      v = str(v, 10);
      if (v && !S.isDate(v)) throw new Error('Date invalide pour « ' + f.fr + ' ».');
    } else if (f.t === 'num') {
      v = str(v, 20).replace(',', '.');
      if (v && isNaN(parseFloat(v))) throw new Error('Nombre invalide pour « ' + f.fr + ' ».');
    } else {
      v = str(v, f.t === 'long' ? 8000 : 500);
    }
    out[f.k] = v;
  }
  return out;
}

function nextNumber(kind) { return db.prepare('SELECT COALESCE(MAX(n),0) + 1 AS n FROM dossiers WHERE kind = ?').get(kind).n; }

function applyRules(kind, d, user) {
  d.majd = S.todayStr();
  d.majp = user.name;
  if (kind === 'sav' && d.type === S.SAV_ONLINE_TYPE && !d.lieu) d.lieu = S.ONLINE;
  if (kind !== 'hq') d.prio = S.autoPriority(kind, d);
  if (kind === 'hq' && !d.etat) d.etat = 'Nouveau';
  if (kind === 'hq' && !d.recu) d.recu = S.todayStr();
  if (kind === 'sav' && !d.recu) d.recu = S.todayStr();
  memorize(kind, d);
  return d;
}
function memorize(kind, d) {
  const ins = db.prepare('INSERT OR IGNORE INTO sugg(list, value) VALUES(?,?)');
  for (const f of S.FIELDS[kind]) {
    if (!f.sugg || !d[f.k] || f.sugg === 'heures' || f.sugg === 'next') continue;
    ins.run(f.sugg, d[f.k]);
  }
  if (d.st) for (const p of String(d.st).split(/\s*[,;]\s*/)) if (p) ins.run('st', p);
}
function createDossier(kind, data, user) {
  const t = nowIso();
  const d = applyRules(kind, { ...data }, user);
  const n = nextNumber(kind);
  const id = db.prepare('INSERT INTO dossiers(kind, n, data, created_at, created_by, updated_at, updated_by) VALUES(?,?,?,?,?,?,?)')
    .run(kind, n, JSON.stringify(d), t, user.name, t, user.name).lastInsertRowid;
  db.prepare('INSERT INTO history(dossier_id, at, who, field, before, after) VALUES(?,?,?,?,?,?)').run(id, t, user.name, '➕', '', 'Dossier créé');
  return rowOut(db.prepare('SELECT * FROM dossiers WHERE id = ?').get(id));
}
function updateDossier(row, changes, user) {
  const before = JSON.parse(row.data);
  const after = applyRules(row.kind, { ...before, ...changes }, user);
  const t = nowIso();
  const h = db.prepare('INSERT INTO history(dossier_id, at, who, field, before, after) VALUES(?,?,?,?,?,?)');
  for (const k of Object.keys(after)) {
    if (k === 'majd' || k === 'majp') continue;
    if ((before[k] || '') !== (after[k] || '')) h.run(row.id, t, user.name, k, before[k] || '', after[k] || '');
  }
  db.prepare('UPDATE dossiers SET data = ?, updated_at = ?, updated_by = ? WHERE id = ?').run(JSON.stringify(after), t, user.name, row.id);
  return rowOut(db.prepare('SELECT * FROM dossiers WHERE id = ?').get(row.id));
}
function cleanStock(b) {
  const n = v => { const x = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(x) ? 0 : x; };
  const lim = str(b.lim, 10);
  return { art: str(b.art, 120), cat: str(b.cat, 60), info: str(b.info, 400), w: n(b.w) || null, h: n(b.h) || null,
           tot: n(b.tot), sav: n(b.sav), unit: str(b.unit, 20) || 'Cabinet', lim: S.isDate(lim) ? lim : '', rem: str(b.rem, 400) };
}
function suggLists() {
  const out = {};
  for (const [k, def] of Object.entries(S.DEFAULT_SUGG)) {
    const rows = db.prepare('SELECT value FROM sugg WHERE list = ?').all(k).map(r => r.value);
    const base = meta('sugg_init_' + k) ? [] : def;
    out[k] = [...new Set([...base, ...rows])].sort((a, b) => k === 'heures' || k === 'next' || k === 'pitch' ? 0 : a.localeCompare(b, 'fr'));
  }
  return out;
}

/* ================= Démarrage ================= */
setInterval(() => { try { backup(); } catch (e) { console.error('Sauvegarde :', e.message); } }, 3600000);
try { backup(); } catch (e) { console.error('Sauvegarde :', e.message); }
db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(nowIso());

export function start(port = PORT) {
  return app.listen(port, '0.0.0.0', () => {
    const ips = Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
    console.log('\n  ✅ Unilumin Africa Office est lancé');
    console.log('     Sur ce PC        : http://localhost:' + port);
    ips.forEach(ip => console.log('     Autres PC / tél. : http://' + ip + ':' + port));
    console.log('     Données          : ' + DB_PATH);
    if (usersCount() === 0) console.log('\n  🔑 Premier démarrage : code d\'installation = ' + auth.SETUP_CODE + '\n');
  });
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) start();
export { app };
