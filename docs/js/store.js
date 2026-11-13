/* Données de l'équipe, stockées chiffrées sur GitHub (branche « data »).
   Connexion = ouvrir son trousseau avec son mot de passe. Chaque personne ne reçoit que les clés des onglets qu'elle peut voir. */
import * as S from './schema.js';
import * as C from './crypto.js';
import * as G from './gh.js';
import { withRepairs } from './stockcalc.js';

export const AREAS = ['proj', 'ev', 'ao', 'ex', 'sav', 'hq', 'stock'];
export const store = {
  me: { username: '', name: '', role: 'member', perms: {} }, canWrite: true,
  dossiers: new Map(), stock: [], team: [], sugg: {}, listeners: new Set(), ready: false
};
let keys = {};          // zone → CryptoKey
let rawKeys = {};       // zone → clé brute (pour l'admin qui crée des comptes)
let bundle = null;      // trousseau ouvert
let shas = {};          // chemin → version du fichier
export function on(fn) { store.listeners.add(fn); return () => store.listeners.delete(fn); }
function emit(what) { for (const fn of store.listeners) { try { fn(what); } catch (e) { console.error(e); } } }

/* ---------- Droits ---------- */
export function level(area) { return store.me.role === 'admin' ? 'edit' : (store.me.perms[area] || 'none'); }
export const canView = area => level(area) !== 'none';
export const canEdit = area => level(area) === 'edit';

/* ---------- Connexion ---------- */
const SKEY = 'uao_session';
function remember(uk, b) { try { sessionStorage.setItem(SKEY, JSON.stringify({ uk, b })); } catch { /* */ } }
export function forget() { try { sessionStorage.removeItem(SKEY); } catch { /* */ } }

async function useBundle(b) {
  bundle = b;
  rawKeys = { ...b.keys };
  keys = {};
  for (const [k, raw] of Object.entries(b.keys)) keys[k] = await C.importKey(raw);
  G.setToken(b.token);
  store.me = { username: b.username, name: b.name || b.username, role: b.admin ? 'admin' : 'member', perms: b.perms || {}, mustChange: !!b.mustChange, uid: b.uid };
}
export async function resume() {
  let s = null;
  try { s = JSON.parse(sessionStorage.getItem(SKEY) || 'null'); } catch { /* */ }
  if (!s) return false;
  await useBundle(s.b);
  return true;
}
/* Renvoie 'ok', 'setup' (premier démarrage) ou lance une erreur */
export async function login(username, password) {
  const uid = await C.userFileId(username);
  const f = await G.readFile('users/' + uid + '.json', false);
  if (!f) {
    const anyUser = await G.readFile('users/.keep', false).catch(() => null);
    if (!anyUser && username.trim().toLowerCase() === 'admin' && password === 'admin') return 'setup';
    await new Promise(r => setTimeout(r, 600));
    throw new Error('Nom d\'utilisateur ou mot de passe incorrect.');
  }
  let uk;
  try { uk = (await C.open(await C.keyFromPassword(password, f.json.salt, f.json.iter), f.json.pw)).uk; }
  catch { throw new Error('Nom d\'utilisateur ou mot de passe incorrect.'); }
  const b = await C.open(await C.importKey(uk), f.json.bundle);
  b.uid = uid;
  await useBundle(b);
  remember(uk, b);
  return 'ok';
}

/* Fichier d'un utilisateur : trousseau ouvert par son mot de passe ET par la clé admin */
async function userFile(uk, password, b) {
  const salt = C.b64(C.random(16));
  const kek = await C.keyFromPassword(password, salt);
  return { v: 1, salt, iter: C.ITER, pw: await C.seal(kek, { uk }), adm: await C.seal(keys.admin, { uk }), bundle: await C.seal(await C.importKey(uk), b) };
}
function bundleFor(u, token) {
  const k = { config: rawKeys.config };
  for (const a of AREAS) if (u.admin || (u.perms[a] || 'none') !== 'none') k[a] = rawKeys[a];
  if (!k.stock && (u.admin || (u.perms.ev || 'none') !== 'none')) k.stock = rawKeys.stock;   // statut stock des events
  if (u.admin) k.admin = rawKeys.admin;
  return { username: u.username.trim().toLowerCase(), name: u.name || u.username, admin: !!u.admin, perms: u.perms || {}, keys: k, token, mustChange: !!u.mustChange };
}

