/* 📦 Stock : articles, disponibilité aujourd'hui et sur 30 jours, réservations des events */
import { h, api, toast, confirmBox } from '../ui.js';
import * as S from '../schema.js';
import { store, all, stockNow } from '../store.js';
import { L } from '../i18n.js';
import { reservations, capacity, used } from '../stockcalc.js';

export function stockView() {
  const v = h('section', { class: 'page' });
  const isAdmin = store.me.role === 'admin';
  let start = S.todayStr();
  const draw = () => {
    const res = reservations(all()), today = S.todayStr(), items0 = stockNow();
    const patch = async (s, k, val) => {
      try { const row = await api('PATCH', '/api/stock/' + s.id, { [k]: val }); Object.assign(store.stock.find(x => x.id === s.id) || {}, row); toast(L('Enregistré ✓', 'Saved ✓')); draw(); }
      catch (e) { toast(e.message, 'err'); }
    };
    const cell = (s, k, type = 'text') => h('input', { class: 'cell-in ' + type, value: s[k] ?? '', type: type === 'date' ? 'date' : 'text',
      inputmode: type === 'num' ? 'decimal' : undefined, onchange: e => patch(s, k, e.target.value) });
    const items = h('table', { class: 'grid' },
      h('thead', {}, h('tr', {}, [L('Article', 'Item'), L('Catégorie', 'Category'), 'Infos', 'Total', L('En réparation (SAV)', 'In repair (SAV)'), L('Unité', 'Unit'),
        L('Réservé aujourd\'hui', 'Reserved today'), L('Dispo aujourd\'hui', 'Free today'), L('Utilisable jusqu\'au', 'Usable until'), L('Remarque', 'Note'), ''].map(x => h('th', {}, x)))),
      h('tbody', {}, items0.map(s => {
        const u = used(res, s.art, today), free = capacity(s, today) - u;
        return h('tr', {}, h('td', {}, isAdmin ? cell(s, 'art') : h('b', {}, s.art)), h('td', {}, isAdmin ? cell(s, 'cat') : s.cat), h('td', {}, cell(s, 'info')),
          h('td', { class: 'num' }, cell(s, 'tot', 'num')), h('td', { class: 'num', title: L('Calculé depuis les SAV ouverts (Article + Qté)', 'From open after-sales files (Item + Qty)') }, s.rep), h('td', {}, s.unit),
          h('td', { class: 'num' }, u), h('td', { class: 'num ' + (free < 0 ? 'bad' : free === 0 ? 'warn' : 'good') }, free),
          h('td', {}, cell(s, 'lim', 'date')), h('td', {}, cell(s, 'rem')),
          h('td', {}, isAdmin ? h('button', { class: 'icon-btn', title: L('Supprimer l\'article', 'Delete item'), onclick: async () => {
            if (!await confirmBox(L('Supprimer l\'article', 'Delete item'), s.art, L('Supprimer', 'Delete'), true)) return;
            await api('DELETE', '/api/stock/' + s.id); store.stock = store.stock.filter(x => x.id !== s.id); draw();
          } }, '🗑️') : null));
      })));
    /* Grille 30 jours */
    const days = Array.from({ length: 30 }, (_, i) => S.addDays(start, i));
    const grid = h('table', { class: 'grid days' },
      h('thead', {}, h('tr', {}, h('th', {}, L('Article', 'Item')), days.map(d => h('th', { class: d === today ? 'today' : '' }, S.fmtDate(d).slice(0, 5))))),
      h('tbody', {}, items0.map(s => h('tr', {}, h('td', { class: 'nowrap' }, s.art), days.map(d => {
        const free = capacity(s, d) - used(res, s.art, d), cap = capacity(s, d);
        return h('td', { class: 'num ' + (free < 0 ? 'bad' : free === 0 && cap > 0 ? 'warn' : free < cap ? 'part' : ''), title: s.art + ' · ' + S.fmtDate(d) }, cap ? free : '·');
      })))));
    const upcoming = res.filter(r => r.to >= today).sort((a, b) => a.from.localeCompare(b.from));
    v.replaceChildren(
      h('header', { class: 'page-head' }, h('h1', {}, '📦 Stock'), h('div', { class: 'grow' }),
        isAdmin ? h('button', { class: 'btn', onclick: async () => {
          const art = (prompt(L('Nom du nouvel article :', 'New item name:')) || '').trim(); if (!art) return;
          try { store.stock.push(await api('POST', '/api/stock', { art, tot: 0, unit: 'Cabinet' })); draw(); } catch (e) { toast(e.message, 'err'); }
        } }, '➕ ' + L('Article', 'Item')) : null),
      h('p', { class: 'muted' }, L('Un event réserve son matériel du montage au démontage. Un event annulé libère le stock. Les quantités se modifient directement dans le tableau.',
        'An event reserves its equipment from set-up to dismantle. A cancelled event frees it. Edit quantities directly in the table.')),
      h('div', { class: 'table-wrap' }, items),
      h('div', { class: 'page-head sub' }, h('h2', {}, L('Disponible par jour', 'Free per day')), h('div', { class: 'grow' }),
        h('input', { type: 'date', value: start, onchange: e => { start = e.target.value || S.todayStr(); draw(); }, 'aria-label': L('À partir du', 'From') })),
      h('div', { class: 'table-wrap' }, grid),
      h('h2', {}, L('Réservations à venir', 'Upcoming reservations')),
      h('div', { class: 'table-wrap' }, h('table', { class: 'grid' }, h('thead', {}, h('tr', {}, ['Event', L('Article', 'Item'), L('Qté', 'Qty'), L('Du', 'From'), L('Au', 'To')].map(x => h('th', {}, x)))),
        h('tbody', {}, upcoming.map(r => h('tr', {}, h('td', {}, h('a', { href: '#/d/' + r.id }, r.name)), h('td', {}, r.art), h('td', { class: 'num' }, r.q),
          h('td', {}, S.fmtDate(r.from)), h('td', {}, S.fmtDate(r.to))))))));
  };
  draw();
  v.refresh = draw;
  return v;
}
