/* Données en mémoire + mise à jour automatique toutes les 10 secondes (les modifications des collègues arrivent seules).
   Si la connexion au PC du bureau tombe, les modifications sont gardées sur ce navigateur et envoyées dès qu'elle revient. */
import { api } from './ui.js';
import * as S from './schema.js';
import { withRepairs } from './stockcalc.js';

export const store = {
  me: null, dossiers: new Map(), stock: [], team: [], sugg: {}, since: '', listeners: new Set(), online: true
};
export function on(fn) { store.listeners.add(fn); return () => store.listeners.delete(fn); }
function emit(what) { for (const fn of store.listeners) { try { fn(what); } catch (e) { console.error(e); } } }

/* ---------- File d'attente hors ligne (gardée dans le navigateur) ---------- */
const QKEY = 'uao_queue';
let queue = [];
try { queue = JSON.parse(localStorage.getItem(QKEY) || '[]'); } catch { queue = []; }
const persist = () => { try { localStorage.setItem(QKEY, JSON.stringify(queue)); } catch { /* stockage indisponible */ } };
export function pendingCount() { return queue.length; }
export function clearLocal() { queue = []; try { localStorage.removeItem(QKEY); } catch { /* */ } }
let tempId = -1;

async function flush() {
  const map = {};                      // id provisoire → vrai id
  while (queue.length) {
    const op = queue[0];
    const id = map[op.id] ?? op.id;
    try {
      if (op.type === 'create') {
        const row = await api('POST', '/api/dossiers', { kind: op.kind, data: op.data });
        map[op.id] = row.id; store.dossiers.delete(op.id); store.dossiers.set(row.id, row);
        queue.forEach(q => { if (q.id === op.id) q.id = row.id; });
      } else if (op.type === 'patch' && id > 0) {
        store.dossiers.set(id, await api('PATCH', '/api/dossiers/' + id, { changes: op.changes }));
      }
    } catch (e) {
      if (e.offline) throw e;          // toujours hors ligne : on réessaiera
      console.warn('Modification refusée par le serveur :', e.message);   // ex. dossier supprimé entre-temps
    }
    queue.shift(); persist();
  }
}

export async function load(full = false) {
  if (queue.length) await flush();
  const res = await api('GET', '/api/data' + (store.since && !full ? '?since=' + encodeURIComponent(store.since) : ''));
  if (res.full) for (const [id] of store.dossiers) if (id > 0) store.dossiers.delete(id);
  for (const d of res.dossiers) store.dossiers.set(d.id, d);
  store.stock = res.stock; store.team = res.team; store.sugg = res.sugg; store.me = res.me;
  store.since = res.serverTime;
  const wasOffline = !store.online;
  store.online = true;
  if (res.full || res.dossiers.length || wasOffline) emit('data'); else emit('tick');
  return res;
}
let timer;
export function startPolling() {
  clearInterval(timer);
  timer = setInterval(async () => {
    try { await load(); } catch (e) { if (store.online) { store.online = false; emit('offline'); } }
  }, 10000);
  window.addEventListener('online', () => load().catch(() => {}));
}
export function upsert(row) { if (row) { store.dossiers.set(row.id, row); emit('data'); } }
export function remove(id) { store.dossiers.delete(id); emit('data'); }

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
  return list(kind, opts).sort((a, b) => S.compareKeys(S.sortKey(kind, a.data), S.sortKey(kind, b.data)) || a.n - b.n);
}
export function teamNames() { return store.team.map(m => m.name); }
export function teamIcon(name) { const m = store.team.find(x => x.name === name); return m && m.icon ? m.icon + ' ' : ''; }

/* Hors ligne : on applique les mêmes règles que le serveur, sur ce navigateur, en attendant */
function localRules(kind, d) {
  d.majd = S.todayStr(); d.majp = store.me.name;
  if (kind === 'sav' && d.type === S.SAV_ONLINE_TYPE && !d.lieu) d.lieu = S.ONLINE;
  if (kind !== 'hq') d.prio = S.autoPriority(kind, d);
  return d;
}
export async function save(id, changes) {
  try {
    if (queue.length) throw Object.assign(new Error('file'), { offline: true });   // garder l'ordre des modifications
    const row = await api('PATCH', '/api/dossiers/' + id, { changes }); upsert(row); return row;
  } catch (e) {
    if (!e.offline) throw e;
    const x = store.dossiers.get(id);
    const row = { ...x, data: localRules(x.kind, { ...x.data, ...changes }), pending: true };
    queue.push({ type: 'patch', id, changes }); persist();
    store.online = false; upsert(row); emit('offline');
    return row;
  }
}
export async function create(kind, data) {
  try {
    if (queue.length) throw Object.assign(new Error('file'), { offline: true });
    const row = await api('POST', '/api/dossiers', { kind, data }); upsert(row); return row;
  } catch (e) {
    if (!e.offline) throw e;
    const id = tempId--;
    const row = { id, kind, n: '…', data: localRules(kind, { ...data }), pending: true, created_at: new Date().toISOString() };
    queue.push({ type: 'create', id, kind, data }); persist();
    store.online = false; upsert(row); emit('offline');
    return row;
  }
}

/* Stock avec les cabinets en réparation (SAV ouverts) déduits */
export function stockNow() { return withRepairs(store.stock, all()); }
