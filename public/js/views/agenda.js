/* 📋 Agenda : ce qui arrive, avec « Dans 10 h » quand une heure est indiquée */
import { h } from '../ui.js';
import * as S from '../schema.js';
import { all, teamNames, teamIcon } from '../store.js';
import { t, L, getLang } from '../i18n.js';
import { agendaItems, when, dayName, loadFilters, saveFilters } from './agendalogic.js';

export function filterBar(f, onChange) {
  return h('div', { class: 'filters' }, S.PLANNING_FILTERS.map(([k, icon, fr, en]) => h('label', { class: 'toggle' + (f[k] === false ? '' : ' on') },
    h('input', { type: 'checkbox', checked: f[k] !== false, onchange: e => { f[k] = e.target.checked; saveFilters(f); onChange(); } }),
    icon + ' ' + (getLang() === 'en' ? en : fr))));
}

export function agendaView() {
  const f = loadFilters();
  let from = '', owner = '';
  const body = h('tbody');
  const draw = () => {
    const items = agendaItems(all(), { from, owner, filters: f });
    body.replaceChildren(...items.slice(0, 400).map(it => {
      const K = S.KINDS[it.kind];
      return h('tr', { class: it.doneToday ? 'done-today' : '' },
        h('td', { class: 'nowrap' }, S.fmtDate(it.date)),
        h('td', {}, dayName(it.date, getLang())),
        h('td', { class: 'nowrap when' }, when(it)),
        h('td', {}, h('span', { class: 'cat', style: { '--accent': K.color } }, getLang() === 'en' ? K.en : K.fr)),
        h('td', {}, it.icon + ' ' + (getLang() === 'en' ? it.quoiEn : it.quoi) + (it.hour ? ' – ' + it.hour : '')),
        h('td', {}, h('a', { href: '#/d/' + it.id, class: 'name' }, it.name)),
        h('td', {}, it.lieu),
        h('td', {}, it.resp ? teamIcon(it.resp) + it.resp : ''),
        h('td', {}, it.etat));
    }));
    if (!items.length) body.append(h('tr', {}, h('td', { colspan: 9, class: 'empty-row' }, L('Rien de prévu.', 'Nothing planned.'))));
  };
  const v = h('section', { class: 'page' },
    h('header', { class: 'page-head' }, h('h1', {}, '📋 ' + t('agenda'))),
    h('div', { class: 'toolbar' },
      h('label', {}, L('À partir du ', 'From ') , h('input', { type: 'date', onchange: e => { from = e.target.value; draw(); } })),
      h('select', { 'aria-label': t('owner'), onchange: e => { owner = e.target.value; draw(); } }, h('option', { value: '' }, '👥 ' + t('all')),
        teamNames().map(n => h('option', { value: n }, teamIcon(n) + n)))),
    filterBar(f, draw),
    h('div', { class: 'table-wrap' }, h('table', { class: 'grid agenda' },
      h('thead', {}, h('tr', {}, [L('Date', 'Date'), L('Jour', 'Day'), L('Quand', 'When'), L('Catégorie', 'Category'), L('Quoi', 'What'),
        L('Dossier / client', 'File / client'), L('Lieu / pays', 'Place / country'), t('owner'), L('État', 'Status')].map(x => h('th', {}, x)))),
      body)));
  draw();
  const timer = setInterval(() => { if (!document.body.contains(v)) clearInterval(timer); else draw(); }, 60000);
  v.refresh = draw;
  return v;
}
