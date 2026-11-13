/* Unilumin Africa Office — application */
import { h, $, clear, api, toast, modal } from './ui.js';
import * as S from './schema.js';
import { store, load, startPolling, on, list, upsert, remove, pendingCount, clearLocal } from './store.js';
import { t, L, setLang, getLang } from './i18n.js';
import { tableView } from './views/table.js';
import { dossierView } from './views/dossier.js';
import { openNewDossier } from './views/newdossier.js';
import { homeView } from './views/home.js';
import { agendaView } from './views/agenda.js';
import { calendarView } from './views/calendar.js';
import { stockView } from './views/stock.js';
import { adminView } from './views/admin.js';
import { statePill } from './views/fields.js';

const app = $('#app');

async function boot() {
  let st;
  try { st = await api('GET', '/api/status'); }
  catch { clear(app).append(h('div', { class: 'center-box' }, h('h1', {}, 'Unilumin Africa Office'), h('p', {}, 'Serveur injoignable. Vérifiez que le PC du bureau est allumé.'))); return; }
  if (st.needsSetup) return setupScreen();
  if (!st.user) return loginScreen();
  setLang(st.user.lang);
  await load(true);
  layout();
  startPolling();
  if (st.user.mustChange) changePassword(true);
}

/* ---------- Connexion ---------- */
function brand() {
  return h('div', { class: 'brand-big' }, h('img', { src: '/img/logo.png', alt: '' }), h('h1', {}, 'Unilumin Africa Office'));
}
function loginScreen() {
  const err = h('p', { class: 'err', role: 'alert' });
  const email = h('input', { type: 'email', autocomplete: 'username', required: true, id: 'email' });
  const pw = h('input', { type: 'password', autocomplete: 'current-password', required: true, id: 'pw' });
  const form = h('form', { class: 'login', onsubmit: async e => {
    e.preventDefault(); err.textContent = '';
    try { await api('POST', '/api/login', { email: email.value, password: pw.value }); location.reload(); }
    catch (ex) { err.textContent = ex.message; pw.value = ''; pw.focus(); }
  } },
    brand(),
    h('label', { for: 'email' }, 'E-mail'), email,
    h('label', { for: 'pw' }, 'Mot de passe'), pw,
    err, h('button', { class: 'btn primary big', type: 'submit' }, 'Se connecter'),
    h('p', { class: 'muted small' }, 'Pas de compte ? Demandez-le à l\'administrateur.'));
  clear(app).append(h('div', { class: 'center-box' }, form));
  email.focus();
}
function setupScreen() {
  const err = h('p', { class: 'err', role: 'alert' });
  const f = { code: h('input', { id: 'code', autocomplete: 'off' }), name: h('input', { id: 'nm' }),
              email: h('input', { id: 'em', type: 'email' }), password: h('input', { id: 'pw', type: 'password', autocomplete: 'new-password' }) };
  clear(app).append(h('div', { class: 'center-box' }, h('form', { class: 'login', onsubmit: async e => {
    e.preventDefault(); err.textContent = '';
    try { await api('POST', '/api/setup', Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.value]))); location.reload(); }
    catch (ex) { err.textContent = ex.message; }
  } }, brand(), h('h2', {}, 'Premier démarrage : compte administrateur'),
    h('p', { class: 'muted small' }, 'Le code d\'installation est affiché dans la fenêtre noire du serveur.'),
    h('label', { for: 'code' }, 'Code d\'installation'), f.code, h('label', { for: 'nm' }, 'Votre nom (comme dans l\'équipe)'), f.name,
    h('label', { for: 'em' }, 'E-mail'), f.email, h('label', { for: 'pw' }, 'Mot de passe (8 caractères minimum)'), f.password,
    err, h('button', { class: 'btn primary big', type: 'submit' }, 'Créer le compte admin'))));
}
function changePassword(forced) {
  const cur = h('input', { type: 'password', autocomplete: 'current-password' }), nw = h('input', { type: 'password', autocomplete: 'new-password' });
  modal('🔑 ' + t('changePw'), h('div', { class: 'form-grid' },
    forced ? h('p', { class: 'wide' }, L('Première connexion : choisissez votre propre mot de passe.', 'First sign-in: choose your own password.')) : null,
    h('label', { class: 'f wide' }, h('span', {}, L('Mot de passe actuel', 'Current password')), cur),
    h('label', { class: 'f wide' }, h('span', {}, L('Nouveau mot de passe (8 caractères min.)', 'New password (min. 8 characters)')), nw)),
    [{ label: t('cancel') }, { label: t('save'), kind: 'primary', run: async () => {
      try { await api('POST', '/api/me/password', { current: cur.value, password: nw.value }); toast(t('saved')); }
      catch (e) { toast(e.message, 'err'); return false; }
    } }]);
}

