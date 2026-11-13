/* 📥 Import du Google Sheet (.xlsx) — réservé à l'administrateur.
   Google Sheet → Fichier → Télécharger → Microsoft Excel (.xlsx), puis choisir le fichier ici. */
import { h, toast, confirmBox } from '../ui.js';
import * as S from '../schema.js';
import { store, all, importRows } from '../store.js';
import { L } from '../i18n.js';

const SHEETJS = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
const SHEETS = { projets: 'proj', events: 'ev', appelsdoffres: 'ao', export: 'ex', sav: 'sav', contactssiege: 'hq' };
const letters = s => S.norm(s).replace(/[^a-z]/g, '');
const keyOf = s => S.norm(s).replace(/[^a-z0-9]/g, '');
const cleanHeader = s => keyOf(String(s ?? '').replace(/[▼📅⚙]/gu, ''));
const ICON_RE = /^[^\p{L}\d]+/u;

function loadLib() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SHEETJS; s.onload = () => resolve(window.XLSX); s.onerror = () => reject(new Error('Lecteur Excel indisponible'));
    document.head.append(s);
  });
}
/* Date affichée dans le sheet (une heure cachée à 23:00 garde le jour affiché) */
function toDateStr(v) {
  if (typeof v === 'number' && v > 30000 && v < 80000) return new Date(Math.floor(v - 25569) * 86400000).toISOString().slice(0, 10);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const m = String(v ?? '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : '';
}

/* Grille de valeurs ; une formule sans résultat enregistré garde le texte français de IF(LANG="EN","…","…") */
function toGrid(XLSX, ws) {
  if (!ws || !ws['!ref']) return [];
  const r = XLSX.utils.decode_range(ws['!ref']), grid = [];
  for (let R = r.s.r; R <= r.e.r; R++) {
    const row = [];
    for (let C = r.s.c; C <= r.e.c; C++) {
      const c = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      let v = c ? c.v : '';
      if (c && (c.t === 'z' || v === undefined || v === '') && c.f && /LANG/.test(c.f)) {
        const q = [...c.f.matchAll(/"((?:[^"]|"")*)"/g)].map(m => m[1].replace(/""/g, '"'));
        v = q.length >= 3 ? q[q.length - 1] : '';
      }
      if (c && (c.t === 'e' || (c.t === 'z' && !/LANG/.test(c.f || '')))) v = '';
      row.push(v ?? '');
    }
    grid.push(row);
  }
  return grid;
}

export function parseWorkbook(XLSX, buf) {
  const wb = XLSX.read(buf, { type: 'array', cellFormula: true, sheetStubs: true });
  const team = new Map();
  const person = v => {
    const s = String(v ?? '').trim(); if (!s) return '';
    const icon = (s.match(ICON_RE) || [''])[0].trim(), name = s.replace(ICON_RE, '').trim();
    if (name && (!team.has(name) || (!team.get(name) && icon))) team.set(name, icon);
    return name;
  };
  const people = v => String(v ?? '').split(/\s*[,;·]\s*/).map(person).filter(Boolean).join(', ');
  const rows = [], stock = [], report = [];
  for (const name of wb.SheetNames) {
    const key = letters(name), kind = SHEETS[key];
    if (!kind && key !== 'stock' && key !== 'listes') continue;
    const grid = toGrid(XLSX, wb.Sheets[name]);
    if (key === 'listes') { grid.slice(4).forEach(r => person(r[0])); continue; }
    let hr = -1, best = 0;
    for (let r = 0; r < Math.min(8, grid.length); r++) {
      const seen = new Set(); let ok = false;
      for (const c of grid[r]) { const t = cleanHeader(c); if (t) seen.add(t); if (/^(n|no|client|article|organisme|item)/.test(t)) ok = true; }
      if (ok && seen.size > best) { best = seen.size; hr = r; }
    }
    if (hr < 0) { report.push('⚠️ ' + name + ' : en-têtes introuvables'); continue; }
    const headers = grid[hr].map(cleanHeader);
    if (key === 'stock') {
      const map = { article: 'art', item: 'art', categorie: 'cat', category: 'cat', details: 'info', unite: 'unit', unit: 'unit', total: 'tot',
                    disponiblejusquau: 'lim', availableuntil: 'lim', remarques: 'rem', notes: 'rem', largcabinetmm: 'w', hautcabinetmm: 'h' };
      for (const r of grid.slice(hr + 1)) {
        const it = {};
        headers.forEach((hd, i) => { const k = map[hd]; if (k && !(k in it)) it[k] = r[i]; });
        if (!String(it.art ?? '').trim()) continue;
        it.lim = toDateStr(it.lim);
        stock.push(it);
      }
      report.push('📦 Stock : ' + stock.length + ' article(s)');
      continue;
    }
    const byHeader = {};
    for (const f of S.FIELDS[kind]) { byHeader[keyOf(f.fr)] = f; byHeader[keyOf(f.en)] = f; }
    byHeader.livraisoninstallation = S.field(kind, 'liv'); byHeader.deliveryinstall = S.field(kind, 'liv');
    const cols = headers.map(hd => byHeader[hd] || null);
    let n = 0;
    for (const r of grid.slice(hr + 1)) {
      const d = {};
      cols.forEach((f, i) => {
        if (!f || ['surf', 'stock', 'jr'].includes(f.k)) return;
        let v = r[i];
        if (f.t === 'date') v = toDateStr(v);
        else if (f.k === 'resp' || f.k === 'majp') v = person(v);
        else if (f.t === 'multi' && f.list === 'team') v = people(v);
        else v = String(v ?? '').trim();
        if (v !== '' && v !== undefined) d[f.k] = v;
      });
      if (!d.name) continue;
      rows.push({ kind, data: d }); n++;
    }
    report.push(S.KINDS[kind].icon + ' ' + name.replace(ICON_RE, '').trim() + ' : ' + n + ' dossier(s) · ' + cols.filter(Boolean).length + ' colonnes reconnues');
  }
  return { rows, stock, team: [...team].map(([name, icon]) => ({ name, icon, role: '' })), report };
}