/* Premier démarrage : crée les clés, le compte admin et les réglages */
export async function firstSetup({ name, password, token }) {
  if (String(password).length < 10) throw new Error('Choisissez un mot de passe d\'au moins 10 caractères.');
  G.setToken(token.trim());
  if (!(await G.repoAccess().catch(() => false))) throw new Error('Ce jeton GitHub ne peut pas écrire dans le dépôt unilumin-africa-office.');
  if (await G.readFile('users/.keep')) throw new Error('Le site est déjà installé. Connectez-vous avec votre compte.');
  rawKeys = {};
  for (const a of [...AREAS, 'config', 'admin']) rawKeys[a] = C.newRawKey();
  keys = {};
  for (const [k, raw] of Object.entries(rawKeys)) keys[k] = await C.importKey(raw);
  const all = Object.fromEntries(AREAS.map(a => [a, 'edit']));
  const b = bundleFor({ username: 'admin', name: name || 'Admin', admin: true, perms: all }, token.trim());
  const uk = C.newRawKey();
  const uid = await C.userFileId('admin');
  await G.writeFile('users/' + uid + '.json', await userFile(uk, password, b), null, 'Création du compte administrateur');
  await G.writeFile('users/.keep', { installed: true }, null, 'Installation');
  b.uid = uid;
  await useBundle(b);
  await G.writeFile('c/sugg.json', { box: await C.seal(keys.config, defaultSugg()) }, null, 'Réglages');
  remember(uk, b);
}
function defaultSugg() { return Object.fromEntries(Object.entries(S.DEFAULT_SUGG).map(([k, v]) => [k, [...v]])); }

export async function changePassword(oldPw, newPw) {
  if (String(newPw).length < 10) throw new Error('Le nouveau mot de passe doit faire au moins 10 caractères.');
  const path = 'users/' + store.me.uid + '.json';
  const f = await G.readFile(path);
  let uk;
  try { uk = (await C.open(await C.keyFromPassword(oldPw, f.json.salt, f.json.iter), f.json.pw)).uk; } catch { throw new Error('Mot de passe actuel incorrect.'); }
  const b = await C.open(await C.importKey(uk), f.json.bundle);
  b.mustChange = false;
  const salt = C.b64(C.random(16));
  const json = { ...f.json, salt, iter: C.ITER, pw: await C.seal(await C.keyFromPassword(newPw, salt), { uk }), bundle: await C.seal(await C.importKey(uk), b) };
  await G.writeFile(path, json, f.sha, 'Changement de mot de passe');
  b.uid = store.me.uid;
  await useBundle(b); remember(uk, b);
}

/* ---------- Comptes (administrateur) ---------- */
export async function listUsers() {
  const t = await G.tree();
  const out = [];
  for (const [path, sha] of Object.entries(t || {})) {
    if (!/^users\/[0-9a-f]{64}\.json$/.test(path)) continue;
    try {
      const f = await G.blob(sha);
      const uk = (await C.open(keys.admin, f.adm)).uk;
      const b = await C.open(await C.importKey(uk), f.bundle);
      out.push({ path, sha, uk, file: f, username: b.username, name: b.name, admin: b.admin, perms: b.perms || {}, mustChange: b.mustChange });
    } catch (e) { console.warn('compte illisible', path, e); }
  }
  return out.sort((a, b) => a.username.localeCompare(b.username));
}
export async function createUser(u) {
  const username = String(u.username || '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{2,40}$/.test(username)) throw new Error('Nom d\'utilisateur : lettres, chiffres, point ou tiret (2 à 40).');
  if (String(u.password || '').length < 10) throw new Error('Mot de passe : 10 caractères minimum.');
  const uid = await C.userFileId(username);
  if (await G.readFile('users/' + uid + '.json')) throw new Error('Ce nom d\'utilisateur existe déjà.');
  const uk = C.newRawKey();
  const b = bundleFor({ ...u, username, mustChange: true }, bundle.token);
  await G.writeFile('users/' + uid + '.json', await userFile(uk, u.password, b), null, 'Nouveau compte');
}
/* Modifier les droits / le nom / le rôle (et éventuellement le mot de passe) d'un compte existant */
export async function updateUser(entry, changes) {
  const u = { username: entry.username, name: changes.name ?? entry.name, admin: changes.admin ?? entry.admin, perms: changes.perms ?? entry.perms, mustChange: entry.mustChange };
  if (entry.username === store.me.username && !u.admin) throw new Error('Vous ne pouvez pas retirer vos propres droits d\'administrateur.');
  let json;
  if (changes.password) {
    if (String(changes.password).length < 10) throw new Error('Mot de passe : 10 caractères minimum.');
    u.mustChange = true;
    json = await userFile(entry.uk, changes.password, bundleFor(u, bundle.token));
  } else {
    json = { ...entry.file, bundle: await C.seal(await C.importKey(entry.uk), bundleFor(u, bundle.token)) };
  }
  await G.writeFile(entry.path, json, entry.sha, 'Mise à jour d\'un compte');
}
export async function deleteUser(entry) {
  if (entry.username === store.me.username) throw new Error('Vous ne pouvez pas supprimer votre propre compte.');
  await G.deleteFile(entry.path, entry.sha, 'Suppression d\'un compte');
}
/* Nouveau jeton GitHub (ancien révoqué) : on le remet dans tous les trousseaux */
export async function replaceToken(newToken) {
  G.setToken(newToken.trim());
  if (!(await G.repoAccess().catch(() => false))) { G.setToken(bundle.token); throw new Error('Ce jeton ne peut pas écrire dans le dépôt.'); }
  const users = await listUsers();
  for (const e of users) await G.writeFile(e.path, { ...e.file, bundle: await C.seal(await C.importKey(e.uk), bundleFor({ ...e }, newToken.trim())) }, e.sha, 'Mise à jour du jeton');
  bundle.token = newToken.trim();
  try { const s = JSON.parse(sessionStorage.getItem(SKEY)); s.b.token = bundle.token; sessionStorage.setItem(SKEY, JSON.stringify(s)); } catch { /* */ }
}

