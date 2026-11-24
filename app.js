'use strict';

// ---------- Estado e armazenamento ----------
const KEY = 'minha-rotina-v1';
const PERIODS = { manha: '🌅 Manhã', tarde: '☀️ Tarde', noite: '🌙 Noite' };
const DAY_NAMES = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const uid = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_STATE = {
  items: [
    { id: uid(), title: 'Beber um copo de água ao acordar', period: 'manha', time: '07:00', days: ALL_DAYS },
    { id: uid(), title: 'Arrumar a cama', period: 'manha', time: '', days: ALL_DAYS },
    { id: uid(), title: 'Exercício', period: 'tarde', time: '18:00', days: [1, 2, 3, 4, 5] },
    { id: uid(), title: 'Ler 20 minutos', period: 'noite', time: '22:00', days: ALL_DAYS },
  ],
  done: {},   // { 'AAAA-MM-DD': [ids] }
  water: {},  // { 'AAAA-MM-DD': n }
  notes: {},  // { 'AAAA-MM-DD': texto }
  waterGoal: 8,
  startDate: null, // primeiro dia de uso; dias anteriores não contam nas estatísticas
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...structuredClone(DEFAULT_STATE), ...JSON.parse(raw) };
  } catch (e) { /* armazenamento indisponível */ }
  return structuredClone(DEFAULT_STATE);
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignora */ }
}

let state = load();

// ---------- Datas ----------
const pad = (n) => String(n).padStart(2, '0');
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return d; };
const todayKey = () => dateKey(new Date());
if (!state.startDate) state.startDate = todayKey();

function itemsFor(date) {
  const wd = date.getDay();
  return state.items
    .filter((i) => i.days.includes(wd))
    .sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
}

function dayRatio(date) {
  if (dateKey(date) < state.startDate) return null;
  const items = itemsFor(date);
  if (!items.length) return null;
  const done = state.done[dateKey(date)] || [];
  return items.filter((i) => done.includes(i.id)).length / items.length;
}

// ---------- Utilidades de DOM ----------
const $ = (s) => document.querySelector(s);
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (k === 'style') node.style.cssText = v;
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null) node.append(c);
  return node;
}

// ---------- Aba Hoje ----------
function renderHeader() {
  const now = new Date();
  const h = now.getHours();
  $('#greeting').textContent = h < 12 ? 'Bom dia ☀️' : h < 18 ? 'Boa tarde 🌤️' : 'Boa noite 🌙';
  const label = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#today-label').textContent = label.charAt(0).toUpperCase() + label.slice(1);
  const r = dayRatio(now);
  const pct = Math.round((r ?? 0) * 100);
  $('#ring-fg').style.strokeDashoffset = 100 - pct;
  $('#ring-text').textContent = `${pct}%`;
}

function toggleDone(id) {
  const k = todayKey();
  const list = state.done[k] || [];
  state.done[k] = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  save();
  renderToday();
}

function renderToday() {
  renderHeader();
  const wrap = $('#today-list');
  wrap.innerHTML = '';
  const items = itemsFor(new Date());
  const done = state.done[todayKey()] || [];
  if (!items.length) {
    wrap.append(el('div', { class: 'empty' }, 'Nada programado pra hoje. Adicione atividades na aba Rotina 🗓️'));
  }
  for (const [p, label] of Object.entries(PERIODS)) {
    const group = items.filter((i) => i.period === p);
    if (!group.length) continue;
    wrap.append(el('h3', {}, label));
    for (const it of group) {
      const isDone = done.includes(it.id);
      wrap.append(el('div', {
        class: 'task' + (isDone ? ' done' : ''), role: 'checkbox', 'aria-checked': String(isDone), tabindex: '0',
        onclick: () => toggleDone(it.id),
        onkeydown: (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleDone(it.id); } },
      },
        el('span', { class: 'check' }, isDone ? '✓' : ''),
        el('span', { class: 't-title' }, it.title),
        it.time ? el('span', { class: 't-time' }, it.time) : null,
      ));
    }
  }

  // água
  const n = state.water[todayKey()] || 0;
  const goal = state.waterGoal;
  $('#water-label').textContent = `${n} / ${goal} copos`;
  const w = $('#water');
  w.innerHTML = '';
  for (let i = 0; i < Math.max(goal, n); i++) w.append(el('i', { class: i < n ? 'full' : '' }));

  // nota
  const note = $('#note');
  if (document.activeElement !== note) note.value = state.notes[todayKey()] || '';
}

