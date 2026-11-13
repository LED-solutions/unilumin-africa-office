/* 👥 Administration : comptes, organigramme de l'équipe, listes de suggestions */
import { h, api, toast, modal } from '../ui.js';
import * as S from '../schema.js';
import { store, load } from '../store.js';
import { L } from '../i18n.js';

export function adminView() {
  const v = h('section', { class: 'page' });
  const usersBox = h('div', { class: 'card' });
  const drawUsers = async () => {
    const users = await api('GET', '/api/users');
    usersBox.replaceChildren(h('h3', {}, '🔐 ' + L('Comptes de connexion', 'Sign-in accounts')),
      h('table', { class: 'grid' }, h('thead', {}, h('tr', {}, [L('Nom', 'Name'), 'E-mail', L('Rôle', 'Role'), L('Actif', 'Active'), ''].map(x => h('th', {}, x)))),
        h('tbody', {}, users.map(u => h('tr', { class: u.active ? '' : 'closed' }, h('td', {}, u.name), h('td', {}, u.email),
          h('td', {}, h('select', { onchange: e => upd(u, { role: e.target.value }) }, ['member', 'admin'].map(r => h('option', { value: r, selected: u.role === r }, r === 'admin' ? 'Admin' : L('Membre', 'Member'))))),
          h('td', {}, h('input', { type: 'checkbox', checked: !!u.active, onchange: e => upd(u, { active: e.target.checked }) })),
          h('td', {}, h('button', { class: 'btn small', onclick: () => {
            const pw = (prompt(L('Nouveau mot de passe provisoire pour ', 'New temporary password for ') + u.name + ' (8+) :') || '').trim();
            if (pw) upd(u, { password: pw }, L('Mot de passe changé. La personne devra le changer à la connexion.', 'Password changed. They will have to change it at sign-in.'));
          } }, '🔑 ' + L('Réinitialiser', 'Reset'))))))),
      h('button', { class: 'btn primary', onclick: newUser }, '➕ ' + L('Nouveau compte', 'New account')));
  };
  const upd = async (u, body, msg) => { try { await api('PATCH', '/api/users/' + u.id, body); toast(msg || L('Enregistré ✓', 'Saved ✓')); } catch (e) { toast(e.message, 'err'); } drawUsers(); };
  const newUser = () => {
    const f = { name: h('input'), email: h('input', { type: 'email' }), password: h('input', { value: genPw() }),
                role: h('select', {}, h('option', { value: 'member' }, L('Membre', 'Member')), h('option', { value: 'admin' }, 'Admin')) };
    modal('➕ ' + L('Nouveau compte', 'New account'), h('div', { class: 'form-grid' },
      h('label', { class: 'f' }, h('span', {}, L('Nom (comme dans l\'équipe)', 'Name (as in the team)')), f.name),
      h('label', { class: 'f' }, h('span', {}, 'E-mail'), f.email),
      h('label', { class: 'f' }, h('span', {}, L('Mot de passe provisoire', 'Temporary password')), f.password),
      h('label', { class: 'f' }, h('span', {}, L('Rôle', 'Role')), f.role),
      h('p', { class: 'muted small wide' }, L('Donnez ce mot de passe à la personne : elle devra en choisir un nouveau à sa première connexion.', 'Give this password to the person: they must choose a new one at first sign-in.'))),
      [{ label: L('Annuler', 'Cancel') }, { label: L('Créer', 'Create'), kind: 'primary', run: async () => {
        try { await api('POST', '/api/users', Object.fromEntries(Object.entries(f).map(([k, e]) => [k, e.value]))); toast(L('Compte créé ✓', 'Account created ✓')); drawUsers(); await load(); drawTeam(); }
        catch (e) { toast(e.message, 'err'); return false; }
      } }]);
  };

  /* Organigramme : nom, icône, rôle */
  const teamBox = h('div', { class: 'card' });
  let team = [];
  const drawTeam = () => {
    team = store.team.map(m => ({ ...m }));
    const rows = h('tbody');
    const paint = () => rows.replaceChildren(...team.map((m, i) => h('tr', {},
      h('td', {}, h('input', { class: 'cell-in icon', value: m.icon, onchange: e => { m.icon = e.target.value; } })),
      h('td', {}, h('input', { class: 'cell-in', value: m.name, onchange: e => { m.name = e.target.value; } })),
      h('td', {}, h('input', { class: 'cell-in wide-in', value: m.role, onchange: e => { m.role = e.target.value; } })),
      h('td', { class: 'nowrap' }, h('button', { class: 'icon-btn', onclick: () => { if (i) { [team[i - 1], team[i]] = [team[i], team[i - 1]]; paint(); } } }, '▲'),
        h('button', { class: 'icon-btn', onclick: () => { team.splice(i, 1); paint(); } }, '✕')))));
    paint();
    teamBox.replaceChildren(h('h3', {}, '👥 ' + L('Équipe (listes « Responsable », « Avec », organigramme)', 'Team (owner lists, org chart)')),
      h('table', { class: 'grid' }, h('thead', {}, h('tr', {}, [L('Icône', 'Icon'), L('Nom', 'Name'), L('Rôle', 'Role'), ''].map(x => h('th', {}, x)))), rows),
      h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => { team.push({ name: '', icon: '👤', role: '' }); paint(); } }, '➕ ' + L('Personne', 'Person')),
        h('button', { class: 'btn primary', onclick: async () => {
          try { store.team = await api('PUT', '/api/team', team.filter(m => m.name.trim())); toast(L('Équipe enregistrée ✓', 'Team saved ✓')); drawTeam(); }
          catch (e) { toast(e.message, 'err'); }
        } }, L('Enregistrer l\'équipe', 'Save team'))));
  };

  /* Listes de suggestions */
  const suggBox = h('div', { class: 'card' }, h('h3', {}, '📋 ' + L('Listes de suggestions', 'Suggestion lists')),
    h('p', { class: 'muted small' }, L('Une valeur par ligne. Les nouveaux lieux / pays tapés dans un dossier s\'ajoutent tout seuls.', 'One value per line. New places / countries typed in a file are added automatically.')),
    h('div', { class: 'sugg-grid' }, Object.keys(S.DEFAULT_SUGG).map(k => {
      const ta = h('textarea', { rows: 8 }); ta.value = (store.sugg[k] || []).join('\n');
      return h('div', {}, h('b', {}, ({ lieux: L('Lieux', 'Places'), pays: L('Pays', 'Countries'), pitch: 'Pitch', next: L('Prochaines actions', 'Next actions'), heures: L('Heures', 'Hours'), st: L('Sous-traitants', 'Subcontractors') })[k]),
        ta, h('button', { class: 'btn small', onclick: async () => {
          try { store.sugg = await api('PUT', '/api/sugg/' + k, ta.value.split('\n')); toast(L('Enregistré ✓', 'Saved ✓')); } catch (e) { toast(e.message, 'err'); }
        } }, L('Enregistrer', 'Save')));
    })));

  v.append(h('header', { class: 'page-head' }, h('h1', {}, '👥 ' + L('Équipe & comptes', 'Team & accounts'))), usersBox, teamBox, suggBox);
  drawUsers().catch(e => toast(e.message, 'err'));
  drawTeam();
  return v;
}
function genPw() {
  const a = 'abcdefghjkmnpqrstuvwxyz23456789', b = new Uint32Array(10); crypto.getRandomValues(b);
  return Array.from(b, x => a[x % a.length]).join('');
}
