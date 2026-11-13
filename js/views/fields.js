/* Éditeurs de champs (texte, date, liste, choix multiple…) */
import { h, askText } from '../ui.js';
import * as S from '../schema.js';
import { store, teamNames, teamIcon } from '../store.js';
import { getLang } from '../i18n.js';

export function listValues(kind, f) {
  if (f.list === 'team') return teamNames();
  if (f.list === 'stockitems') return store.stock.map(s => s.art);
  if (f.list === 'hqdest') return S.HQ_DEST.map(k => S.KINDS[k].icon + ' ' + S.KINDS[k].fr);
  if (S.STATES[f.list]) return S.STATES[f.list].map(s => s[0]);
  return S.STATIC_LISTS[f.list] || [];
}
let dlId = 0;
function datalist(name) {
  const id = 'dl' + (++dlId);
  return [id, h('datalist', { id }, (store.sugg[name] || []).map(v => h('option', { value: v })))];
}

/* Valeur affichée (lecture) */
export function display(kind, f, v) {
  if (v === undefined || v === null || v === '') return '';
  if (f.t === 'date') return S.fmtDate(v);
  if (f.k === 'resp' || f.k === 'majp') return teamIcon(v) + v;
  return String(v);
}

/* Éditeur : appelle onChange(valeur) quand la valeur change */
export function editor(kind, f, value, onChange, opts = {}) {
  const v = value ?? '';
  const common = { id: opts.id, 'aria-label': getLang() === 'en' ? f.en : f.fr, disabled: opts.readonly };
  if (f.t === 'list') {
    const vals = listValues(kind, f);
    const sel = h('select', { ...common, onchange: e => onChange(e.target.value) },
      h('option', { value: '' }, '—'),
      vals.map(x => h('option', { value: x, selected: x === v }, (f.list === 'team' ? teamIcon(x) : '') + x)));
    if (v && !vals.includes(v)) sel.append(h('option', { value: v, selected: true }, v));
    return sel;
  }
  if (f.t === 'multi') return multiEditor(kind, f, v, onChange, opts);
  if (f.t === 'long') {
    const ta = h('textarea', { ...common, rows: opts.rows || 3, onchange: e => onChange(e.target.value) });
    ta.value = v;
    return ta;
  }
  if (f.t === 'date') {
    const inp = h('input', { ...common, type: 'date', value: v, placeholder: opts.placeholder, onchange: e => onChange(e.target.value) });
    return inp;
  }
  const type = f.t === 'num' ? 'text' : f.t === 'tel' ? 'tel' : 'text';
  const attrs = { ...common, type, value: v, inputmode: f.t === 'num' ? 'decimal' : undefined, placeholder: opts.placeholder,
                  onchange: e => onChange(e.target.value.trim()) };
  if (f.sugg) {
    const [id, dl] = datalist(f.sugg);
    return h('span', { class: 'with-dl' }, h('input', { ...attrs, list: id }), dl);
  }
  return h('input', attrs);
}

/* Choix multiple : on coche les noms (Avec, Équipe terrain, Sous-traitants) */
function multiEditor(kind, f, v, onChange, opts) {
  const names = f.list === 'st' ? (store.sugg.st || []) : teamNames();
  let cur = String(v || '').split(/\s*[,;·]\s*/).filter(Boolean);
  const box = h('div', { class: 'chips' });
  const render = () => {
    box.replaceChildren(
      ...cur.map(n => h('span', { class: 'chip on' }, (f.list === 'team' ? teamIcon(n) : '') + n,
        opts.readonly ? null : h('button', { class: 'chip-x', 'aria-label': 'Retirer ' + n, onclick: () => { cur = cur.filter(x => x !== n); render(); onChange(cur.join(', ')); } }, '×'))),
      opts.readonly ? '' : addSel());
  };
  const addSel = () => {
    const free = names.filter(n => !cur.includes(n));
    const s = h('select', { class: 'chip-add', 'aria-label': 'Ajouter', onchange: async e => {
      let val = e.target.value; if (!val) return;
      if (val === '__new') { val = await askText('✎ Autre', 'Nom à ajouter :'); if (!val) { render(); return; } }
      cur.push(val); render(); onChange(cur.join(', '));
    } }, h('option', { value: '' }, '＋'), free.map(n => h('option', { value: n }, (f.list === 'team' ? teamIcon(n) : '') + n)),
      f.list === 'st' ? h('option', { value: '__new' }, '✎ Autre…') : null);
    return s;
  };
  render();
  return box;
}

/* Pastille d'état colorée */
export function statePill(kind, etat) {
  if (!etat) return h('span', { class: 'pill empty' }, '—');
  const fam = S.family(kind, etat), c = S.FAMILIES[fam] || { bg: '#F1F5F9', fg: '#475569' };
  return h('span', { class: 'pill', style: { background: c.bg, color: c.fg } }, etat);
}
export function prioPill(p) {
  if (!p) return h('span', { class: 'pill empty' }, '—');
  const cls = p === S.VERY_HIGH ? 'p-vh' : p === 'Haute' ? 'p-h' : p === 'Moyenne' ? 'p-m' : 'p-l';
  return h('span', { class: 'pill ' + cls }, p);
}
