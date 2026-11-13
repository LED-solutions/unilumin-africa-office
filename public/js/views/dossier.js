/* Page d'un dossier : grand nom en haut à gauche, tous les détails modifiables, historique, impression */
import { h, api, toast, confirmBox, modal } from '../ui.js';
import * as S from '../schema.js';
import { store, all, save, upsert, stockNow } from '../store.js';
import { t, L, getLang } from '../i18n.js';
import { editor, statePill, prioPill, display } from './fields.js';
import { eventStatus, reservations, available } from '../stockcalc.js';

export function dossierView(id) {
  const x = store.dossiers.get(+id);
  if (!x) return h('section', { class: 'page' }, h('p', {}, L('Dossier introuvable.', 'File not found.')), h('a', { href: '#/' }, '← ' + t('accueil')));
  const kind = x.kind, K = S.KINDS[kind], d = x.data, c = S.computed(kind, d);
  const isAdmin = store.me.role === 'admin';
  const ro = !!x.deleted_at;
  const status = h('span', { class: 'save-state muted' });

  const change = async (k, v) => {
    status.textContent = L('Enregistrement…', 'Saving…');
    try { const r = await save(x.id, { [k]: v }); status.textContent = t('saved'); toast(r && r.pending ? L('Enregistré sur ce PC – envoi dès que la connexion revient', 'Saved on this PC – will sync when back online') : t('saved')); }
    catch (e) { status.textContent = ''; toast(e.message, 'err'); }
  };

  /* Champs groupés comme dans le sheet */
  const groups = [];
  for (const f of S.FIELDS[kind]) {
    const g = f.g ? (getLang() === 'en' ? f.g[1] : f.g[0]) : '';
    let grp = groups.find(x => x.name === g);
    if (!grp) groups.push(grp = { name: g, fields: [] });
    grp.fields.push(f);
  }
  const cards = groups.map(g => h('div', { class: 'card' }, h('h3', {}, g.name),
    h('div', { class: 'form-grid' }, g.fields.map(f => fieldBox(f)))));

  function fieldBox(f) {
    const lab = h('span', {}, getLang() === 'en' ? f.en : f.fr);
    const wide = f.t === 'long' || f.k === 'name';
    if (f.auto || f.k === 'stock') {
      let v;
      if (f.k === 'surf') v = c.surf ? c.surf + ' m²' : '';
      else if (f.k === 'jr') v = c.jr === undefined ? '' : c.jr < 0 ? L('Dépassé', 'Passed') : c.jr + ' j';
      else if (f.k === 'stock') v = eventStatus(x, stockNow(), reservations(all())).text;
      else v = display(kind, f, d[f.k]);
      return h('div', { class: 'f ro' + (wide ? ' wide' : '') }, lab, h('div', { class: 'ro-val' }, v || '—'));
    }
    const opts = { readonly: ro, rows: f.k === 'com' || f.k === 'rem' ? 5 : 3 };
    if (kind === 'ev' && ['fin', 'mont', 'dem'].includes(f.k) && !d[f.k] && c[f.k]) {
      return h('label', { class: 'f' }, lab, editor(kind, f, '', v => change(f.k, v), opts),
        h('small', { class: 'muted' }, L('auto : ', 'auto: ') + S.fmtDate(c[f.k])));
    }
    return h('label', { class: 'f' + (wide ? ' wide' : '') }, lab, editor(kind, f, d[f.k], v => change(f.k, v), opts));
  }

  /* Events : matériel réservé et disponibilité */
  let material = null;
  if (kind === 'ev') {
    const res = reservations(all()), lines = [];
    for (let k = 1; k <= 4; k++) if (d['m' + k]) lines.push([d['m' + k], d['q' + k]]);
    const st = eventStatus(x, stockNow(), res);
    material = h('div', { class: 'card' }, h('h3', {}, '📦 ' + L('Matériel réservé', 'Reserved equipment')),
      st.text ? h('p', { class: 'stock-' + st.level }, st.text) : null,
      lines.length ? h('ul', {}, lines.map(([a, q]) => h('li', {}, q + ' × ' + a + '  ',
        h('span', { class: 'muted' }, c.mont ? L('dispo le jour du montage (après cet event) : ', 'left on set-up day (after this event): ') + available(stockNow(), res, a, c.mont) : ''))))
        : h('p', { class: 'muted' }, L('Aucun matériel du stock choisi.', 'No stock equipment selected.')));
  }

  /* Actions */
  const actions = h('div', { class: 'actions no-print' },
    h('button', { class: 'btn', onclick: () => window.print() }, '🖨️ ' + t('print')),
    h('a', { class: 'btn', href: '#/d/' + x.id, target: '_blank', rel: 'noopener' }, '↗ ' + L('Nouvel onglet', 'New tab')),
    kind === 'hq' && !d.transfert && !ro ? h('button', { class: 'btn primary', onclick: () => transfer(x) }, '➡️ ' + L('Transférer', 'Transfer')) : null,
    !ro ? h('button', { class: 'btn danger-ghost', onclick: async () => {
      if (!await confirmBox(t('delete'), L('Le dossier va dans la corbeille. ', 'The file goes to the bin. ') + (isAdmin ? '' : L('Seul l\'admin peut le restaurer.', 'Only the admin can restore it.')), t('delete'), true)) return;
      try { upsert(await api('DELETE', '/api/dossiers/' + x.id)); toast(L('Mis à la corbeille', 'Moved to bin')); location.hash = '#/' + kind; } catch (e) { toast(e.message, 'err'); }
    } }, '🗑️ ' + t('delete')) : null,
    ro && isAdmin ? h('button', { class: 'btn primary', onclick: async () => { upsert(await api('POST', '/api/dossiers/' + x.id + '/restore')); toast(L('Restauré', 'Restored')); } }, '♻️ ' + t('restore')) : null);

  const hist = h('div', { class: 'card history' }, h('h3', {}, '🕘 ' + t('history')), h('p', { class: 'muted' }, '…'));
  api('GET', '/api/dossiers/' + x.id + '/history').then(rows => {
    const lab = k => { const f = S.field(kind, k); return f ? (getLang() === 'en' ? f.en : f.fr) : k; };
    const fmt = (k, v) => { const f = S.field(kind, k); return f && f.t === 'date' ? S.fmtDate(v) : v; };
    hist.replaceChildren(h('h3', {}, '🕘 ' + t('history')),
      rows.length ? h('table', { class: 'hist' }, h('tbody', {}, rows.map(r => h('tr', {},
        h('td', { class: 'muted' }, new Date(r.at).toLocaleString(getLang() === 'en' ? 'en-GB' : 'fr-FR', { dateStyle: 'short', timeStyle: 'short' })),
        h('td', {}, r.who || ''),
        h('td', {}, /^[a-z0-9]+$/.test(r.field) ? lab(r.field) : r.field),
        h('td', {}, /^[a-z0-9]+$/.test(r.field) ? [h('s', { class: 'muted' }, fmt(r.field, r.before) || '∅'), ' → ', fmt(r.field, r.after) || '∅'] : r.after)))))
      : h('p', { class: 'muted' }, '—'));
  }).catch(() => {});

  return h('section', { class: 'page dossier' + (ro ? ' readonly' : '') },
    h('div', { class: 'crumbs no-print' }, h('a', { href: '#/' + kind }, '← ' + K.icon + ' ' + (getLang() === 'en' ? K.en : K.fr)), status),
    h('header', { class: 'dossier-head', style: { '--accent': K.color } },
      h('img', { src: '/img/logo.png', alt: 'Unilumin Africa Office', class: 'print-logo' }),
      h('div', { class: 'kind-badge' }, K.icon + ' ' + (getLang() === 'en' ? K.sen : K.sfr) + ' · N° ' + x.n),
      h('h1', { class: 'dossier-name' }, d.name || '(sans nom)'),
      h('div', { class: 'pills' }, statePill(kind, d.etat), kind !== 'hq' ? prioPill(d.prio) : null,
        d.resp ? h('span', { class: 'pill soft' }, '👤 ' + display(kind, { k: 'resp' }, d.resp)) : null,
        d.majd ? h('span', { class: 'pill soft' }, L('MAJ le ', 'Updated ') + S.fmtDate(d.majd) + (d.majp ? ' · ' + d.majp : '')) : null,
        ro ? h('span', { class: 'pill', style: { background: '#FEE2E2', color: '#991B1B' } }, '🗑️ ' + L('Dans la corbeille', 'In the bin')) : null)),
    actions,
    material,
    ...cards,
    hist);
}

function transfer(x) {
  const pick = h('div', { class: 'kind-tabs' }, S.HQ_DEST.map(k => h('button', { class: 'kind-tab', style: { '--accent': S.KINDS[k].color }, onclick: async () => {
    try {
      const out = await api('POST', '/api/dossiers/' + x.id + '/transfer', { dest: k });
      upsert(out.created); upsert(out.hq);
      m.close();
      toast(L('Transféré ✓', 'Transferred ✓'));
      location.hash = '#/d/' + out.created.id;
    } catch (e) { toast(e.message, 'err'); }
  } }, S.KINDS[k].icon + ' ' + S.KINDS[k].fr)));
  const m = modal('➡️ ' + L('Transférer le contact', 'Transfer contact'),
    h('div', {}, h('p', {}, L('Le contact devient un nouveau dossier. Le nom, le téléphone et la demande sont recopiés.', 'The contact becomes a new file. Name, phone and request are copied.')), pick));
}
