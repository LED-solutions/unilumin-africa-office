/* 👥 Administration : comptes et droits par onglet, équipe, listes, import, jeton GitHub */
import { h, toast, modal, confirmBox } from '../ui.js';
import * as S from '../schema.js';
import { store, saveTeam, saveSugg, listUsers, createUser, updateUser, deleteUser, replaceToken, AREAS } from '../store.js';
import { L } from '../i18n.js';
import { importerCard } from './importer.js';

const AREA_LABEL = { proj: '📺 Projets', ev: '🎤 Events', ao: '📄 AO', ex: '✈️ Export', sav: '🔧 SAV', hq: '📞 Siège', stock: '📦 Stock' };
const LEVELS = [['none', 'Cacher', 'Hide'], ['view', 'Voir', 'View'], ['edit', 'Modifier', 'Edit']];

function genPw() {
  const a = 'abcdefghjkmnpqrstuvwxyz23456789', b = new Uint32Array(12); crypto.getRandomValues(b);
  return Array.from(b, x => a[x % a.length]).join('');
}
function permSelect(id, value, onChange, disabled) {
  const sel = h('select', { id, class: 'perm perm-' + (value || 'none'), disabled, onchange: e => { sel.className = 'perm perm-' + e.target.value; onChange(e.target.value); } },
    LEVELS.map(([v, fr, en]) => h('option', { value: v, selected: (value || 'none') === v }, L(fr, en))));
  return sel;
}

