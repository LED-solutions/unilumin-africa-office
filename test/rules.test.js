import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../public/js/schema.js';
import { reservations, eventStatus, withRepairs } from '../public/js/stockcalc.js';

test('dates sans décalage de fuseau', () => {
  assert.equal(S.addDays('2026-10-27', -1), '2026-10-26');
  assert.equal(S.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(S.daysBetween('2026-10-27', '2026-11-03'), 7);
  assert.equal(S.fmtDate('2026-10-27'), '27/10/2026');
});
test('event : fin = début, montage = J-1, démontage = fin', () => {
  const c = S.computed('ev', { deb: '2026-10-29' });
  assert.deepEqual([c.fin, c.mont, c.dem], ['2026-10-29', '2026-10-28', '2026-10-29']);
  const c2 = S.computed('ev', { deb: '2026-10-29', fin: '2026-10-31', mont: '2026-10-27' });
  assert.deepEqual([c2.fin, c2.mont, c2.dem], ['2026-10-31', '2026-10-27', '2026-10-31']);
});
test('priorité : devis pas envoyé → 🔥, terminé → vide', () => {
  assert.equal(S.autoPriority('proj', { etat: 'Devis en préparation' }), S.VERY_HIGH);
  assert.equal(S.autoPriority('proj', { etat: 'Devis en préparation', devis: 'Oui', prio: S.VERY_HIGH }), 'Haute');
  assert.equal(S.autoPriority('proj', { etat: 'Livré / Installé', prio: 'Haute' }), '');
  assert.equal(S.autoPriority('ev', { etat: 'Confirmé', prio: 'Basse' }), 'Basse');
  assert.equal(S.family('proj', 'Dossier tech. envoyé'), 'En attente');
});
test('heures', () => {
  assert.equal(S.parseHour('8h'), 480); assert.equal(S.parseHour('08:30'), 510); assert.equal(S.parseHour('17h30'), 1050); assert.equal(S.parseHour(''), null);
});
test('agenda : annulés exclus', () => {
  const items = S.planningItems([{ id: 1, kind: 'ev', data: { name: 'A', etat: 'Annulé', deb: '2026-11-01' } },
                                 { id: 2, kind: 'ev', data: { name: 'B', etat: 'Confirmé', deb: '2026-11-01', hm: '8h' } }]);
  assert.ok(items.every(i => i.id === 2));
  assert.equal(items.length, 3);   // montage, event, démontage
});
test('stock : manque, annulé libéré, réparations déduites', () => {
  const stock = [{ art: 'X', tot: 100 }];
  const ev = (id, q, etat = 'Confirmé') => ({ id, kind: 'ev', data: { name: 'E' + id, etat, deb: '2026-11-10', m1: 'X', q1: String(q) } });
  const all = [ev(1, 60), ev(2, 50), ev(3, 90, 'Annulé'), { id: 4, kind: 'sav', data: { etat: 'En réparation', art: 'X', qte: '5' } }];
  const st = withRepairs(stock, all), res = reservations(all);
  assert.equal(st[0].rep, 5);
  assert.match(eventStatus(all[0], st, res).text, /Manque 15 × X/);
  assert.equal(eventStatus(all[2], st, res).text, '');
});