export function importerCard() {
  const out = h('div', { class: 'import-out' });
  const input = h('input', { type: 'file', id: 'import-file', accept: '.xlsx', onchange: async e => {
    const file = e.target.files[0]; if (!file) return;
    out.replaceChildren(h('p', { class: 'muted' }, L('Lecture du fichier…', 'Reading file…')));
    try {
      const XLSX = await loadLib();
      const res = parseWorkbook(XLSX, new Uint8Array(await file.arrayBuffer()));
      const existing = all().length;
      out.replaceChildren(...[
        h('ul', {}, res.report.map(r => h('li', {}, r))),
        h('p', {}, L('Équipe : ', 'Team: ') + res.team.length + L(' personne(s)', ' people')),
        existing ? h('p', { class: 'warn' }, L('Le site contient déjà ', 'The site already holds ') + existing + L(' dossier(s). L\'import les remplace.', ' file(s). Import replaces them.')) : null,
        h('button', { class: 'btn primary', onclick: async ev => {
          if (existing && !await confirmBox(L('Remplacer les données', 'Replace data'), L('Les ' + existing + ' dossiers actuels seront remplacés par ceux du fichier.', 'The ' + existing + ' current files will be replaced by the file\'s.'), L('Remplacer', 'Replace'), true)) return;
          ev.target.disabled = true;
          try {
            await importRows(res, (done, total) => { ev.target.textContent = L('Import… ', 'Importing… ') + done + ' / ' + total; });
            toast(L('Import terminé ✓', 'Import done ✓'));
            out.replaceChildren(h('p', { class: 'ok' }, '✅ ' + res.rows.length + L(' dossiers importés.', ' files imported.')));
          } catch (err) { toast(err.message || String(err), 'err'); ev.target.disabled = false; }
        } }, L('Importer ', 'Import ') + res.rows.length + L(' dossiers', ' files'))].filter(Boolean));
    } catch (err) { out.replaceChildren(h('p', { class: 'err' }, err.message || String(err))); }
  } });
  return h('div', { class: 'card' }, h('h3', {}, '📥 ' + L('Importer le Google Sheet', 'Import the Google Sheet')),
    h('ol', { class: 'steps' },
      h('li', {}, L('Dans le Google Sheet : Fichier → Télécharger → Microsoft Excel (.xlsx).', 'In the Google Sheet: File → Download → Microsoft Excel (.xlsx).')),
      h('li', {}, L('Choisissez le fichier ci-dessous, vérifiez les chiffres, puis « Importer ».', 'Choose the file below, check the counts, then "Import".'))),
    h('label', { class: 'f' }, h('span', {}, L('Fichier .xlsx', '.xlsx file')), input), out);
}
