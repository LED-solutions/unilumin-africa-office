/* Logique commune Agenda / Accueil « Cette semaine » */
import * as S from '../schema.js';
import { t } from '../i18n.js';

export function agendaItems(dossiers, { from, owner, filters } = {}) {
  const today = S.todayStr();
  const start = from || today;
  const items = S.planningItems(dossiers).filter(it => {
    if (filters && filters[it.filter] === false) return false;
    if (owner && it.resp !== owner && !String(it.team).includes(owner)) return false;
    if (it.fam === 'Terminé') return it.date === today || it.majd === today;   // ✅ terminé aujourd'hui : reste visible, en haut
    return it.date >= start;
  });
  items.forEach(it => { it.doneToday = it.fam === 'Terminé'; });
  return items.sort((a, b) => (b.doneToday - a.doneToday) || a.date.localeCompare(b.date) || ((a.min ?? 9999) - (b.min ?? 9999)) || a.name.localeCompare(b.name));
}
export function when(it, now = new Date()) {
  if (it.doneToday) return t('done');
  const today = S.todayStr(now);
  if (it.min !== null && it.min !== undefined) {
    const [y, m, d] = it.date.split('-').map(Number);
    const target = new Date(y, m - 1, d, Math.floor(it.min / 60), it.min % 60);
    const hrs = (target - now) / 3600000;
    if (hrs > 0 && hrs < 48) return hrs < 1 ? t('inMin', { n: Math.round(hrs * 60) }) : t('inHours', { n: Math.floor(hrs) });
    if (hrs <= 0 && hrs > -12 && it.date === today) return t('now');
  }
  const n = S.daysBetween(today, it.date);
  if (n === 0) return t('today');
  if (n === 1) return t('tomorrow');
  if (n < 0) return t('daysAgo', { n: -n });
  return t('inDays', { n });
}
export const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
export const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export function dayName(s, lang) { const [y, m, d] = s.split('-').map(Number); return (lang === 'en' ? DAYS_EN : DAYS_FR)[new Date(y, m - 1, d).getDay()]; }

/* Filtres gardés sur ce navigateur */
export function loadFilters() {
  try { return JSON.parse(localStorage.getItem('uao_filters') || '{}'); } catch { return {}; }
}
export function saveFilters(f) { try { localStorage.setItem('uao_filters', JSON.stringify(f)); } catch { /* navigation privée */ } }
