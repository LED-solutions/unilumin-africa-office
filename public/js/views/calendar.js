/* 📅 Calendrier du mois (garde les dossiers terminés comme historique ; annulés cachés) */
import { h } from '../ui.js';
import * as S from '../schema.js';
import { all, teamNames, teamIcon } from '../store.js';
import { t, L, getLang } from '../i18n.js';
import { loadFilters } from './agendalogic.js';
import { filterBar } from './agenda.js';

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
let cursor = null;

export function calendarView() {
  const now = new Date();
  if (!cursor) cursor = { y: now.getFullYear(), m: now.getMonth() };
  const f = loadFilters();
  let owner = '';
  const grid = h('div', { class: 'month' });
  const title = h('h1');
  const draw = () => {
    title.textContent = '📅 ' + (getLang() === 'en' ? MONTHS : MOIS)[cursor.m] + ' ' + cursor.y;
    const items = S.planningItems(all()).filter(it => f[it.filter] !== false && (!owner || it.resp === owner || String(it.team).includes(owner)));
    const byDay = {};
    for (const it of items) (byDay[it.date] = byDay[it.date] || []).push(it);
    const first = new Date(cursor.y, cursor.m, 1);
    const offset = (first.getDay() + 6) % 7;          // lundi en premier
    const start = new Date(cursor.y, cursor.m, 1 - offset);
    const today = S.todayStr();
    const heads = (getLang() === 'en' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']).map(d => h('div', { class: 'mh' }, d));
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const ds = S.todayStr(day);
      const list = (byDay[ds] || []).sort((a, b) => (a.min ?? 9999) - (b.min ?? 9999));
      cells.push(h('div', { class: 'mc' + (day.getMonth() !== cursor.m ? ' other' : '') + (ds === today ? ' today' : '') },
        h('div', { class: 'md' }, day.getDate()),
        list.map(it => h('a', { class: 'mi' + (it.fam === 'Terminé' ? ' fini' : ''), href: '#/d/' + it.id, style: { '--accent': S.KINDS[it.kind].color },
          title: (getLang() === 'en' ? it.quoiEn : it.quoi) + ' – ' + it.name + (it.lieu ? ' · ' + it.lieu : '') + (it.resp ? ' · ' + it.resp : '') },
          it.icon + ' ' + (it.hour ? it.hour + ' ' : '') + it.name))));
    }
    grid.replaceChildren(...heads, ...cells);
  };
  const move = n => { cursor.m += n; if (cursor.m < 0) { cursor.m = 11; cursor.y--; } if (cursor.m > 11) { cursor.m = 0; cursor.y++; } draw(); };
  const v = h('section', { class: 'page' },
    h('header', { class: 'page-head' }, title, h('div', { class: 'grow' }),
      h('button', { class: 'btn', onclick: () => move(-1), 'aria-label': L('Mois précédent', 'Previous month') }, '◀'),
      h('button', { class: 'btn', onclick: () => { cursor = { y: now.getFullYear(), m: now.getMonth() }; draw(); } }, t('today')),
      h('button', { class: 'btn', onclick: () => move(1), 'aria-label': L('Mois suivant', 'Next month') }, '▶')),
    h('div', { class: 'toolbar' }, h('select', { 'aria-label': t('owner'), onchange: e => { owner = e.target.value; draw(); } },
      h('option', { value: '' }, '👥 ' + t('all')), teamNames().map(n => h('option', { value: n }, teamIcon(n) + n)))),
    filterBar(f, draw), grid);
  draw();
  v.refresh = draw;
  return v;
}
