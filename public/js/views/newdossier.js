/* ➕ Nouveau dossier : on choisit le type, les champs utiles apparaissent */
import { h, modal, toast } from '../ui.js';
import * as S from '../schema.js';
import { store, create } from '../store.js';
import { L, getLang } from '../i18n.js';
import { editor } from './fields.js';

const EXTRA = {
  proj: ['desc', 'l', 'h', 'io', 'first', 'rep', 'constr', 'liv'],
  ev: ['lieu', 'deb', 'fin', 'mont', 'hm', 'dem', 'hd'],
  ao: ['obj', 'depot'],
  ex: ['pays', 'desc'],
  sav: ['type', 'lieu', 'ech', 'rem'],
  hq: ['contact', 'tel', 'email', 'pays', 'demande']
};

export function openNewDossier(kind = 'proj', after) {
  let current = kind;
  const data = {};
  const auto = { fin: '', mont: '', dem: '' };   // valeurs proposées automatiquement (Events)
  const area = h('div');
  const tabs = h('div', { class: 'kind-tabs' });

  const field = k => S.field(current, k);
  const set = (k, v) => { data[k] = v; };

  const draw = () => {
    tabs.replaceChildren(...S.KIND_ORDER.map(k => h('button', { class: 'kind-tab' + (k === current ? ' on' : ''), style: { '--accent': S.KINDS[k].color },
      onclick: () => { current = k; Object.keys(data).forEach(x => delete data[x]); draw(); } }, S.KINDS[k].icon + ' ' + (getLang() === 'en' ? S.KINDS[k].sen : S.KINDS[k].sfr))));
    const keys = ['name', 'resp', 'prio', 'etat', ...EXTRA[current], 'next'];
    if (current === 'hq') keys.splice(keys.indexOf('prio'), 1);
    const inputs = {};
    const rows = keys.map(k => {
      const f = field(k); if (!f) return null;
      const ed = editor(current, f, data[k] ?? (k === 'resp' ? store.me.name : ''), v => { set(k, v); onField(k, v, inputs); }, { rows: 2 });
      inputs[k] = ed;
      if (k === 'resp' && data.resp === undefined) data.resp = store.me.name;
      const wrapper = h('label', { class: 'f f-' + k + (['name', 'desc', 'obj', 'demande', 'rem', 'next'].includes(k) ? ' wide' : '') },
        h('span', {}, (getLang() === 'en' ? f.en : f.fr) + (f.req ? ' *' : '')), ed);
      if (current === 'ev' && ['fin', 'mont', 'dem', 'hm', 'hd'].includes(k) && !data.deb) wrapper.hidden = true;
      return wrapper;
    });
    area.replaceChildren(h('div', { class: 'form-grid' }, rows));
  };
  const valOf = el => el.matches?.('input,select,textarea') ? el : el.querySelector('input,select,textarea');
  const onField = (k, v, inputs) => {
    if (current === 'ev' && (k === 'deb' || k === 'fin')) {
      const put = (key, val) => { const el = valOf(inputs[key]); if (!data[key] || data[key] === auto[key]) { data[key] = val; el.value = val; } auto[key] = val; };
      if (k === 'deb' && v) { put('fin', v); put('mont', S.addDays(v, -1)); }
      put('dem', data.fin || v);
      area.querySelectorAll('.f-fin,.f-mont,.f-dem,.f-hm,.f-hd').forEach(e => { e.hidden = !data.deb; });
    }
    if (current === 'sav' && k === 'type' && v === S.SAV_ONLINE_TYPE && !data.lieu) { data.lieu = S.ONLINE; valOf(inputs.lieu).value = S.ONLINE; }
  };

  const submit = async () => {
    if (!String(data.name || '').trim()) { toast(L('Le nom est obligatoire.', 'Name is required.'), 'err'); return false; }
    const payload = { ...data };
    // Events : si la date proposée n'a pas été changée, on la laisse « auto » (elle suivra le début de l'event)
    if (current === 'ev') for (const k of ['fin', 'mont', 'dem']) if (payload[k] === auto[k]) delete payload[k];
    try {
      const row = await create(current, payload);
      toast(L('Dossier créé ✓', 'File created ✓'));
      if (after) after(row); else location.hash = '#/d/' + row.id;
    } catch (e) { toast(e.message, 'err'); return false; }
  };
  draw();
  modal('➕ ' + L('Nouveau dossier', 'New file'), h('div', {}, tabs, area),
    [{ label: L('Annuler', 'Cancel') }, { label: L('Ajouter le dossier', 'Add file'), kind: 'primary', run: submit }]);
}