/* ---------- Chargement et mise à jour automatique ---------- */
async function readBox(path, sha, key) { const j = await G.blob(sha); return C.open(key, j.box); }
export async function load() {
  const t = await G.tree();
  if (!t) throw new Error('Données introuvables sur GitHub.');
  const jobs = [];
  for (const [path, sha] of Object.entries(t)) {
    if (shas[path] === sha) continue;
    let m;
    if ((m = path.match(/^d\/([A-Za-z0-9]+)\.json$/))) {
      jobs.push(async () => {
        const j = await G.blob(sha);
        if (!keys[j.kind]) { shas[path] = sha; return; }
        const rec = await C.open(keys[j.kind], j.box);
        store.dossiers.set(m[1], { ...rec, id: m[1], kind: j.kind, path, sha });
        shas[path] = sha;
      });
    } else if ((m = path.match(/^s\/([A-Za-z0-9]+)\.json$/)) && keys.stock) {
      jobs.push(async () => { const s = await readBox(path, sha, keys.stock); stockMap.set(m[1], { ...s, id: m[1], path, sha }); shas[path] = sha; });
    } else if (path === 'c/team.json' && keys.config) {
      jobs.push(async () => { const v = await readBox(path, sha, keys.config); store.team = v.list || []; shas[path] = sha; });
    } else if (path === 'c/sugg.json' && keys.config) {
      jobs.push(async () => { store.sugg = { ...defaultSugg(), ...(await readBox(path, sha, keys.config)) }; shas[path] = sha; });
    }
  }
  // fichiers supprimés entre-temps
  let changed = jobs.length > 0;
  for (const path of Object.keys(shas)) if (!(path in t)) {
    delete shas[path]; changed = true;
    const id = (path.match(/^[ds]\/([A-Za-z0-9]+)\.json$/) || [])[1];
    if (path.startsWith('d/')) store.dossiers.delete(id); else if (path.startsWith('s/')) stockMap.delete(id);
  }
  for (let i = 0; i < jobs.length; i += 6) await Promise.all(jobs.slice(i, i + 6).map(f => f().catch(e => console.warn('lecture', e))));
  store.stock = [...stockMap.values()].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  if (!store.sugg.lieux) store.sugg = defaultSugg();
  store.ready = true;
  if (changed) emit('data');
}
const stockMap = new Map();
let timer;
export function startPolling() {
  clearInterval(timer);
  timer = setInterval(() => { if (document.visibilityState === 'visible') load().catch(e => console.warn('actualisation', e)); }, 15000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') load().catch(() => {}); });
}

/* ---------- Lecture ---------- */
export function list(kind, { closed = true, deleted = false } = {}) {
  const out = [];
  for (const x of store.dossiers.values()) {
    if (kind && x.kind !== kind) continue;
    if (!!x.deleted_at !== deleted) continue;
    if (!closed && S.isClosed(S.family(x.kind, x.data.etat))) continue;
    out.push(x);
  }
  return out;
}
export function all() { return [...store.dossiers.values()]; }
export function sorted(kind, opts) {
  return list(kind, opts).sort((a, b) => S.compareKeys(S.sortKey(kind, a.data), S.sortKey(kind, b.data)) || (a.n || 0) - (b.n || 0));
}
export function teamNames() { return store.team.map(m => m.name); }
export function teamIcon(name) { const m = store.team.find(x => x.name === name); return m && m.icon ? m.icon + ' ' : ''; }
export function stockNow() { return withRepairs(store.stock, all()); }
export function myName() { return store.me.name || store.me.username || 'Moi'; }
export function personName(_id, fallback = '') { return fallback; }
export async function resolveNames() { return {}; }
export async function getHistory(id) { const x = store.dossiers.get(id); return x ? (x.history || []) : []; }

/* ---------- Écriture ---------- */
function need(area) {
  if (!canEdit(area)) throw new Error('Vous pouvez voir cet onglet, mais pas le modifier.');
}
function rules(kind, d) {
  d.majd = S.todayStr();
  d.majp = myName();
  delete d.majpId;
  if (kind === 'sav' && d.type === S.SAV_ONLINE_TYPE && !d.lieu) d.lieu = S.ONLINE;
  if (kind !== 'hq') d.prio = S.autoPriority(kind, d);
  if (kind === 'hq' && !d.etat) d.etat = 'Nouveau';
  if ((kind === 'hq' || kind === 'sav') && !d.recu) d.recu = S.todayStr();
  return d;
}
function clean(kind, input) {
  const out = {};
  for (const f of S.FIELDS[kind]) {
    if (!(f.k in input)) continue;
    if (f.auto && f.k !== 'transfert') continue;
    let v = String(input[f.k] ?? '').trim().slice(0, f.t === 'long' ? 8000 : 500);
    if (f.t === 'date' && v && !S.isDate(v)) throw new Error('Date invalide pour « ' + f.fr + ' ».');
    if (f.t === 'num' && v) { v = v.replace(',', '.'); if (isNaN(parseFloat(v))) throw new Error('Nombre invalide pour « ' + f.fr + ' ».'); }
    out[f.k] = v;
  }
  return out;
}
const newId = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const stripLocal = x => { const { path, sha, id, ...rec } = x; return rec; };

/* Écrit un dossier ; en cas de modification simultanée par un collègue, on relit et on réapplique */
async function writeDossier(id, mutate, msg) {
  let x = store.dossiers.get(id);
  for (let attempt = 0; attempt < 4; attempt++) {
    const rec = mutate(stripLocal(x));
    const body = { kind: rec.kind, box: await C.seal(keys[rec.kind], rec) };
    try {
      const sha = await G.writeFile('d/' + id + '.json', body, x.sha || null, msg);
      const row = { ...rec, id, kind: rec.kind, path: 'd/' + id + '.json', sha };
      store.dossiers.set(id, row); shas[row.path] = sha;
      emit('data');
      return row;
    } catch (e) {
      if (!(e instanceof G.GhError) || ![409, 422].includes(e.status) || !x.sha) throw e;
      const f = await G.readFile('d/' + id + '.json');
      if (!f) throw new Error('Ce dossier a été supprimé par un collègue.');
      x = { ...(await C.open(keys[f.json.kind], f.json.box)), id, kind: f.json.kind, sha: f.sha };
    }
  }
  throw new Error('Le dossier est modifié en même temps par un collègue. Réessayez.');
}
const hist = (field, before, after) => ({ at: new Date().toISOString(), who: myName(), field, before, after });
const addHist = (rec, entries) => { rec.history = [...entries, ...(rec.history || [])].slice(0, 150); return rec; };

export async function create(kind, data, note) {
  need(kind);
  const d = rules(kind, clean(kind, data));
  if (!d.name) throw new Error('Le nom du dossier est obligatoire.');
  const n = Math.max(0, ...[...store.dossiers.values()].filter(x => x.kind === kind).map(x => x.n || 0)) + 1;
  const id = newId(kind), now = new Date().toISOString();
  store.dossiers.set(id, { id, kind, n, sha: null });
  try {
    const row = await writeDossier(id, () => addHist({ kind, n, data: d, created_at: now, created_by: myName(), updated_at: now, updated_by: myName(), deleted_at: null, deleted_by: null },
      [hist('➕', '', note || 'Dossier créé')]), 'Nouveau dossier');
    memorize(kind, d);
    return row;
  } catch (e) { store.dossiers.delete(id); throw e; }
}
export async function save(id, changes) {
  const x = store.dossiers.get(id);
  if (!x) throw new Error('Dossier introuvable.');
  need(x.kind);
  const ch = clean(x.kind, changes);
  if ('name' in ch && !ch.name) throw new Error('Le nom du dossier est obligatoire.');
  const row = await writeDossier(id, rec => {
    const before = rec.data, after = rules(rec.kind, { ...before, ...ch });
    const h = [];
    for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) {
      if (['majd', 'majp', 'majpId'].includes(k)) continue;
      if ((before[k] || '') !== (after[k] || '')) h.push(hist(k, before[k] || '', after[k] || ''));
    }
    return addHist({ ...rec, data: after, updated_at: new Date().toISOString(), updated_by: myName() }, h);
  }, 'Mise à jour d\'un dossier');
  memorize(x.kind, row.data);
  return row;
}
export async function trash(id) {
  const x = store.dossiers.get(id); need(x.kind);
  await writeDossier(id, rec => addHist({ ...rec, deleted_at: new Date().toISOString(), deleted_by: myName(), deleted_name: myName() }, [hist('🗑️', '', 'Mis à la corbeille')]), 'Corbeille');
}
export async function restore(id) {
  if (store.me.role !== 'admin') throw new Error('Seul l\'administrateur peut restaurer.');
  await writeDossier(id, rec => addHist({ ...rec, deleted_at: null, deleted_by: null, deleted_name: null }, [hist('♻️', '', 'Restauré')]), 'Restauration');
}
export async function purge(id) {
  if (store.me.role !== 'admin') throw new Error('Seul l\'administrateur peut supprimer définitivement.');
  const x = store.dossiers.get(id);
  await G.deleteFile('d/' + id + '.json', x.sha, 'Suppression définitive');
  store.dossiers.delete(id); delete shas['d/' + id + '.json']; emit('data');
}
export async function transfer(id, dest) {
  const x = store.dossiers.get(id);
  if (!x || x.kind !== 'hq') throw new Error('Contact introuvable.');
  const d = x.data;
  if (d.transfert) throw new Error('Déjà transféré vers ' + d.transfert + '.');
  const nd = { name: d.name, resp: d.resp || '', etat: S.HQ_INIT_STATE[dest], contact: d.contact || '', tel: d.tel || '', next: d.next || '',
               com: ['📞 Contact via le siège (Chine)' + (d.recu ? ' le ' + S.fmtDate(d.recu) : ''), d.demande, d.com, d.email ? 'E-mail : ' + d.email : ''].filter(Boolean).join('\n') };
  if (dest === 'proj' || dest === 'ex') nd.first = d.recu || S.todayStr();
  if (dest === 'ao') nd.obj = d.demande || '';
  if (dest === 'ex') nd.pays = d.pays || '';
  const created = await create(dest, nd, 'Créé depuis 📞 Contacts siège');
  await save(id, { etat: 'Accepté – transféré', transfert: S.KINDS[dest].icon + ' ' + S.KINDS[dest].fr + ' n°' + created.n });
  return created;
}
async function memorize(kind, d) {
  if (!keys.config) return;
  let changedAny = false;
  const next = { ...store.sugg };
  for (const f of S.FIELDS[kind]) {
    if (!f.sugg || !d[f.k] || ['heures', 'next'].includes(f.sugg)) continue;
    if (!(next[f.sugg] || []).includes(d[f.k])) { next[f.sugg] = [...(next[f.sugg] || []), d[f.k]].sort((a, b) => a.localeCompare(b, 'fr')); changedAny = true; }
  }
  if (changedAny) await saveSugg(null, null, next).catch(e => console.warn('suggestions', e));
}

