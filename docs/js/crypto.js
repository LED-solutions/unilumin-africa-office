/* Chiffrement (dans le navigateur, avant tout envoi sur GitHub).
   - Chaque onglet (Projets, Events, …) a sa propre clé AES-256.
   - Chaque personne a un « trousseau » chiffré contenant seulement les clés des onglets qu'elle peut voir.
   - Le trousseau s'ouvre avec le mot de passe (PBKDF2, 310 000 tours). Sans mot de passe, les fichiers sont illisibles. */
const enc = new TextEncoder(), dec = new TextDecoder();
export const ITER = 310000;

export function b64(bytes) {
  const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}
export function unb64(s) { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
export const random = n => crypto.getRandomValues(new Uint8Array(n));

export async function sha256hex(text) {
  const h = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}
/* Identifiant de fichier d'un utilisateur : on ne publie jamais le nom d'utilisateur en clair */
export const userFileId = username => sha256hex('uao-user:' + String(username).trim().toLowerCase());

export async function keyFromPassword(password, saltB64, iter = ITER) {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: unb64(saltB64), iterations: iter, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export const newRawKey = () => b64(random(32));
export const importKey = raw => crypto.subtle.importKey('raw', unb64(raw), 'AES-GCM', false, ['encrypt', 'decrypt']);

export async function seal(key, obj) {
  const iv = random(12);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)));
  return { iv: b64(iv), ct: b64(ct) };
}
export async function open(key, box) {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.ct));
  return JSON.parse(dec.decode(pt));
}