export function adminView() {
  const v = h('section', { class: 'page' });

  /* ----- Comptes ----- */
  const usersBox = h('div', { class: 'card' }, h('h3', {}, '🔐 ' + L('Comptes et droits', 'Accounts and rights')), h('p', { class: 'muted' }, L('Chargement…', 'Loading…')));
  const drawUsers = async () => {
    let users;
    try { users = await listUsers(); } catch (e) { usersBox.replaceChildren(h('h3', {}, '🔐 ' + L('Comptes et droits', 'Accounts and rights')), h('p', { class: 'err' }, e.message)); return; }
    const rows = users.map(u => {
      const perms = { ...u.perms };
      let admin = u.admin, name = u.name;
      const self = u.username === store.me.username;
      const save = async () => {
        try { await updateUser(u, { perms, admin, name }); toast(L('Droits enregistrés ✓', 'Rights saved ✓')); drawUsers(); }
        catch (e) { toast(e.message, 'err'); }
      };
      return h('tr', {},
        h('td', {}, h('b', {}, u.username)),
        h('td', {}, h('input', { class: 'cell-in', id: 'un-' + u.username, value: name || '', 'aria-label': 'Nom', onchange: e => { name = e.target.value; } })),
        h('td', { class: 'num' }, h('input', { type: 'checkbox', id: 'ua-' + u.username, checked: admin, disabled: self, 'aria-label': 'Admin', onchange: e => { admin = e.target.checked; } })),
        AREAS.map(a => h('td', {}, permSelect('up-' + u.username + '-' + a, admin ? 'edit' : perms[a], val => { perms[a] = val; }, admin))),
        h('td', { class: 'nowrap' },
          h('button', { class: 'btn small primary', onclick: save }, L('Enregistrer', 'Save')),
          h('button', { class: 'btn small', onclick: () => resetPw(u) }, '🔑'),
          self ? null : h('button', { class: 'btn small danger-ghost', 'aria-label': L('Supprimer le compte', 'Delete account'), onclick: async () => {
            if (!await confirmBox(L('Supprimer le compte', 'Delete account'), L('« ' + u.username + ' » ne pourra plus se connecter.', '"' + u.username + '" will no longer be able to sign in.'), L('Supprimer', 'Delete'), true)) return;
            try { await deleteUser(u); toast(L('Compte supprimé', 'Account deleted')); drawUsers(); } catch (e) { toast(e.message, 'err'); }
          } }, '✕')));
    });
    usersBox.replaceChildren(
      h('h3', {}, '🔐 ' + L('Comptes et droits', 'Accounts and rights')),
      h('p', { class: 'muted small' }, L('Cacher = l\'onglet n\'apparaît pas · Voir = lecture seule · Modifier = peut créer et modifier. Un administrateur voit et modifie tout.',
        'Hide = tab not shown · View = read only · Edit = can create and edit. An admin sees and edits everything.')),
      h('div', { class: 'table-wrap' }, h('table', { class: 'grid perms-table' },
        h('thead', {}, h('tr', {}, h('th', {}, L('Utilisateur', 'User')), h('th', {}, L('Nom', 'Name')), h('th', {}, 'Admin'),
          AREAS.map(a => h('th', {}, AREA_LABEL[a])), h('th', {}, ''))),
        h('tbody', {}, rows))),
      h('div', { class: 'actions' }, h('button', { class: 'btn primary', onclick: newUser }, '➕ ' + L('Nouveau compte', 'New account'))));
  };
  const resetPw = u => {
    const pw = h('input', { id: 'reset-pw', value: genPw() });
    modal('🔑 ' + L('Nouveau mot de passe pour ', 'New password for ') + u.username, h('div', { class: 'form-grid' },
      h('label', { class: 'f wide' }, h('span', {}, L('Mot de passe provisoire (10 caractères minimum)', 'Temporary password (10+ characters)')), pw),
      h('p', { class: 'muted small wide' }, L('Donnez-le à la personne : elle devra en choisir un nouveau à sa prochaine connexion.', 'Give it to the person: they must choose a new one at next sign-in.'))),
      [{ label: L('Annuler', 'Cancel') }, { label: L('Changer', 'Change'), kind: 'primary', run: async () => {
        try { await updateUser(u, { password: pw.value }); toast(L('Mot de passe changé ✓', 'Password changed ✓')); drawUsers(); } catch (e) { toast(e.message, 'err'); return false; }
      } }]);
  };
  const newUser = () => {
    const perms = Object.fromEntries(AREAS.map(a => [a, 'view']));
    let admin = false;
    const f = { username: h('input', { id: 'nu-user', autocapitalize: 'none' }), name: h('input', { id: 'nu-name' }), password: h('input', { id: 'nu-pw', value: genPw() }) };
    modal('➕ ' + L('Nouveau compte', 'New account'), h('div', {},
      h('div', { class: 'form-grid' },
        h('label', { class: 'f' }, h('span', {}, L('Nom d\'utilisateur (pour se connecter)', 'Username (to sign in)')), f.username),
        h('label', { class: 'f' }, h('span', {}, L('Nom affiché (comme dans l\'équipe)', 'Display name (as in the team)')), f.name),
        h('label', { class: 'f' }, h('span', {}, L('Mot de passe provisoire', 'Temporary password')), f.password),
        h('label', { class: 'f check-f' }, h('span', {}, L('Administrateur', 'Administrator')), h('input', { type: 'checkbox', id: 'nu-admin', onchange: e => { admin = e.target.checked; } }))),
      h('h3', { class: 'sub' }, L('Droits par onglet', 'Rights per tab')),
      h('div', { class: 'perm-grid' }, AREAS.map(a => h('label', { class: 'f' }, h('span', {}, AREA_LABEL[a]), permSelect('nu-p-' + a, perms[a], val => { perms[a] = val; })))),
      h('p', { class: 'muted small' }, L('Donnez le nom d\'utilisateur et le mot de passe à la personne : elle choisira son propre mot de passe à la première connexion.',
        'Give the username and password to the person: they choose their own password at first sign-in.'))),
      [{ label: L('Annuler', 'Cancel') }, { label: L('Créer le compte', 'Create account'), kind: 'primary', run: async () => {
        try { await createUser({ username: f.username.value, name: f.name.value || f.username.value, password: f.password.value, admin, perms }); toast(L('Compte créé ✓', 'Account created ✓')); drawUsers(); }
        catch (e) { toast(e.message, 'err'); return false; }
      } }]);
  };

  /* ----- Équipe (organigramme, listes « Responsable ») ----- */
  const teamBox = h('div', { class: 'card' });
  const drawTeam = () => {
    const team = store.team.map(m => ({ ...m }));
    const rows = h('tbody');
    const paint = () => rows.replaceChildren(...team.map((m, i) => h('tr', {},
      h('td', {}, h('input', { class: 'cell-in icon', id: 'tm-icon-' + i, value: m.icon || '', 'aria-label': 'Icône', onchange: e => { m.icon = e.target.value; } })),
      h('td', {}, h('input', { class: 'cell-in', id: 'tm-name-' + i, value: m.name, 'aria-label': 'Nom', onchange: e => { m.name = e.target.value; } })),
      h('td', {}, h('input', { class: 'cell-in wide-in', id: 'tm-role-' + i, value: m.role || '', 'aria-label': 'Rôle', onchange: e => { m.role = e.target.value; } })),
      h('td', { class: 'nowrap' }, h('button', { class: 'icon-btn', 'aria-label': 'Monter', onclick: () => { if (i) { [team[i - 1], team[i]] = [team[i], team[i - 1]]; paint(); } } }, '▲'),
        h('button', { class: 'icon-btn', 'aria-label': 'Retirer', onclick: () => { team.splice(i, 1); paint(); } }, '✕')))));
    paint();
    teamBox.replaceChildren(h('h3', {}, '👥 ' + L('Équipe (listes « Responsable », « Avec », organigramme)', 'Team (owner lists, org chart)')),
      h('p', { class: 'muted small' }, L('Les personnes de l\'équipe n\'ont pas besoin d\'un compte (installateurs…). Un compte sert seulement à se connecter.', 'Team members do not need an account. Accounts are only for signing in.')),
      h('div', { class: 'table-wrap' }, h('table', { class: 'grid' }, h('thead', {}, h('tr', {}, [L('Icône', 'Icon'), L('Nom', 'Name'), L('Rôle', 'Role'), ''].map(x => h('th', {}, x)))), rows)),
      h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => { team.push({ name: '', icon: '👤', role: '' }); paint(); } }, '➕ ' + L('Personne', 'Person')),
        h('button', { class: 'btn primary', onclick: async () => { try { await saveTeam(team); toast(L('Équipe enregistrée ✓', 'Team saved ✓')); } catch (e) { toast(e.message, 'err'); } } }, L('Enregistrer l\'équipe', 'Save team'))));
  };

  /* ----- Listes de suggestions ----- */
  const suggBox = h('div', { class: 'card' }, h('h3', {}, '📋 ' + L('Listes de suggestions', 'Suggestion lists')),
    h('p', { class: 'muted small' }, L('Une valeur par ligne. Les nouveaux lieux / pays tapés dans un dossier s\'ajoutent tout seuls.', 'One value per line. New places / countries are added automatically.')),
    h('div', { class: 'sugg-grid' }, Object.keys(S.DEFAULT_SUGG).map(k => {
      const ta = h('textarea', { rows: 8, id: 'sugg-' + k }); ta.value = (store.sugg[k] || []).join('\n');
      return h('div', {}, h('b', {}, ({ lieux: L('Lieux', 'Places'), pays: L('Pays', 'Countries'), pitch: 'Pitch', next: L('Prochaines actions', 'Next actions'), heures: L('Heures', 'Hours'), st: L('Sous-traitants', 'Subcontractors') })[k]),
        ta, h('button', { class: 'btn small', onclick: async () => { try { await saveSugg(k, ta.value.split('\n')); toast(L('Enregistré ✓', 'Saved ✓')); } catch (e) { toast(e.message, 'err'); } } }, L('Enregistrer', 'Save')));
    })));

  /* ----- Jeton GitHub ----- */
  const tokenIn = h('input', { id: 'new-token', autocomplete: 'off', spellcheck: 'false', placeholder: 'github_pat_…' });
  const tokenBox = h('div', { class: 'card' }, h('h3', {}, '🔁 ' + L('Jeton GitHub', 'GitHub token')),
    h('p', { class: 'muted small' }, L('À changer quand le jeton expire, ou quand une personne qui avait un compte quitte l\'équipe (supprimez d\'abord son compte, révoquez l\'ancien jeton sur GitHub, puis collez le nouveau ici).',
      'Change it when it expires, or when someone with an account leaves (delete their account, revoke the old token on GitHub, then paste the new one here).')),
    h('div', { class: 'toolbar' }, tokenIn, h('button', { class: 'btn', onclick: async () => {
      if (!tokenIn.value.trim()) return;
      try { await replaceToken(tokenIn.value); tokenIn.value = ''; toast(L('Jeton mis à jour pour tous les comptes ✓', 'Token updated for all accounts ✓')); } catch (e) { toast(e.message, 'err'); }
    } }, L('Remplacer le jeton', 'Replace token'))));

  v.append(h('header', { class: 'page-head' }, h('h1', {}, '👥 ' + L('Équipe & accès', 'Team & access'))), usersBox, importerCard(), teamBox, suggBox, tokenBox);
  drawUsers(); drawTeam();
  v.refresh = () => {};
  return v;
}
