/* Importe le Google Sheet dans le site (à faire UNE fois, sur le PC du bureau) :
   1. Google Sheet → Fichier → Télécharger → Microsoft Excel (.xlsx)
   2. npm run import -- "chemin/vers/le-fichier.xlsx"
   Ajoute : tous les dossiers (Projets, Events, AO, Export, SAV, Contacts siège), le stock et l'équipe.
   Ne touche pas aux comptes. Refuse de s'exécuter si des dossiers existent déjà (sauf avec --remplacer). */
import ExcelJS from 'exceljs';
import { db, tx, nowIso, backup } from '../server/db.js';
import * as S from '../public/js/schema.js';

const file = process.argv[2];
const replace = process.argv.includes('--remplacer');
if (!file) { console.error('Usage : npm run import -- "fichier.xlsx" [--remplacer]'); process.exit(1); }

const letters = s => S.norm(s).replace(/[^a-z]/g, '');
const SHEETS = { projets: 'proj', events: 'ev', appelsdoffres: 'ao', export: 'ex', sav: 'sav', contactssiege: 'hq' };
const ICON_RE = /^[^\p{L}\d]+/u;

function cellValue(c) {
  let v = c.value;
  if (v && typeof v === 'object') {
    if (v.richText) v = v.richText.map(r => r.text).join('');
    else if ('result' in v && v.result !== undefined) v = v.result;
    else if (v.formula) {   // formule sans résultat enregistré : on garde le texte français de IF(LANG="EN","…","…")
      const q = [...String(v.formula).matchAll(/"((?:[^"]|"")*)"/g)].map(m => m[1].replace(/""/g, '"'));
      v = q.length >= 3 && /LANG/.test(v.formula) ? q[q.length - 1] : '';
    }
    else if (v.text) v = v.text;
    else if (v.hyperlink && v.text) v = v.text;
  }
  if (v && typeof v === 'object' && v.error) return '';
  return v ?? '';
}
/* Date affichée dans le sheet (une heure cachée à 23:00 garde le jour affiché) */
function toDateStr(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number' && v > 30000 && v < 80000) return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10);
  const m = String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : '';
}
const keyOf = s => S.norm(s).replace(/[^a-z0-9]/g, '');
const cleanHeader = s => keyOf(String(s).replace(/[▼📅⚙]/gu, ''));

const team = new Map();   // nom → icône
function person(v) {
  const s = String(v || '').trim(); if (!s) return '';
  const icon = (s.match(ICON_RE) || [''])[0].trim();
  const name = s.replace(ICON_RE, '').trim();
  if (name && !team.has(name)) team.set(name, icon);
  else if (name && icon && !team.get(name)) team.set(name, icon);
  return name;
}
const people = v => String(v || '').split(/\s*[,;·]\s*/).map(person).filter(Boolean).join(', ');

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(file);
const rows = [];
let stock = [];
for (const ws of wb.worksheets) {
  const key = letters(ws.name);
  const kind = SHEETS[key];
  if (!kind && key !== 'stock' && key !== 'listes') continue;
  // ligne d'en-tête : celle qui contient « Client » ou « Article »
  let hr = 0;
  // la ligne d'en-tête est celle qui a le plus de cellules remplies parmi les 8 premières, avec « Client » / « Article »
  let best = 0;
  for (let r = 1; r <= 8; r++) {
    const seen = new Set(); let ok = false;      // valeurs différentes (une cellule fusionnée ne compte qu'une fois)
    ws.getRow(r).eachCell(c => { const t = cleanHeader(cellValue(c)); if (t) seen.add(t); if (/^(n|no|client|article|organisme|item)/.test(t)) ok = true; });
    if (ok && seen.size > best) { best = seen.size; hr = r; }
  }
  if (key === 'listes') {
    const col = []; ws.getColumn(1).eachCell((c, r) => { if (r > 4) col.push(cellValue(c)); });
    col.forEach(person);
    continue;
  }
  if (!hr) { console.warn('⚠️ En-têtes introuvables dans « ' + ws.name + ' »'); continue; }
  const headers = {};
  ws.getRow(hr).eachCell((c, col) => { headers[col] = cleanHeader(cellValue(c)); });
  if (key === 'stock') {
    const map = { article: 'art', larg: 'w', haut: 'h', item: 'art', categorie: 'cat', category: 'cat', details: 'info', unite: 'unit', unit: 'unit', total: 'tot',
                  disponiblejusquau: 'lim', availableuntil: 'lim', remarques: 'rem', notes: 'rem', largcabinetmm: 'w', hautcabinetmm: 'h' };
    for (let r = hr + 1; r <= ws.rowCount; r++) {
      const it = {};
      for (const [col, hd] of Object.entries(headers)) { const k = map[hd]; if (k) it[k] = cellValue(ws.getRow(r).getCell(+col)); }
      if (!String(it.art || '').trim()) continue;
      it.lim = toDateStr(it.lim);
      stock.push(it);
    }
    continue;
  }
  const fields = S.FIELDS[kind];
  const byHeader = {};
  for (const f of fields) { byHeader[keyOf(f.fr)] = f; byHeader[keyOf(f.en)] = f; }
  // en-têtes renommés au fil des versions
  Object.assign(byHeader, { livraisoninstallation: S.field(kind, 'liv'), deliveryinstall: S.field(kind, 'liv') });
  const colMap = {};
  for (const [col, hd] of Object.entries(headers)) { const f = byHeader[hd]; if (f) colMap[col] = f; }
  let n = 0;
  for (let r = hr + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r), d = {};
    for (const [col, f] of Object.entries(colMap)) {
      let v = cellValue(row.getCell(+col));
      if (f.k === 'surf' || f.k === 'stock' || f.k === 'jr') continue;
      if (f.t === 'date') v = toDateStr(v);
      else if (f.k === 'resp' || f.k === 'majp') v = person(v);
      else if (f.t === 'multi' && f.list === 'team') v = people(v);
      else v = String(v).trim();
      if (v !== '') d[f.k] = v;
    }
    if (!d.name) continue;
    if (kind === 'hq' && d.transfert) d.transfert = String(d.transfert);
    rows.push({ kind, data: d });
    n++;
  }
  console.log('  ' + S.KINDS[kind].icon + ' ' + ws.name + ' : ' + n + ' dossier(s), colonnes reconnues : ' + Object.keys(colMap).length + '/' + Object.keys(headers).length);
}

