/* Unilumin Africa Office — application (version en ligne) */
import { h, $, clear, toast, modal } from './ui.js';
import * as S from './schema.js';
import { store, on, list, restore, purge, myName, login, resume, forget, load, startPolling, firstSetup, changePassword, canView, canEdit } from './store.js';
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
import { confirmBox } from './ui.js';

const app = $('#app');
let searchQuery = '';

async function boot() {
  try { setLang(localStorage.getItem('uao_lang') || 'fr'); } catch { setLang('fr'); }
  let ok = false;
  try { ok = await resume(); } catch { forget(); }
  if (!ok) return loginScreen();
  await enter();
}
async function enter() {
  clear(app).append(h('div', { class: 'center-box' }, h('div', { class: 'login' }, brand(), h('p', { class: 'muted' }, L('Ouverture des dossiers…', 'Opening files…')))));
  try { await load(); }
  catch (e) { forget(); loginScreen(e.message); return; }
  if (store.me.mustChange) return passwordScreen(true);
  layout();
  startPolling();
}
function brand() {
  return h('div', { class: 'brand-big' }, h('img', { src: 'img/logo.png', alt: '' }), h('h1', {}, 'Unilumin Africa Office'));
}

/* ---------- Connexion ---------- */
function loginScreen(message) {
  const err = h('p', { class: 'err', role: 'alert' }, message || '');
  const user = h('input', { id: 'login-user', autocomplete: 'username', autocapitalize: 'none', required: true });
  const pw = h('input', { id: 'login-pw', type: 'password', autocomplete: 'current-password', required: true });
  const btn = h('button', { class: 'btn primary big', type: 'submit' }, L('Se connecter', 'Sign in'));
  const form = h('form', { class: 'login', onsubmit: async e => {
    e.preventDefault(); err.textContent = ''; btn.disabled = true; btn.textContent = L('Vérification…', 'Checking…');
    try {
      const r = await login(user.value, pw.value);
      if (r === 'setup') return setupScreen();
      await enter();
    } catch (ex) { err.textContent = ex.message; pw.value = ''; pw.focus(); btn.disabled = false; btn.textContent = L('Se connecter', 'Sign in'); }
  } }, brand(),
    h('label', { for: 'login-user' }, L('Nom d\'utilisateur', 'Username')), user,
    h('label', { for: 'login-pw' }, L('Mot de passe', 'Password')), pw,
    err, btn,
    h('p', { class: 'muted small' }, L('Pas de compte ? Demandez-le à l\'administrateur.', 'No account? Ask the administrator.')));
  clear(app).append(h('div', { class: 'center-box' }, form));
  user.focus();
}
/* Premier démarrage : admin / admin → choisir un vrai mot de passe et donner le jeton GitHub */
function setupScreen() {
  const err = h('p', { class: 'err', role: 'alert' });
  const f = { name: h('input', { id: 'su-name', value: 'Seif' }), pw: h('input', { id: 'su-pw', type: 'password', autocomplete: 'new-password' }),
              pw2: h('input', { id: 'su-pw2', type: 'password', autocomplete: 'new-password' }), token: h('input', { id: 'su-token', autocomplete: 'off', spellcheck: 'false' }) };
  const btn = h('button', { class: 'btn primary big', type: 'submit' }, L('Terminer l\'installation', 'Finish setup'));
  clear(app).append(h('div', { class: 'center-box' }, h('form', { class: 'login wide-login', onsubmit: async e => {
    e.preventDefault(); err.textContent = '';
    if (f.pw.value !== f.pw2.value) { err.textContent = L('Les deux mots de passe ne sont pas identiques.', 'Passwords do not match.'); return; }
    btn.disabled = true; btn.textContent = L('Installation…', 'Setting up…');
    try { await firstSetup({ name: f.name.value, password: f.pw.value, token: f.token.value }); await enter(); }
    catch (ex) { err.textContent = ex.message; btn.disabled = false; btn.textContent = L('Terminer l\'installation', 'Finish setup'); }
  } }, brand(),
    h('h2', {}, L('Première connexion de l\'administrateur', 'First admin sign-in')),
    h('p', { class: 'small' }, L('Les données sont enregistrées chiffrées dans le dépôt GitHub. « admin / admin » sert seulement à cette installation : choisissez maintenant votre vrai mot de passe (10 caractères minimum). Votre nom d\'utilisateur reste « admin ».',
      'Data is stored encrypted in the GitHub repository. "admin / admin" is only for this setup: choose your real password now (10+ characters). Your username stays "admin".')),
    h('label', { for: 'su-name' }, L('Votre nom (affiché dans « MAJ par »)', 'Your name (shown in "Updated by")')), f.name,
    h('label', { for: 'su-pw' }, L('Nouveau mot de passe', 'New password')), f.pw,
    h('label', { for: 'su-pw2' }, L('Répéter le mot de passe', 'Repeat password')), f.pw2,
    h('label', { for: 'su-token' }, L('Jeton GitHub (accès en écriture au dépôt)', 'GitHub token (write access to the repo)')), f.token,
    h('details', { class: 'small' }, h('summary', {}, L('Comment créer le jeton GitHub ?', 'How to create the GitHub token?')),
      h('ol', { class: 'steps' },
        h('li', {}, 'github.com → ', h('b', {}, 'Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token')),
        h('li', {}, L('Resource owner : ', 'Resource owner: '), h('b', {}, 'LED-solutions'), L(' · Repository access : ', ' · Repository access: '), h('b', {}, 'Only select repositories → unilumin-africa-office')),
        h('li', {}, L('Permissions → Repository → ', 'Permissions → Repository → '), h('b', {}, 'Contents : Read and write'), L(' · Expiration : 1 an', ' · Expiration: 1 year')),
        h('li', {}, L('Copier le jeton (github_pat_…) et le coller ici.', 'Copy the token (github_pat_…) and paste it here.')))),
    err, btn)));
  f.pw.focus();
}
function passwordScreen(forced) {
  const err = h('p', { class: 'err', role: 'alert' });
  const cur = h('input', { id: 'pw-cur', type: 'password', autocomplete: 'current-password' });
  const nw = h('input', { id: 'pw-new', type: 'password', autocomplete: 'new-password' });
  const nw2 = h('input', { id: 'pw-new2', type: 'password', autocomplete: 'new-password' });
  const submit = async e => {
    e && e.preventDefault(); err.textContent = '';
    if (nw.value !== nw2.value) { err.textContent = L('Les deux mots de passe ne sont pas identiques.', 'Passwords do not match.'); return false; }
    try { await changePassword(cur.value, nw.value); toast(L('Mot de passe changé ✓', 'Password changed ✓')); if (forced) { layout(); startPolling(); } }
    catch (ex) { err.textContent = ex.message; return false; }
  };
  const fields = [h('label', { for: 'pw-cur' }, L('Mot de passe actuel (donné par l\'administrateur)', 'Current password')), cur,
    h('label', { for: 'pw-new' }, L('Nouveau mot de passe (10 caractères minimum)', 'New password (10+ characters)')), nw,
    h('label', { for: 'pw-new2' }, L('Répéter le nouveau mot de passe', 'Repeat new password')), nw2, err];
  if (forced) {
    clear(app).append(h('div', { class: 'center-box' }, h('form', { class: 'login', onsubmit: submit }, brand(),
      h('h2', {}, L('Choisissez votre mot de passe', 'Choose your password')), ...fields, h('button', { class: 'btn primary big', type: 'submit' }, L('Enregistrer', 'Save')))));
    cur.focus();
  } else {
    modal('🔑 ' + t('changePw'), h('div', { class: 'login-like' }, ...fields), [{ label: t('cancel') }, { label: t('save'), kind: 'primary', run: submit }]);
  }
}

