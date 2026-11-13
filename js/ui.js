/* Petits outils d'interface (sans bibliothèque) */
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;            // utilisé seulement avec du texte déjà échappé
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}
export const $ = (sel, root = document) => root.querySelector(sel);
export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

let toastBox;
export function toast(msg, kind = 'ok', ms = 3500) {
  if (!toastBox) { toastBox = h('div', { class: 'toasts' }); document.body.append(toastBox); }
  const t = h('div', { class: 'toast ' + kind }, msg);
  toastBox.append(t);
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 400);
}

export function modal(title, body, actions = []) {
  const close = () => wrap.remove();
  const wrap = h('div', { class: 'modal-wrap', onclick: e => { if (e.target === wrap) close(); } },
    h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' },
      h('div', { class: 'modal-head' }, h('h2', {}, title), h('button', { class: 'icon-btn', 'aria-label': 'Fermer', onclick: close }, '✕')),
      h('div', { class: 'modal-body' }, body),
      actions.length ? h('div', { class: 'modal-foot' }, actions.map(a =>
        h('button', { class: 'btn ' + (a.kind || ''), onclick: async () => { if ((await a.run?.()) !== false) close(); } }, a.label))) : null));
  document.body.append(wrap);
  const first = wrap.querySelector('input, select, textarea, button.btn');
  if (first) setTimeout(() => first.focus(), 30);
  const onKey = e => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);
  return { close, el: wrap };
}
export function confirmBox(title, text, okLabel, danger) {
  return new Promise(resolve => {
    const m = modal(title, h('p', {}, text), [
      { label: 'Annuler', run: () => resolve(false) },
      { label: okLabel, kind: danger ? 'danger' : 'primary', run: () => resolve(true) }
    ]);
    m.el.addEventListener('click', e => { if (e.target === m.el) resolve(false); });
  });
}
export function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

/* Remplace prompt() (bloqué ici) : petite fenêtre avec un champ texte */
export function askText(title, labelText, value = '') {
  return new Promise(resolve => {
    const input = h('input', { type: 'text', value, id: 'ask-input' });
    let done = false;
    const m = modal(title, h('label', { class: 'f wide' }, h('span', {}, labelText), input), [
      { label: 'Annuler', run: () => { done = true; resolve(''); } },
      { label: 'OK', kind: 'primary', run: () => { done = true; resolve(input.value.trim()); } }
    ]);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { done = true; resolve(input.value.trim()); m.close(); } });
    new MutationObserver((_, obs) => { if (!document.body.contains(m.el)) { obs.disconnect(); if (!done) resolve(''); } }).observe(document.body, { childList: true });
  });
}
