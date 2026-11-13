/* Onglet d'un type de dossier : tableau compact, filtres, couleurs */
import { h, toast } from '../ui.js';
import * as S from '../schema.js';
import { store, sorted, all, save, teamNames, teamIcon, stockNow } from '../store.js';
import { t, L, getLang } from '../i18n.js';
import { display, statePill, prioPill, listValues } from './fields.js';
import { eventStatus, reservations } from '../stockcalc.js';
import { openNewDossier } from './newdossier.js';

const prefs = {};   // filtres gardés pendant la session

export function tableView(kind) {
  const K = S.KINDS[kind];
  const p = prefs[kind] || (prefs[kind] = { q: '', owner: '', closed: true });
  const root = h('section', { class: 'page' });
  const res = kind === 'ev' ? reservations(all()) : null;

  const fieldsByKey = Object.fromEntries(S.FIELDS[kind].map(f => [f.k, f]));
  const cols = K.compact.map(k => fieldsByKey[k] || ({ stock: { k: 'stock', fr: 'Statut stock', en: 'Stock status', t: 'auto' },
                                                       jr: { k: 'jr', fr: 'Jours restants', en: 'Days left', t: 'auto' } })[k]).filter(Boolean);

  const body = h('tbody');
  const count = h('span', { class: 'muted' });
  const draw = () => {
    const q = S.norm(p.q);
    let rows = sorted(kind, { closed: p.closed });
    if (p.owner) rows = rows.filter(x => x.data.resp === p.owner || String(x.data.avec || x.data.eq || '').includes(p.owner));
    if (q) rows = rows.filter(x => S.norm(Object.values(x.data).join(' ')).includes(q) || String(x.n) === q);
    count.textContent = rows.length + ' ' + L('dossier(s)', 'file(s)');
    const everything = all();
    body.replaceChildren(...rows.map(x => row(x, everything)));
    if (!rows.length) body.append(h('tr', {}, h('td', { colspan: cols.length + 1, class: 'empty-row' }, t('noData'))));
  };

  const row = (x, everything) => {
    const d = x.data, c = S.computed(kind, d), flags = S.rowFlags(kind, d, everything);
    const closed = S.isClosed(c.fam);
    const tr = h('tr', { class: [closed ? 'closed' : '', flags.stale ? 'stale' : '', flags.dup ? 'dup' : ''].join(' ') });
    tr.append(h('td', { class: 'num' }, h('a', { href: '#/d/' + x.id, title: L('Ouvrir la page', 'Open page') }, x.n)));
    for (const f of cols) {
      const td = h('td', { class: 'c-' + f.k });
      if (f.k === 'name') {
        td.append(h('a', { class: 'name', href: '#/d/' + x.id }, d.name || '(sans nom)'));
        if (flags.stale) td.append(h('span', { class: 'flag', title: L('Pas de mise à jour depuis plus de 7 jours', 'No update for 7+ days') }, '⏳'));
        if (flags.dup) td.append(h('span', { class: 'flag', title: L('Doublon : même nom', 'Duplicate name') }, '⧉'));
      } else if (f.k === 'etat') {
        const sel = h('select', { class: 'inline-state', 'aria-label': 'État', onchange: e => quick(x, { etat: e.target.value }) },
          h('option', { value: '' }, '—'), listValues(kind, f).map(v => h('option', { value: v, selected: v === d.etat }, v)));
        const fam = S.FAMILIES[c.fam];
        if (fam) { sel.style.background = fam.bg; sel.style.color = fam.fg; }
        if (flags.noAnswer) { sel.classList.add('alert-dark'); sel.title = L('Devis envoyé sans réponse depuis plus de 10 jours', 'Quote sent, no answer for 10+ days'); }
        if (flags.evSoon) { sel.classList.add('alert-red'); sel.title = L('Event dans moins de 7 jours encore en attente', 'Event within 7 days still waiting'); }
        td.append(sel);
      } else if (f.k === 'prio') {
        td.append(h('select', { class: 'inline-prio ' + prioClass(d.prio), 'aria-label': 'Priorité', onchange: e => quick(x, { prio: e.target.value }) },
          h('option', { value: '' }, '—'), S.STATIC_LISTS.prio.map(v => h('option', { value: v, selected: v === d.prio }, v))));
      } else if (f.k === 'stock') {
        const st = eventStatus(x, stockNow(), res);
        td.append(h('span', { class: 'stock-' + st.level }, st.text));
      } else if (f.k === 'jr') {
        if (c.jr !== undefined && !closed) td.append(h('span', { class: c.jr < 0 ? 'late' : c.jr <= 14 ? 'soon' : '' }, c.jr < 0 ? L('Dépassé', 'Passed') : c.jr + ' j'));
      } else if (['fin', 'mont', 'dem'].includes(f.k) && kind === 'ev') {
        td.append(h('span', { class: d[f.k] ? '' : 'auto-val' }, S.fmtDate(c[f.k])));
      } else if (f.t === 'date') {
        td.append(S.fmtDate(d[f.k]));
        if (f.k === 'ech' && flags.late) td.classList.add('late-cell');
      } else {
        td.append(display(kind, f, d[f.k]));
      }
      tr.append(td);
    }
    return tr;
  };
  const quick = async (x, changes) => {
    try { await save(x.id, changes); toast(t('saved')); } catch (e) { toast(e.message, 'err'); draw(); }
  };

  const ownerSel = h('select', { 'aria-label': t('owner'), onchange: e => { p.owner = e.target.value; draw(); } },
    h('option', { value: '' }, '👥 ' + t('all')), teamNames().map(n => h('option', { value: n, selected: n === p.owner }, teamIcon(n) + n)));
  const search = h('input', { type: 'search', placeholder: L('Filtrer…', 'Filter…'), value: p.q, oninput: e => { p.q = e.target.value; draw(); } });
  const closedBox = h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: p.closed, onchange: e => { p.closed = e.target.checked; draw(); } }), ' ' + t('showClosed'));

  root.append(
    h('header', { class: 'page-head', style: { '--accent': K.color } },
      h('h1', {}, K.icon + ' ' + (getLang() === 'en' ? K.en : K.fr)), count,
      h('div', { class: 'grow' }),
      h('button', { class: 'btn primary', onclick: () => openNewDossier(kind) }, '➕ ' + t('newDossier'))),
    h('div', { class: 'toolbar' }, search, ownerSel, closedBox),
    legend(kind),
    h('div', { class: 'table-wrap' },
      h('table', { class: 'grid' },
        h('thead', {}, h('tr', {}, h('th', { class: 'num' }, 'N°'), cols.map(f => h('th', { class: 'c-' + f.k }, getLang() === 'en' ? f.en : f.fr)))),
        body)));
  draw();
  root.refresh = draw;
  return root;
}
function prioClass(p) { return p === S.VERY_HIGH ? 'p-vh' : p === 'Haute' ? 'p-h' : p === 'Moyenne' ? 'p-m' : p ? 'p-l' : ''; }

export function legend(kind) {
  const items = [
    ['#DC2626', L('Nom rouge ⏳ = pas de mise à jour depuis 7 j', 'Red name ⏳ = no update for 7+ days')],
    ['#EA580C', L('Nom orange ⧉ = doublon', 'Orange name ⧉ = duplicate'), ['proj', 'ex', 'ao'].includes(kind)],
    ['#9CA3AF', L('Ligne grise = terminé / perdu / annulé', 'Grey row = done / lost / cancelled')],
    ['#C2410C', L('État orange foncé = devis envoyé sans réponse depuis 10 j', 'Dark orange status = quote sent, no answer for 10+ days'), !!S.KINDS[kind].devis],
    ['#B91C1C', L('État rouge = event dans moins de 7 j encore en attente', 'Red status = event within 7 days still waiting'), kind === 'ev']
  ].filter(i => i[2] === undefined || i[2]);
  return h('div', { class: 'legend' }, items.map(([c, txt]) => h('span', {}, h('i', { style: { background: c } }), txt)));
}