/* Stock */
function cleanStock(b) {
  const n = v => { const x = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(x) ? 0 : x; };
  const lim = String(b.lim || '').slice(0, 10);
  return { art: String(b.art || '').trim().slice(0, 120), cat: String(b.cat || '').slice(0, 60), info: String(b.info || '').slice(0, 400),
           w: n(b.w) || null, h: n(b.h) || null, tot: n(b.tot), unit: String(b.unit || 'Cabinet').slice(0, 20),
           lim: S.isDate(lim) ? lim : '', rem: String(b.rem || '').slice(0, 400), sort: b.sort ?? 0 };
}
async function writeStock(id, s, sha) {
  const path = 's/' + id + '.json';
  const newSha = await G.writeFile(path, { box: await C.seal(keys.stock, s) }, sha, 'Stock');
  stockMap.set(id, { ...s, id, path, sha: newSha }); shas[path] = newSha;
  store.stock = [...stockMap.values()].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)); emit('data');
}
export async function stockAdd(art) {
  need('stock');
  const s = cleanStock({ art, tot: 0, sort: Math.max(0, ...store.stock.map(x => x.sort || 0)) + 1 });
  if (!s.art) throw new Error('Nom de l\'article obligatoire.');
  await writeStock(newId('s'), s, null);
}
export async function stockUpdate(id, changes) {
  need('stock');
  const cur = stockMap.get(id);
  await writeStock(id, cleanStock({ ...cur, ...changes }), cur.sha);
}
export async function stockDelete(id) {
  need('stock');
  const cur = stockMap.get(id);
  await G.deleteFile(cur.path, cur.sha, 'Stock');
  stockMap.delete(id); delete shas[cur.path]; store.stock = store.stock.filter(x => x.id !== id); emit('data');
}