function changeWater(delta) {
  const k = todayKey();
  state.water[k] = Math.max(0, (state.water[k] || 0) + delta);
  save();
  renderToday();
}

let noteTimer;
function onNoteInput(e) {
  clearTimeout(noteTimer);
  $('#note-saved').textContent = '…';
  noteTimer = setTimeout(() => {
    const v = e.target.value.trim();
    if (v) state.notes[todayKey()] = e.target.value; else delete state.notes[todayKey()];
    save();
    $('#note-saved').textContent = 'salvo ✓';
  }, 400);
}

// ---------- Aba Rotina ----------
let formDays = new Set(ALL_DAYS);

function renderDayPicker() {
  const wrap = $('#f-days');
  wrap.innerHTML = '';
  DAY_NAMES.forEach((name, i) => {
    wrap.append(el('button', {
      type: 'button', class: formDays.has(i) ? 'on' : '', 'aria-pressed': String(formDays.has(i)),
      onclick: () => { formDays.has(i) ? formDays.delete(i) : formDays.add(i); renderDayPicker(); },
    }, name));
  });
}

function describeDays(days) {
  if (days.length === 7) return 'Todos os dias';
  const s = [...days].sort().join(',');
  if (s === '1,2,3,4,5') return 'Seg a sex';
  if (s === '0,6') return 'Fim de semana';
  const full = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return [...days].sort().map((d) => full[d]).join(', ');
}

function resetForm() {
  $('#item-form').reset();
  $('#f-id').value = '';
  formDays = new Set(ALL_DAYS);
  $('#form-title').textContent = 'Nova atividade';
  $('#f-submit').textContent = 'Adicionar';
  $('#f-cancel').hidden = true;
  renderDayPicker();
}

function editItem(it) {
  $('#f-id').value = it.id;
  $('#f-title').value = it.title;
  $('#f-period').value = it.period;
  $('#f-time').value = it.time || '';
  formDays = new Set(it.days);
  $('#form-title').textContent = 'Editar atividade';
  $('#f-submit').textContent = 'Salvar';
  $('#f-cancel').hidden = false;
  renderDayPicker();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  $('#f-title').focus();
}

function onSubmit(e) {
  e.preventDefault();
  const title = $('#f-title').value.trim();
  if (!title) return;
  if (!formDays.size) { alert('Escolha pelo menos um dia.'); return; }
  const data = { title, period: $('#f-period').value, time: $('#f-time').value, days: [...formDays].sort() };
  const id = $('#f-id').value;
  if (id) Object.assign(state.items.find((i) => i.id === id), data);
  else state.items.push({ id: uid(), ...data });
  save();
  resetForm();
  renderManage();
}

function deleteItem(it) {
  if (!confirm(`Remover "${it.title}"?`)) return;
  state.items = state.items.filter((i) => i.id !== it.id);
  save();
  renderManage();
}

function renderManage() {
  const wrap = $('#manage-list');
  wrap.innerHTML = '';
  for (const [p, label] of Object.entries(PERIODS)) {
    const group = state.items.filter((i) => i.period === p)
      .sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
    if (!group.length) continue;
    wrap.append(el('h3', {}, label));
    for (const it of group) {
      wrap.append(el('div', { class: 'manage-item' },
        el('div', { class: 'info' },
          el('div', {}, it.title),
          el('small', {}, [it.time, describeDays(it.days)].filter(Boolean).join(' · ')),
        ),
        el('button', { class: 'icon-btn', 'aria-label': 'Editar', onclick: () => editItem(it) }, '✏️'),
        el('button', { class: 'icon-btn', 'aria-label': 'Remover', onclick: () => deleteItem(it) }, '🗑️'),
      ));
    }
  }
  if (!state.items.length) wrap.append(el('div', { class: 'empty' }, 'Nenhuma atividade ainda.'));
}