const existing = db.prepare('SELECT COUNT(*) AS n FROM dossiers').get().n;
if (existing && !replace) { console.error('\n❌ La base contient déjà ' + existing + ' dossiers. Relancez avec --remplacer pour tout remplacer.'); process.exit(1); }
backup();
const t = nowIso();
tx(() => {
  if (replace) { db.prepare('DELETE FROM history').run(); db.prepare('DELETE FROM dossiers').run(); db.prepare('DELETE FROM stock').run(); }
  const counters = {};
  const ins = db.prepare('INSERT INTO dossiers(kind, n, data, created_at, created_by, updated_at, updated_by) VALUES(?,?,?,?,?,?,?)');
  const hist = db.prepare('INSERT INTO history(dossier_id, at, who, field, before, after) VALUES(?,?,?,?,?,?)');
  for (const r of rows) {
    counters[r.kind] = (counters[r.kind] || 0) + 1;
    const id = ins.run(r.kind, counters[r.kind], JSON.stringify(r.data), t, 'Import', t, r.data.majp || 'Import').lastInsertRowid;
    hist.run(id, t, 'Import', '📥', '', 'Importé depuis le Google Sheet');
  }
  if (stock.length && (replace || !db.prepare('SELECT 1 FROM stock').get())) {
    const s = db.prepare('INSERT INTO stock(art, cat, info, w, h, tot, sav, unit, lim, rem, sort, updated_at) VALUES(?,?,?,?,?,?,0,?,?,?,?,?)');
    stock.forEach((it, i) => s.run(String(it.art).trim(), String(it.cat || ''), String(it.info || ''), +it.w || null, +it.h || null, +it.tot || 0,
      String(it.unit || 'Cabinet'), it.lim || '', String(it.rem || ''), i, t));
  }
  const tm = db.prepare('INSERT INTO team(name, icon, role, sort) VALUES(?,?,?,?) ON CONFLICT(name) DO UPDATE SET icon = CASE WHEN team.icon = \'\' THEN excluded.icon ELSE team.icon END');
  let i = 100;
  for (const [name, icon] of team) tm.run(name, icon, '', i++);
  const sg = db.prepare('INSERT OR IGNORE INTO sugg(list, value) VALUES(?,?)');
  for (const r of rows) for (const f of S.FIELDS[r.kind]) if (f.sugg && !['heures', 'next'].includes(f.sugg) && r.data[f.k]) sg.run(f.sugg, r.data[f.k]);
});
console.log('\n✅ Import terminé : ' + rows.length + ' dossiers, ' + stock.length + ' articles de stock, ' + team.size + ' personnes dans l\'équipe.');
console.log('   Pensez à compléter les rôles de l\'équipe dans « Équipe & comptes ».');