/* ---------- Mise en page ---------- */
let main, navEl, roBar;
function layout() {
  main = h('main', { id: 'main', tabindex: '-1' });
  navEl = h('nav', { class: 'side', 'aria-label': 'Menu' });
  roBar = h('div', { class: 'offline', hidden: true },
    L('Accès en lecture seule. Pour modifier, demandez à l\'administrateur de vous mettre « Contributeur » dans le partage.',
      'Read-only access. To edit, ask the admin to make you a "Contributor" in sharing.'));
  const search = h('input', { type: 'search', id: 'global-search', class: 'global-search', placeholder: t('search'), 'aria-label': t('search'),
    onkeydown: e => { if (e.key === 'Enter' && e.target.value.trim()) { searchQuery = e.target.value.trim(); if (location.hash === '#recherche') route(); else location.hash = '#recherche'; } } });
  const top = h('header', { class: 'top' },
    h('button', { class: 'icon-btn menu-btn', 'aria-label': 'Menu', onclick: () => document.body.classList.toggle('nav-open') }, '☰'),
    search,
    S.KIND_ORDER.some(canEdit) ? h('button', { class: 'btn primary', onclick: () => openNewDossier(currentKind() && canEdit(currentKind()) ? currentKind() : S.KIND_ORDER.find(canEdit)) }, '➕ ', h('span', { class: 'hide-sm' }, t('newDossier'))) : null,
    h('div', { class: 'me' }, h('span', { class: 'hide-sm muted' }, t('loggedAs') + ' '), h('b', {}, myName()),
      h('button', { class: 'icon-btn', title: t('lang'), onclick: () => { try { localStorage.setItem('uao_lang', getLang() === 'en' ? 'fr' : 'en'); } catch { /* */ } setLang(getLang() === 'en' ? 'fr' : 'en'); layout(); } }, getLang() === 'en' ? 'FR' : 'EN'),
      h('button', { class: 'icon-btn', title: t('changePw'), 'aria-label': t('changePw'), onclick: () => passwordScreen(false) }, '🔑'),
      h('button', { class: 'icon-btn', title: t('logout'), 'aria-label': t('logout'), onclick: () => { forget(); location.hash = ''; location.reload(); } }, '⎋')));
  clear(app).append(navEl, h('div', { class: 'body' }, top, roBar, main));
  drawNav();
  if (!layout.bound) {
    on(what => { if (what === 'data') drawNav(); refresh(); });
    window.addEventListener('hashchange', route);
    layout.bound = true;
  }
  route();
}
function currentKind() { const m = location.hash.match(/^#(proj|ev|ao|ex|sav|hq)$/); return m && m[1]; }
function drawNav() {
  const cur = location.hash || '#accueil';
  const item = (href, icon, label, badge) => h('a', { href, class: cur === href ? 'on' : '' },
    h('span', { class: 'ni' }, icon), h('span', { class: 'nl' }, label), badge ? h('span', { class: 'badge' }, badge) : null);
  const open = k => list(k, { closed: false }).length;
  const newHq = list('hq', { closed: false }).filter(x => x.data.etat === 'Nouveau').length;
  navEl.replaceChildren(
    h('a', { class: 'logo', href: '#accueil' }, h('img', { src: 'img/logo.png', alt: 'Unilumin Africa Office' })),
    item('#accueil', '🏠', t('accueil')),
    h('div', { class: 'nav-sep' }),
    ...S.KIND_ORDER.filter(canView).map(k => item('#' + k, S.KINDS[k].icon, getLang() === 'en' ? S.KINDS[k].en : S.KINDS[k].fr, k === 'hq' ? (newHq || '') : open(k))),
    h('div', { class: 'nav-sep' }),
    item('#agenda', '📋', t('agenda')), item('#calendrier', '📅', t('calendrier')), canView('stock') ? item('#stock', '📦', t('stock')) : null,
    h('div', { class: 'nav-sep' }),
    item('#corbeille', '🗑️', t('corbeille'), list(null, { deleted: true }).length || ''),
    store.me.role === 'admin' ? item('#equipe', '👥', t('admin')) : null,
    item('#versions', '📝', t('versions')));
}

/* ---------- Routes (#nom simple) ---------- */
let currentView = null;
function route() {
  document.body.classList.remove('nav-open');
  const hash = location.hash || '#accueil';
  let m, view;
  if ((m = hash.match(/^#(proj|ev|ao|ex|sav|hq)$/)) && canView(m[1])) view = tableView(m[1]);
  else if ((m = hash.match(/^#d-([A-Za-z0-9]+)$/))) view = dossierView(m[1]);
  else if (hash === '#recherche') view = searchView(searchQuery);
  else if (hash === '#agenda') view = agendaView();
  else if (hash === '#calendrier') view = calendarView();
  else if (hash === '#stock' && canView('stock')) view = stockView();
  else if (hash === '#corbeille') view = trashView();
  else if (hash === '#equipe' && store.me.role === 'admin') view = adminView();
  else if (hash === '#versions') view = versionsView();
  else view = homeView();
  currentView = { hash, view };
  clear(main).append(view);
  drawNav();
  main.scrollTop = 0;
  document.title = (view.querySelector('h1')?.textContent || 'Accueil') + ' · Unilumin Africa Office';
}
/* Rafraîchit la page affichée quand les collègues modifient quelque chose, sans perdre une saisie en cours */
function refresh() {
  if (!currentView) return;
  const active = document.activeElement;
  if (active && main.contains(active) && active.matches('input, textarea, select')) return;
  if (document.querySelector('.modal-wrap')) return;
  if (currentView.view.refresh) currentView.view.refresh(); else route();
}

/* ---------- Recherche globale ---------- */
function searchView(q) {
  const n = S.norm(q);
  const hits = n ? [...store.dossiers.values()].filter(x => S.norm(Object.values(x.data).join(' ')).includes(n) || String(x.n) === n) : [];
  return h('section', { class: 'page' }, h('header', { class: 'page-head' }, h('h1', {}, '🔎 « ' + q + ' »'), h('span', { class: 'muted' }, hits.length + ' ' + L('résultat(s)', 'result(s)'))),
    h('div', { class: 'cards-list' }, hits.map(x => resultCard(x))));
}
function resultCard(x) {
  const K = S.KINDS[x.kind];
  return h('a', { class: 'result' + (x.deleted_at ? ' gone' : ''), href: '#d-' + x.id, style: { '--accent': K.color } },
    h('span', { class: 'kind-badge' }, K.icon + ' ' + K.sfr + ' n°' + x.n), h('b', {}, x.data.name),
    statePill(x.kind, x.data.etat), h('span', { class: 'muted' }, [x.data.resp, x.data.lieu || x.data.pays, x.data.tel].filter(Boolean).join(' · ')),
    x.deleted_at ? h('span', { class: 'muted' }, '🗑️') : null);
}

/* ---------- Corbeille ---------- */
function trashView() {
  const rows = list(null, { deleted: true }).sort((a, b) => (b.deleted_at || '').localeCompare(a.deleted_at || ''));
  const isAdmin = store.me.role === 'admin';
  return h('section', { class: 'page' }, h('header', { class: 'page-head' }, h('h1', {}, '🗑️ ' + t('corbeille')), h('span', { class: 'muted' }, rows.length + '')),
    h('p', { class: 'muted' }, isAdmin ? L('Restaurer remet le dossier à sa place. Supprimer définitivement ne peut pas être annulé.', 'Restore puts the file back. Delete for good cannot be undone.')
                                       : L('Seul l\'administrateur peut restaurer un dossier.', 'Only the admin can restore a file.')),
    rows.length ? null : h('p', { class: 'muted' }, L('La corbeille est vide.', 'The bin is empty.')),
    h('div', { class: 'cards-list' }, rows.map(x => h('div', { class: 'trash-row' }, resultCard(x),
      h('span', { class: 'muted small' }, L('par ', 'by ') + (x.deleted_name || '?') + ' · ' + new Date(x.deleted_at).toLocaleDateString('fr-FR')),
      isAdmin ? h('button', { class: 'btn', onclick: async () => { try { await restore(x.id); toast(L('Restauré', 'Restored')); } catch (e) { toast(e.message, 'err'); } } }, '♻️ ' + t('restore')) : null,
      isAdmin ? h('button', { class: 'btn danger-ghost', onclick: async () => {
        if (!await confirmBox(t('purge'), L('« ' + x.data.name + ' » sera effacé pour toujours, avec son historique.', '"' + x.data.name + '" will be erased for good, with its history.'), t('purge'), true)) return;
        try { await purge(x.id); toast(L('Supprimé', 'Deleted')); } catch (e) { toast(e.message, 'err'); }
      } }, '✖ ' + t('purge')) : null))));
}

/* ---------- Versions ---------- */
function versionsView() {
  const V = [
    ['2.0.0', '13/11/2026', 'Seif', 'Site en ligne sur GitHub : un seul lien, connexion par nom d\'utilisateur et mot de passe, droits par onglet (cacher / voir / modifier), données chiffrées, mises à jour automatiques entre collègues.'],
    ['1.0.0', '13/11/2026', 'Seif', 'Première version du site : Projets, Events, Appels d\'offres, Export, SAV, Contacts siège, Agenda, Calendrier, Stock, Corbeille, historique, recherche.']
  ];
  return h('section', { class: 'page' }, h('header', { class: 'page-head' }, h('h1', {}, '📝 ' + t('versions'))),
    h('div', { class: 'table-wrap' }, h('table', { class: 'grid' }, h('thead', {}, h('tr', {}, ['Version', 'Date', L('Par', 'By'), L('Changements', 'Changes')].map(x => h('th', {}, x)))),
      h('tbody', {}, V.map(r => h('tr', {}, r.map(c => h('td', {}, c))))))));
}

boot();