/* ---------- Mise en page ---------- */
let main, navEl, offlineBar;
function layout() {
  main = h('main', { id: 'main', tabindex: '-1' });
  navEl = h('nav', { class: 'side', 'aria-label': 'Menu' });
  offlineBar = h('div', { class: 'offline', hidden: true }, t('offline'));
  const search = h('input', { type: 'search', class: 'global-search', placeholder: t('search'), 'aria-label': t('search'),
    onkeydown: e => { if (e.key === 'Enter' && e.target.value.trim()) { location.hash = '#/search/' + encodeURIComponent(e.target.value.trim()); } } });
  const top = h('header', { class: 'top' },
    h('button', { class: 'icon-btn menu-btn', 'aria-label': 'Menu', onclick: () => document.body.classList.toggle('nav-open') }, '☰'),
    search,
    h('button', { class: 'btn primary', onclick: () => openNewDossier(currentKind() || 'proj') }, '➕ ', h('span', { class: 'hide-sm' }, t('newDossier'))),
    h('div', { class: 'me' }, h('span', { class: 'hide-sm muted' }, t('loggedAs') + ' '), h('b', {}, store.me.name),
      h('button', { class: 'icon-btn', title: t('lang'), onclick: async () => { await api('POST', '/api/me/lang', { lang: getLang() === 'en' ? 'fr' : 'en' }); location.reload(); } }, getLang() === 'en' ? 'FR' : 'EN'),
      h('button', { class: 'icon-btn', title: t('changePw'), onclick: () => changePassword(false) }, '🔑'),
      h('button', { class: 'icon-btn', title: t('logout'), onclick: async () => {
        if (pendingCount() && !confirm(L('Des modifications ne sont pas encore envoyées. Se déconnecter quand même ?', 'Some changes are not synced yet. Log out anyway?'))) return;
        await api('POST', '/api/logout'); clearLocal(); location.reload(); } }, '⎋')));
  clear(app).append(navEl, h('div', { class: 'body' }, top, offlineBar, main));
  drawNav();
  on(what => {
    const n = pendingCount();
    offlineBar.hidden = store.online && !n;
    offlineBar.className = store.online ? 'pending' : 'offline';
    offlineBar.textContent = store.online ? L(n + ' modification(s) en cours d\'envoi…', n + ' change(s) syncing…')
                                          : t('offline') + (n ? ' (' + n + ')' : '');
    if (what === 'offline') { refresh(); return; }
    if (what === 'data') { drawNav(); refresh(); }
  });
  window.addEventListener('hashchange', route);
  route();
}
function currentKind() { const m = location.hash.match(/^#\/(proj|ev|ao|ex|sav|hq)$/); return m && m[1]; }
function drawNav() {
  const item = (href, icon, label, badge) => h('a', { href, class: location.hash === href || (href === '#/' && !location.hash) ? 'on' : '' },
    h('span', { class: 'ni' }, icon), h('span', { class: 'nl' }, label), badge ? h('span', { class: 'badge' }, badge) : null);
  const open = k => list(k, { closed: false }).length;
  const newHq = list('hq', { closed: false }).filter(x => x.data.etat === 'Nouveau').length;
  navEl.replaceChildren(
    h('a', { class: 'logo', href: '#/' }, h('img', { src: '/img/logo.png', alt: 'Unilumin Africa Office' })),
    item('#/', '🏠', t('accueil')),
    h('div', { class: 'nav-sep' }),
    ...S.KIND_ORDER.map(k => item('#/' + k, S.KINDS[k].icon, getLang() === 'en' ? S.KINDS[k].en : S.KINDS[k].fr, k === 'hq' ? (newHq || '') : open(k))),
    h('div', { class: 'nav-sep' }),
    item('#/agenda', '📋', t('agenda')), item('#/calendrier', '📅', t('calendrier')), item('#/stock', '📦', t('stock')),
    h('div', { class: 'nav-sep' }),
    item('#/corbeille', '🗑️', t('corbeille'), list(null, { deleted: true }).length || ''),
    store.me.role === 'admin' ? item('#/admin', '👥', t('admin')) : null,
    item('#/versions', '📝', t('versions')));
}

/* ---------- Routes ---------- */
let currentView = null;
function route() {
  document.body.classList.remove('nav-open');
  const hash = location.hash || '#/';
  let m, view;
  if ((m = hash.match(/^#\/(proj|ev|ao|ex|sav|hq)$/))) view = tableView(m[1]);
  else if ((m = hash.match(/^#\/d\/(-?\d+)$/))) view = dossierView(m[1]);
  else if ((m = hash.match(/^#\/search\/(.+)$/))) view = searchView(decodeURIComponent(m[1]));
  else if (hash === '#/agenda') view = agendaView();
  else if (hash === '#/calendrier') view = calendarView();
  else if (hash === '#/stock') view = stockView();
  else if (hash === '#/corbeille') view = trashView();
  else if (hash === '#/admin' && store.me.role === 'admin') view = adminView();
  else if (hash === '#/versions') view = versionsView();
  else view = homeView();
  currentView = { hash, view };
  clear(main).append(view);
  drawNav();
  document.title = (view.querySelector('h1')?.textContent || 'Accueil') + ' · Unilumin Africa Office';
}
/* Rafraîchit la page affichée quand des données arrivent, sans perdre une saisie en cours */
function refresh() {
  if (!currentView) return;
  const active = document.activeElement;
  if (active && main.contains(active) && active.matches('input, textarea, select')) return;
  if (currentView.view.refresh) currentView.view.refresh(); else route();
}

/* ---------- Recherche globale ---------- */
function searchView(q) {
  const n = S.norm(q);
  const hits = [...store.dossiers.values()].filter(x => S.norm(Object.values(x.data).join(' ')).includes(n));
  return h('section', { class: 'page' }, h('header', { class: 'page-head' }, h('h1', {}, '🔎 « ' + q + ' »'), h('span', { class: 'muted' }, hits.length + ' ' + L('résultat(s)', 'result(s)'))),
    h('div', { class: 'cards-list' }, hits.map(x => resultCard(x))));
}
function resultCard(x) {
  const K = S.KINDS[x.kind];
  return h('a', { class: 'result' + (x.deleted_at ? ' gone' : ''), href: '#/d/' + x.id, style: { '--accent': K.color } },
    h('span', { class: 'kind-badge' }, K.icon + ' ' + K.sfr + ' n°' + x.n), h('b', {}, x.data.name),
    statePill(x.kind, x.data.etat), h('span', { class: 'muted' }, [x.data.resp, x.data.lieu || x.data.pays, x.data.tel].filter(Boolean).join(' · ')),
    x.deleted_at ? h('span', { class: 'muted' }, '🗑️') : null);
}

/* ---------- Corbeille ---------- */
function trashView() {
  const rows = list(null, { deleted: true }).sort((a, b) => (b.deleted_at || '').localeCompare(a.deleted_at || ''));
  const isAdmin = store.me.role === 'admin';
  const v = h('section', { class: 'page' }, h('header', { class: 'page-head' }, h('h1', {}, '🗑️ ' + t('corbeille')), h('span', { class: 'muted' }, rows.length + '')),
    h('p', { class: 'muted' }, isAdmin ? L('Restaurer remet le dossier à sa place. Supprimer définitivement ne peut pas être annulé.', 'Restore puts the file back. Delete for good cannot be undone.')
                                       : L('Seul l\'administrateur peut restaurer un dossier.', 'Only the admin can restore a file.')),
    h('div', { class: 'cards-list' }, rows.map(x => h('div', { class: 'trash-row' }, resultCard(x),
      h('span', { class: 'muted small' }, L('par ', 'by ') + (x.deleted_by || '?') + ' · ' + new Date(x.deleted_at).toLocaleDateString('fr-FR')),
      isAdmin ? h('button', { class: 'btn', onclick: async () => { upsert(await api('POST', '/api/dossiers/' + x.id + '/restore')); toast(L('Restauré', 'Restored')); } }, '♻️ ' + t('restore')) : null,
      isAdmin ? h('button', { class: 'btn danger-ghost', onclick: async () => {
        const { confirmBox } = await import('./ui.js');
        if (!await confirmBox(t('purge'), L('« ' + x.data.name + ' » sera effacé pour toujours, avec son historique.', '"' + x.data.name + '" will be erased for good, with its history.'), t('purge'), true)) return;
        await api('DELETE', '/api/dossiers/' + x.id + '/purge'); remove(x.id); toast(L('Supprimé', 'Deleted'));
      } }, '✖ ' + t('purge')) : null))));
  return v;
}

/* ---------- Versions ---------- */
function versionsView() {
  const V = [
    ['1.0.0', '13/11/2026', 'Seif', 'Première version du site : comptes et connexion, Projets, Events, Appels d\'offres, Export, SAV, Contacts siège, Agenda, Calendrier, Stock, Corbeille, historique, recherche.']
  ];
  return h('section', { class: 'page' }, h('header', { class: 'page-head' }, h('h1', {}, '📝 ' + t('versions'))),
    h('table', { class: 'grid' }, h('thead', {}, h('tr', {}, ['Version', 'Date', L('Par', 'By'), L('Changements', 'Changes')].map(x => h('th', {}, x)))),
      h('tbody', {}, V.map(r => h('tr', {}, r.map(c => h('td', {}, c)))))));
}

boot();