/* Équipe et listes */
async function writeConfig(name, value) {
  const path = 'c/' + name + '.json';
  const sha = await G.writeFile(path, { box: await C.seal(keys.config, value) }, shas[path] || null, 'Réglages');
  shas[path] = sha;
}
export async function saveTeam(list) {
  if (store.me.role !== 'admin') throw new Error('Seul l\'administrateur modifie l\'équipe.');
  const clean = list.map(m => ({ name: String(m.name || '').trim().slice(0, 60), icon: String(m.icon || '').slice(0, 8), role: String(m.role || '').slice(0, 200) })).filter(m => m.name);
  await writeConfig('team', { list: clean });
  store.team = clean; emit('data');
}
export async function saveSugg(key, values, whole) {
  const next = whole || { ...store.sugg, [key]: [...new Set(values.map(v => String(v).trim()).filter(Boolean))] };
  await writeConfig('sugg', next);
  store.sugg = next;
}

/* 📥 Import du Google Sheet : un seul enregistrement sur GitHub */
export async function importRows(res, progress = () => {}) {
  if (store.me.role !== 'admin') throw new Error('Réservé à l\'administrateur.');
  const files = {}, deletes = [];
  for (const x of store.dossiers.values()) if (x.path) deletes.push(x.path);
  if (res.stock.length) for (const s of stockMap.values()) deletes.push(s.path);
  const counters = {}, now = new Date().toISOString();
  let i = 0;
  for (const r of res.rows) {
    counters[r.kind] = (counters[r.kind] || 0) + 1;
    const id = newId(r.kind);
    const rec = { kind: r.kind, n: counters[r.kind], data: r.data, created_at: now, created_by: 'Import', updated_at: now, updated_by: 'Import',
                  deleted_at: null, deleted_by: null, history: [{ at: now, who: myName(), field: '📥', before: '', after: 'Importé depuis le Google Sheet' }] };
    files['d/' + id + '.json'] = { kind: r.kind, box: await C.seal(keys[r.kind], rec) };
    progress(++i, res.rows.length + res.stock.length);
  }
  let k = 0;
  for (const it of res.stock) { files['s/' + newId('s') + '.json'] = { box: await C.seal(keys.stock, cleanStock({ ...it, sort: k++ })) }; progress(++i, res.rows.length + res.stock.length); }
  const sugg = { ...store.sugg };
  for (const r of res.rows) for (const f of S.FIELDS[r.kind]) if (f.sugg && !['heures', 'next'].includes(f.sugg) && r.data[f.k]) sugg[f.sugg] = [...new Set([...(sugg[f.sugg] || []), r.data[f.k]])];
  files['c/sugg.json'] = { box: await C.seal(keys.config, sugg) };
  if (res.team.length) {
    const merged = store.team.map(m => ({ ...m }));
    for (const t of res.team) { const m = merged.find(x => x.name === t.name); if (!m) merged.push(t); else if (!m.icon && t.icon) m.icon = t.icon; }
    files['c/team.json'] = { box: await C.seal(keys.config, { list: merged }) };
  }
  await G.commitMany(files, deletes.filter(p => !(p in files)), 'Import du Google Sheet');
  store.dossiers.clear(); stockMap.clear(); shas = {};
  await load();
}
