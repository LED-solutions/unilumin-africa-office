/* 🏠 Accueil : vue d'ensemble, système d'alerte, à surveiller, cette semaine, équipe */
import { h } from '../ui.js';
import * as S from '../schema.js';
import { store, all, list, teamIcon, stockNow, canView } from '../store.js';
import { myName } from '../store.js';
import { L, getLang } from '../i18n.js';
import { agendaItems, when } from './agendalogic.js';
import { eventStatus, reservations, capacity, used } from '../stockcalc.js';
import { statePill } from './fields.js';

export function homeView() {
  const v = h('section', { class: 'page home' });
  const draw = () => {
    const today = S.todayStr(), everything = all(), live = everything.filter(x => !x.deleted_at);
    const res = reservations(everything);
    const lang = getLang();

    /* Vue d'ensemble */
    const overview = h('div', { class: 'kpis' }, ['proj', 'ev', 'ao', 'ex', 'sav'].filter(canView).map(k => {
      const K = S.KINDS[k], rows = list(k);
      const fam = f => rows.filter(x => S.family(k, x.data.etat) === f).length;
      const open = rows.filter(x => !S.isClosed(S.family(k, x.data.etat))).length;
      return h('a', { class: 'kpi', href: '#' + k, style: { '--accent': K.color } },
        h('div', { class: 'kpi-title' }, K.icon + ' ' + (lang === 'en' ? K.en : K.fr)),
        h('div', { class: 'kpi-num' }, open), h('div', { class: 'kpi-sub' }, L('dossiers actifs', 'active files')),
        h('div', { class: 'kpi-fams' }, ['À faire', 'En préparation', 'En attente', 'En cours'].map(f =>
          h('span', { style: { background: S.FAMILIES[f].bg, color: S.FAMILIES[f].fg }, title: S.FAMILIES[f][lang] }, fam(f)))));
    }));

    /* 🚨 Alertes */
    const devisLate = [];
    for (const k of ['proj', 'ex']) for (const x of list(k)) {
      const d = x.data, fam = S.family(k, d.etat);
      if (d.devis === 'Oui' || d.ddevis || d.liv || S.isClosed(fam) || fam === 'En attente') continue;
      const ref = d.first || d.majd; if (!ref) continue;
      const days = S.daysBetween(ref, today);
      if (days >= 7) devisLate.push({ x, k, days });
    }
    devisLate.sort((a, b) => b.days - a.days);
    const aoSoon = list('ao').filter(x => x.data.depot && !S.isClosed(S.family('ao', x.data.etat)))
      .map(x => ({ x, jr: S.daysBetween(today, x.data.depot) })).filter(o => o.jr >= 0 && o.jr <= 14).sort((a, b) => a.jr - b.jr);
    const hqNew = list('hq').filter(x => x.data.etat === 'Nouveau');
    const alertList = (title, color, rows, empty, cols) => h('div', { class: 'alert-box', style: { '--accent': color } },
      h('h3', {}, title, h('span', { class: 'count' }, rows.length)),
      rows.length ? h('table', { class: 'mini' }, h('tbody', {}, rows.slice(0, 10).map(cols))) : h('p', { class: 'ok' }, empty),
      rows.length > 10 ? h('p', { class: 'muted small' }, '+ ' + (rows.length - 10) + ' ' + L('autres', 'more')) : null);
    const alerts = h('div', { class: 'alerts' },
      alertList('📝 ' + L('Devis pas encore envoyés depuis plus de 7 jours', 'Quotes not sent for 7+ days'), '#EA580C', devisLate,
        '✅ ' + L('Aucun devis en retard', 'No late quotes'), o => h('tr', {}, h('td', {}, h('a', { href: '#d-' + o.x.id }, o.x.data.name)),
          h('td', {}, S.KINDS[o.k].icon), h('td', {}, o.x.data.resp ? teamIcon(o.x.data.resp) + o.x.data.resp : ''), h('td', { class: 'num bad' }, o.days + ' j'))),
      alertList('📄 ' + L('Appels d\'offres : dépôt dans moins de 2 semaines', 'Tenders due within 2 weeks'), '#B91C1C', aoSoon,
        '✅ ' + L('Aucun dépôt proche', 'No deadline soon'), o => h('tr', {}, h('td', {}, h('a', { href: '#d-' + o.x.id }, o.x.data.name)),
          h('td', {}, o.x.data.resp || ''), h('td', {}, S.fmtDate(o.x.data.depot)), h('td', { class: 'num ' + (o.jr <= 7 ? 'bad' : 'warn') }, o.jr + ' j'))),
      alertList('📞 ' + L('Contacts siège à traiter', 'HQ contacts to handle'), '#9A3412', hqNew,
        '✅ ' + L('Aucun nouveau contact', 'No new contact'), x => h('tr', {}, h('td', {}, h('a', { href: '#d-' + x.id }, x.data.name)),
          h('td', {}, x.data.pays || ''), h('td', {}, S.fmtDate(x.data.recu)))));

    /* À surveiller */
    const in7 = S.addDays(today, 7), in14 = S.addDays(today, 14);
    const evs = list('ev');
    const watch = [
      ['⚠️', L('Events avec manque de stock', 'Events short of stock'), evs.filter(x => eventStatus(x, stockNow(), res).level === 'bad').length, '#ev'],
      ['🚚', L('Montages dans les 7 prochains jours', 'Set-ups in the next 7 days'), evs.filter(x => { const c = S.computed('ev', x.data); return c.fam !== 'Perdu' && c.mont >= today && c.mont <= in7; }).length, '#agenda'],
      ['📄', L('Dépôts d\'AO dans les 7 prochains jours', 'Tender deadlines in 7 days'), aoSoon.filter(o => o.jr <= 7).length, '#ao'],
      ['📺', L('Installations projets dans les 14 jours', 'Project installs in 14 days'), list('proj').filter(x => x.data.liv >= today && x.data.liv <= in14 && !S.isClosed(S.family('proj', x.data.etat))).length, '#proj'],
      ['🔧', L('SAV en retard', 'Overdue after-sales'), list('sav').filter(x => x.data.ech && x.data.ech < today && !S.isClosed(S.family('sav', x.data.etat))).length, '#sav'],
      ['🔧', L('SAV priorité haute ouverts', 'Open high-priority after-sales'), list('sav').filter(x => [S.VERY_HIGH, 'Haute'].includes(x.data.prio) && !S.isClosed(S.family('sav', x.data.etat))).length, '#sav'],
      ['📦', L('Articles en rupture aujourd\'hui', 'Items out of stock today'), stockNow().filter(s => capacity(s, today) > 0 && capacity(s, today) - used(res, s.art, today) <= 0).length, '#stock']
    ];
    const watchBox = h('div', { class: 'card' }, h('h3', {}, '👀 ' + L('À surveiller', 'Watch list')),
      h('ul', { class: 'watch' }, watch.map(([i, txt, n, href]) => h('li', { class: n ? 'hot' : '' }, h('a', { href }, h('span', {}, i + ' ' + txt), h('b', {}, n))))));

    /* Cette semaine */
    const week = agendaItems(everything, {}).filter(it => it.doneToday || it.date <= in7);
    const weekBox = h('div', { class: 'card' }, h('h3', {}, '📌 ' + L('Cette semaine', 'This week')),
      week.length ? h('ul', { class: 'week' }, week.slice(0, 14).map(it => h('li', { class: it.doneToday ? 'done-today' : '' },
        h('span', { class: 'when' }, when(it)), h('span', {}, it.icon + ' ', h('a', { href: '#d-' + it.id }, it.name),
          h('span', { class: 'muted' }, ' · ' + (lang === 'en' ? it.quoiEn : it.quoi) + (it.hour ? ' ' + it.hour : '') + (it.lieu ? ' · ' + it.lieu : ''))))))
        : h('p', { class: 'muted' }, L('Rien de prévu cette semaine.', 'Nothing this week.')),
      h('a', { href: '#agenda', class: 'more' }, L('Tout l\'agenda →', 'Full agenda →')));

    /* Équipe */
    const teamBox = h('div', { class: 'card' }, h('h3', {}, '👥 ' + L('Équipe', 'Team')),
      h('div', { class: 'team' }, store.team.map(m => h('div', { class: 'member' }, h('span', { class: 'm-icon' }, m.icon || '👤'),
        h('div', {}, h('b', {}, m.name), h('div', { class: 'muted small' }, m.role || ''))))));

    /* Code couleur */
    const colors = h('div', { class: 'card' }, h('h3', {}, '🎨 ' + L('Code couleur des états', 'Status colours')),
      h('div', { class: 'fam-legend' }, Object.entries(S.FAMILIES).map(([k, f]) => h('span', { style: { background: f.bg, color: f.fg } }, f[lang]))));

    const empty = !everything.length ? h('div', { class: 'card' }, h('h3', {}, '👋 ' + L('Le site est prêt', 'The site is ready')),
      h('p', {}, L('Aucun dossier pour l\'instant. Créez-en un avec « ➕ Nouveau dossier », ou importez le Google Sheet depuis la page « Équipe & accès ».', 'No files yet. Create one with "➕ New file", or import the Google Sheet from the "Team & access" page.')),
      h('a', { class: 'btn primary', href: '#equipe' }, '📥 ' + L('Importer le Google Sheet', 'Import the Google Sheet'))) : null;
    v.replaceChildren(...[
      empty,
      h('header', { class: 'home-head' }, h('img', { src: '/img/logo.png', alt: '' }),
        h('div', {}, h('h1', {}, L('Suivi des dossiers', 'File tracking')),
          h('p', { class: 'muted' }, L('Bonjour ', 'Hello ') + myName() + ' · ' + new Date().toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })))),
      overview,
      h('h2', { class: 'sec' }, '🚨 ' + L('Système d\'alerte', 'Alerts')), alerts,
      h('div', { class: 'cols' }, watchBox, weekBox),
      h('div', { class: 'cols' }, teamBox, colors)].filter(Boolean));
  };
  draw();
  v.refresh = draw;
  return v;
}
