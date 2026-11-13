/* Disponibilité du stock jour par jour (un event réserve son matériel du montage au démontage ; annulé = libéré) */
import * as S from './schema.js';

function num(v) { const n = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(n) ? 0 : n; }

export function reservations(dossiers) {
  const res = [];
  for (const x of dossiers) {
    if (x.kind !== 'ev' || x.deleted_at) continue;
    const c = S.computed('ev', x.data);
    if (c.fam === 'Perdu' || !c.mont || !c.dem) continue;
    for (let k = 1; k <= 4; k++) {
      const art = x.data['m' + k], q = num(x.data['q' + k]);
      if (art && q > 0) res.push({ id: x.id, art, q, from: c.mont, to: c.dem, name: x.data.name, done: c.fam === 'Terminé' });
    }
  }
  return res;
}
/* Cabinets en réparation = SAV ouverts avec un article du stock (comme la colonne « En réparation » du sheet) */
export function withRepairs(stock, dossiers) {
  const rep = {};
  for (const x of dossiers) {
    if (x.kind !== 'sav' || x.deleted_at || !x.data.art) continue;
    if (S.isClosed(S.family('sav', x.data.etat))) continue;
    rep[x.data.art] = (rep[x.data.art] || 0) + (num(x.data.qte) || 1);
  }
  return stock.map(s => ({ ...s, rep: rep[s.art] || 0 }));
}
export function capacity(item, date) {
  if (item.lim && date > item.lim) return 0;
  return Math.max(0, num(item.tot) - num(item.rep ?? item.sav));
}
export function used(res, art, date, exceptId) {
  let u = 0;
  for (const r of res) if (r.art === art && r.from <= date && date <= r.to && r.id !== exceptId) u += r.q;
  return u;
}
export function available(stock, res, art, date) {
  const item = stock.find(s => s.art === art);
  if (!item) return null;
  return capacity(item, date) - used(res, art, date);
}
/* Statut d'un event : ✅ Stock OK / ⚠ Manque … / ℹ Écran à choisir */
export function eventStatus(x, stock, res) {
  const d = x.data, c = S.computed('ev', d);
  const lines = [];
  for (let k = 1; k <= 4; k++) if (d['m' + k] && num(d['q' + k]) > 0) lines.push([d['m' + k], num(d['q' + k])]);
  if (!lines.length) return c.surf ? { level: 'info', text: 'ℹ Écran à choisir (' + c.surf + ' m²)' } : { level: '', text: '' };
  if (c.fam === 'Perdu') return { level: '', text: '' };
  const missing = [];
  for (const [art, q] of lines) {
    const item = stock.find(s => s.art === art);
    if (!item) { missing.push('article inconnu : ' + art); continue; }
    let worst = 0;
    for (let day = c.mont; day && day <= c.dem; day = S.addDays(day, 1)) {
      const left = capacity(item, day) - used(res, art, day, x.id) - q;
      if (left < worst) worst = left;
    }
    if (worst < 0) missing.push(-worst + ' × ' + art);
  }
  return missing.length ? { level: 'bad', text: '⚠ Manque ' + missing.join(', ') } : { level: 'ok', text: '✅ Stock OK' };
}
