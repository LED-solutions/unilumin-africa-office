/* Comptes, mots de passe et sessions. Les mots de passe ne sont jamais stockés : seulement une empreinte scrypt. */
import crypto from 'node:crypto';
import { db } from './db.js';

const COOKIE = 'uao_session';
const DAYS = 30;

export function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return 'scrypt$' + salt.toString('base64') + '$' + key.toString('base64');
}
export function checkPassword(pw, stored) {
  const [alg, s, k] = String(stored || '').split('$');
  if (alg !== 'scrypt' || !s || !k) return false;
  const key = crypto.scryptSync(pw, Buffer.from(s, 'base64'), 64, { N: 16384, r: 8, p: 1 });
  const ref = Buffer.from(k, 'base64');
  return ref.length === key.length && crypto.timingSafeEqual(ref, key);
}
export function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length < 8) return 'Le mot de passe doit faire au moins 8 caractères.';
  if (pw.length > 200) return 'Mot de passe trop long.';
  return null;
}
const sha = t => crypto.createHash('sha256').update(t).digest('hex');

export function createSession(res, req, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const exp = new Date(Date.now() + DAYS * 86400000).toISOString();
  db.prepare('INSERT INTO sessions(token_hash, user_id, expires_at) VALUES(?,?,?)').run(sha(token), userId, exp);
  setCookie(res, req, token, DAYS * 86400);
}
export function destroySession(req, res) {
  const t = readCookie(req);
  if (t) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha(t));
  setCookie(res, req, '', 0);
}
/* Accès depuis Internet (https via Tailscale Funnel / Cloudflare) → cookie « Secure » ; réseau du bureau (http) → cookie normal */
export function isHttps(req) {
  return req.secure || req.headers['x-forwarded-proto'] === 'https' || /\.ts\.net$/i.test(String(req.headers.host || '').split(':')[0]);
}
function setCookie(res, req, value, maxAge) {
  const secure = isHttps(req);
  res.setHeader('Set-Cookie', `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`);
}
function readCookie(req) {
  const h = req.headers.cookie || '';
  for (const part of h.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === COOKIE) return v.join('=');
  }
  return null;
}
export function currentUser(req) {
  const t = readCookie(req);
  if (!t) return null;
  const row = db.prepare(`SELECT u.id, u.email, u.name, u.role, u.lang, u.must_change, s.expires_at FROM sessions s
                          JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND u.active = 1`).get(sha(t));
  if (!row) return null;
  if (row.expires_at < new Date().toISOString()) { db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha(t)); return null; }
  return row;
}
export function revokeUserSessions(userId) { db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId); }

/* Limite des tentatives de connexion (le site est accessible depuis Internet) :
   - 8 essais / 15 min par adresse IP + e-mail
   - 15 essais / heure sur un même compte, toutes adresses confondues
   - 40 essais / heure depuis une même adresse IP, tous comptes confondus */
const attempts = new Map();
const RULES = [['ipmail', 15 * 60000, 8], ['mail', 3600000, 15], ['ip', 3600000, 40]];
function keysOf(ip, email) { const e = String(email || '').toLowerCase().trim(); return { ipmail: ip + '|' + e, mail: 'm|' + e, ip: 'i|' + ip }; }
export function tooManyAttempts(ip, email) {
  const now = Date.now(), k = keysOf(ip, email);
  return RULES.some(([name, win, max]) => {
    const list = (attempts.get(k[name]) || []).filter(t => now - t < win);
    attempts.set(k[name], list);
    return list.length >= max;
  });
}
export function noteFailure(ip, email) {
  const k = keysOf(ip, email);
  for (const [name] of RULES) { if (!attempts.has(k[name])) attempts.set(k[name], []); attempts.get(k[name]).push(Date.now()); }
}
export function clearFailures(ip, email) { attempts.delete(keysOf(ip, email).ipmail); }
setInterval(() => { const now = Date.now(); for (const [k, l] of attempts) if (!l.some(t => now - t < 3600000)) attempts.delete(k); }, 600000).unref();

/* Code d'installation affiché dans la console au premier démarrage (création du compte admin) */
export const SETUP_CODE = crypto.randomBytes(6).toString('hex').toUpperCase();
/* Empreinte factice : un e-mail inconnu prend autant de temps qu'un mauvais mot de passe */
export const DUMMY_HASH = hashPassword(crypto.randomBytes(12).toString('hex'));