// ---------- Aba Progresso ----------
function renderProgress() {
  // sequência: dias consecutivos (contando de ontem, ou de hoje se já ≥80%) com ≥80%
  let streak = 0;
  const todayR = dayRatio(daysAgo(0));
  for (let i = todayR !== null && todayR >= 0.8 ? 0 : 1; i < 365; i++) {
    const r = dayRatio(daysAgo(i));
    if (r === null) continue; // dia sem atividades não quebra a sequência
    if (r >= 0.8) streak++; else break;
  }
  $('#st-streak').textContent = streak;

  const week = [];
  for (let i = 6; i >= 0; i--) week.push({ d: daysAgo(i), r: dayRatio(daysAgo(i)) });
  const valid = week.filter((x) => x.r !== null);
  const avg = valid.length ? valid.reduce((s, x) => s + x.r, 0) / valid.length : 0;
  $('#st-week').textContent = `${Math.round(avg * 100)}%`;

  let perfect = 0;
  for (let i = 0; i < 30; i++) if (dayRatio(daysAgo(i)) === 1) perfect++;
  $('#st-perfect').textContent = perfect;

  const bars = $('#bars');
  bars.innerHTML = '';
  for (const { d, r } of week) {
    const pct = Math.round((r ?? 0) * 100);
    bars.append(el('div', { class: 'bar', title: `${pct}%` },
      el('small', {}, r === null ? '–' : `${pct}%`),
      el('div', { class: 'fill', style: `height:${pct}%` }),
      el('small', {}, d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')),
    ));
  }

  const heat = $('#heat');
  heat.innerHTML = '';
  for (let i = 29; i >= 0; i--) {
    const d = daysAgo(i);
    const r = dayRatio(d);
    const cell = el('div', { title: `${d.toLocaleDateString('pt-BR')}: ${r === null ? 'sem atividades' : Math.round(r * 100) + '%'}` });
    if (r) cell.style.background = `color-mix(in srgb, var(--accent) ${Math.round(20 + r * 80)}%, transparent)`;
    heat.append(cell);
  }

  const per = $('#per-item');
  per.innerHTML = '';
  for (const it of state.items) {
    let total = 0, ok = 0;
    for (let i = 0; i < 30; i++) {
      const d = daysAgo(i);
      if (dateKey(d) < state.startDate || !it.days.includes(d.getDay())) continue;
      total++;
      if ((state.done[dateKey(d)] || []).includes(it.id)) ok++;
    }
    const pct = total ? Math.round((ok / total) * 100) : 0;
    per.append(el('div', { class: 'per-item' },
      el('div', { class: 'lbl' }, el('span', {}, it.title), el('span', { class: 'muted' }, `${ok}/${total}`)),
      el('div', { class: 'track' }, el('div', { style: `width:${pct}%` })),
    ));
  }
  if (!state.items.length) per.append(el('div', { class: 'empty' }, 'Sem atividades.'));

  $('#water-goal').value = state.waterGoal;
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = el('a', { href: URL.createObjectURL(blob), download: `minha-rotina-${todayKey()}.json` });
  document.body.append(a);
  a.click();
  a.remove();
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  file.text().then((txt) => {
    const data = JSON.parse(txt);
    if (!Array.isArray(data.items)) throw new Error('formato inválido');
    if (!confirm('Substituir os dados atuais pelos do arquivo?')) return;
    state = { ...structuredClone(DEFAULT_STATE), ...data };
    save();
    renderAll();
    alert('Dados importados ✓');
  }).catch(() => alert('Não consegui ler esse arquivo.'))
    .finally(() => { e.target.value = ''; });
}

// ---------- Navegação ----------
let currentView = 'hoje';
function show(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach((v) => { v.hidden = v.id !== `view-${view}`; });
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  renderAll();
  window.scrollTo(0, 0);
}
function renderAll() {
  renderHeader();
  if (currentView === 'hoje') renderToday();
  if (currentView === 'rotina') renderManage();
  if (currentView === 'progresso') renderProgress();
}

// ---------- Inicialização ----------
document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => show(b.dataset.view)));
$('#water-plus').addEventListener('click', () => changeWater(1));
$('#water-minus').addEventListener('click', () => changeWater(-1));
$('#note').addEventListener('input', onNoteInput);
$('#item-form').addEventListener('submit', onSubmit);
$('#f-cancel').addEventListener('click', resetForm);
$('#export').addEventListener('click', exportData);
$('#import').addEventListener('change', importData);
$('#water-goal').addEventListener('change', (e) => {
  state.waterGoal = Math.min(30, Math.max(1, parseInt(e.target.value, 10) || 8));
  save();
});

// Atualiza quando o dia vira ou o app volta ao primeiro plano
let lastDay = todayKey();
setInterval(() => { if (todayKey() !== lastDay) { lastDay = todayKey(); renderAll(); } }, 60_000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) renderAll(); });

resetForm();
save();
renderAll();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
