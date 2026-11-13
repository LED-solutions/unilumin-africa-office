/* Stockage des données sur GitHub : branche « data » du dépôt, un fichier chiffré par dossier. */
export const REPO = { owner: 'LED-solutions', name: 'unilumin-africa-office', branch: 'data' };
const API = (globalThis.UAO_API || 'https://api.github.com') + '/repos/' + REPO.owner + '/' + REPO.name;
const enc = new TextEncoder(), dec = new TextDecoder();
let token = '';
export function setToken(t) { token = t || ''; }

const toB64 = s => { const u = enc.encode(s); let o = ''; for (let i = 0; i < u.length; i += 0x8000) o += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(o); };
const fromB64 = s => { const bin = atob(String(s).replace(/\s/g, '')); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return dec.decode(u); };

export class GhError extends Error { constructor(msg, status) { super(msg); this.status = status; } }

async function call(method, path, body, auth = true) {
  let res;
  try {
    res = await fetch(API + path, {
      method, cache: 'no-store',
      headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28',
                 ...(auth && token ? { Authorization: 'Bearer ' + token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch { throw new GhError('Pas de connexion Internet.', 0); }
  if (res.status === 404) return null;
  if (!res.ok) {
    let msg = 'Erreur GitHub ' + res.status;
    try { const j = await res.json(); if (j.message) msg += ' : ' + j.message; } catch { /* */ }
    if (res.status === 401) msg = 'Le jeton GitHub n\'est plus valide. L\'administrateur doit en mettre un nouveau.';
    if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') msg = 'GitHub limite les requêtes pour le moment. Réessayez dans quelques minutes.';
    throw new GhError(msg, res.status);
  }
  return res.status === 204 ? {} : res.json();
}

/* Un fichier JSON (sans jeton : seulement pour la connexion) */
export async function readFile(path, auth = true) {
  const j = await call('GET', '/contents/' + path + '?ref=' + REPO.branch, null, auth);
  if (!j || Array.isArray(j)) return null;
  return { sha: j.sha, json: JSON.parse(fromB64(j.content)) };
}
/* Liste de tous les fichiers de la branche avec leur empreinte (une seule requête) */
export async function tree() {
  const j = await call('GET', '/git/trees/' + REPO.branch + '?recursive=1');
  if (!j) return null;
  const out = {};
  for (const e of j.tree || []) if (e.type === 'blob') out[e.path] = e.sha;
  return out;
}
export async function blob(sha) {
  const j = await call('GET', '/git/blobs/' + sha);
  return j ? JSON.parse(fromB64(j.content)) : null;
}
/* Écrit un fichier ; sha = version connue (null pour un nouveau fichier). Conflit → GhError 409/422. */
export async function writeFile(path, json, sha, message) {
  const j = await call('PUT', '/contents/' + path, { message: message || 'Mise à jour', content: toB64(JSON.stringify(json)), branch: REPO.branch, ...(sha ? { sha } : {}) });
  return j.content.sha;
}
export async function deleteFile(path, sha, message) {
  await call('DELETE', '/contents/' + path, { message: message || 'Suppression', sha, branch: REPO.branch });
}
export async function repoAccess() {
  const j = await call('GET', '');
  return !!(j && j.permissions && j.permissions.push);
}
/* Plusieurs fichiers en UN seul enregistrement (import) */
export async function commitMany(files, deletes, message) {
  const ref = await call('GET', '/git/ref/heads/' + REPO.branch);
  const base = ref.object.sha;
  const commit = await call('GET', '/git/commits/' + base);
  const entries = [];
  for (const [path, json] of Object.entries(files)) {
    const b = await call('POST', '/git/blobs', { content: JSON.stringify(json), encoding: 'utf-8' });
    entries.push({ path, mode: '100644', type: 'blob', sha: b.sha });
  }
  for (const path of deletes) entries.push({ path, mode: '100644', type: 'blob', sha: null });
  const t = await call('POST', '/git/trees', { base_tree: commit.tree.sha, tree: entries });
  const c = await call('POST', '/git/commits', { message, tree: t.sha, parents: [base] });
  await call('PATCH', '/git/refs/heads/' + REPO.branch, { sha: c.sha });
}
