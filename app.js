'use strict';

// ---------- Estado e armazenamento ----------
const KEY = 'minha-rotina-v1';
const APP_VERSION = '2.0';
// Dentro do Claude (artifact) os dados ficam online no banco do artifact; fora dele, só no aparelho.
const IN_CLAUDE = !!(window.claude && typeof window.claude.use === 'function');
const NEW_APP_URL = 'https://claude.ai/artifact/AJ2totqj2CjhetECE5RrwH'; // endereço do app novo (artifact)
const ICS_BASE = 'victtorbrennon-gif.github.io/Reposit-rio-teste/';
const CONFIG_FIELDS = ['items', 'presetVersion', 'loads', 'body', 'shop', 'waterGoal', 'startDate'];
const PERIODS = { manha: '🌅 Manhã', tarde: '☀️ Tarde', noite: '🌙 Noite' };
const DAY_NAMES = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const uid = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_STATE = {
  items: presetItems(),
  presetVersion: 0, // versão da rotina sugerida (plan.js) já aplicada ou recusada
  wk: {},     // { 'AAAA-MM-DD': [índices dos exercícios feitos] }
  loads: {},  // { 'nome do exercício': 'carga' }
  body: [],   // [{ d: 'AAAA-MM-DD', kg, cm }]
  shop: {},   // { 'item da lista de compras': true }
  done: {},   // { 'AAAA-MM-DD': [ids] }
  water: {},  // { 'AAAA-MM-DD': n }
  notes: {},  // { 'AAAA-MM-DD': texto }
  waterGoal: 14,
  startDate: null, // primeiro dia de uso; dias anteriores não contam nas estatísticas
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...structuredClone(DEFAULT_STATE), ...JSON.parse(raw) };
  } catch (e) { /* armazenamento indisponível */ }
  return { ...structuredClone(DEFAULT_STATE), presetVersion: PRESET_VERSION };
}
function saveLocal() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignora */ }
}

// ---------- Sincronização com o banco do artifact ----------
// app/config guarda a configuração; days/AAAA-MM-DD guarda o que foi feito em cada dia.
let db = null;
let dbReady = false;
let saveTimer = null;
let writing = false;
let pendingSave = false;
let written = {}; // caminho -> JSON já gravado, pra só escrever o que mudou
let remoteConfig;  // undefined: ainda não chegou; null: não existe
let remoteDays = {};

function save() {
  saveLocal();
  if (db && dbReady) {
    clearTimeout(saveTimer);
    setSync('saving');
    saveTimer = setTimeout(() => { saveTimer = null; flush(); }, 500);
  }
}

function docsFromState() {
  const out = { 'app/config': Object.fromEntries(CONFIG_FIELDS.map((f) => [f, state[f] ?? null])) };
  const keys = new Set([...Object.keys(state.done), ...Object.keys(state.water), ...Object.keys(state.notes), ...Object.keys(state.wk)]);
  for (const k of keys) {
    out['days/' + k] = { done: state.done[k] || [], water: state.water[k] || 0, note: state.notes[k] || '', wk: state.wk[k] || [] };
  }
  return out;
}

async function flush() {
  if (writing) { pendingSave = true; return; }
  writing = true;
  setSync('saving');
  try {
    for (const [path, body] of Object.entries(docsFromState())) {
      const json = JSON.stringify(body);
      if (written[path] === json) continue;
      await db.doc(path).set(body);
      written[path] = json;
    }
    setSync('ok');
  } catch (e) {
    setSync(e && e.code === 'quota_exceeded' ? 'full' : 'error');
  }
  writing = false;
  if (pendingSave) { pendingSave = false; flush(); }
}

function applyRemote() {
  if (saveTimer || writing || !remoteConfig) return; // edição local em andamento tem prioridade
  const next = { ...structuredClone(DEFAULT_STATE), done: {}, water: {}, notes: {}, wk: {} };
  for (const f of CONFIG_FIELDS) if (remoteConfig[f] != null) next[f] = structuredClone(remoteConfig[f]);
  for (const [k, d] of Object.entries(remoteDays)) {
    if (d.done && d.done.length) next.done[k] = [...d.done];
    if (d.water) next.water[k] = d.water;
    if (d.note) next.notes[k] = d.note;
    if (d.wk && d.wk.length) next.wk[k] = [...d.wk];
  }
  if (!next.startDate) next.startDate = todayKey();
  state = next;
  written = Object.fromEntries(Object.entries(docsFromState()).map(([p, b]) => [p, JSON.stringify(b)]));
  saveLocal();
  renderAll();
}

const SYNC_TEXT = {
  loading: 'Conectando…', saving: 'Salvando…', ok: '☁️ Salvo online',
  offline: '⚠️ Sem conexão: mostrando dados salvos neste aparelho',
  error: '⚠️ Não consegui salvar. Tente de novo em instantes.',
  full: '⚠️ Espaço do app cheio. Avise o Claude.',
  nodb: '⚠️ Entre na sua conta do Claude para salvar online.',
};
function setSync(s) {
  const n = document.getElementById('sync');
  if (!n || !IN_CLAUDE) return;
  n.textContent = SYNC_TEXT[s] || '';
  n.dataset.state = s;
}

async function connectDb() {
  setSync('loading');
  const timer = setTimeout(() => { if (!dbReady) setSync('offline'); }, 10000);
  try { db = await window.claude.use('db'); } catch (e) { db = null; }
  if (!db) { clearTimeout(timer); setSync('nodb'); return; }
  let gotConfig = false;
  let gotDays = false;
  const update = () => {
    if (gotConfig && gotDays && !dbReady) { dbReady = true; clearTimeout(timer); setSync('ok'); }
    if (gotConfig && remoteConfig === null) showOnboarding();
    else if (remoteConfig) { hideOnboarding(); applyRemote(); }
  };
  const onErr = () => { clearTimeout(timer); setSync('offline'); };
  db.doc('app/config').onSnapshot((snap) => {
    remoteConfig = snap.exists ? snap.data() : null;
    if (!snap.metadata.fromCache) gotConfig = true;
    update();
  }, onErr);
  db.collection('days').onSnapshot((snap) => {
    remoteDays = Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]));
    if (!snap.metadata.fromCache) gotDays = true;
    update();
  }, onErr);
}

// Primeiro acesso ao app novo: começar do zero ou trazer os dados do app antigo
function showOnboarding() {
  const box = $('#onboarding');
  if (!box || !box.hidden) return;
  box.hidden = false;
  $('#today-list').hidden = true;
}
function hideOnboarding() {
  const box = $('#onboarding');
  if (box) box.hidden = true;
  $('#today-list').hidden = false;
}
function startFresh(data) {
  state = data ? { ...structuredClone(DEFAULT_STATE), ...data } : { ...structuredClone(DEFAULT_STATE), presetVersion: PRESET_VERSION };
  if (!state.startDate) state.startDate = todayKey();
  remoteConfig = Object.fromEntries(CONFIG_FIELDS.map((f) => [f, state[f]]));
  dbReady = true;
  hideOnboarding();
  saveLocal();
  flush();
  renderAll();
}
function parseBackup(txt) {
  const data = JSON.parse(txt);
  if (!data || !Array.isArray(data.items)) throw new Error('formato inválido');
  return data;
}

// ---------- Diálogos dentro da página ----------
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, 3000);
}
function ask(msg, okLabel = 'Confirmar') {
  return new Promise((resolve) => {
    const box = $('#ask');
    $('#ask-text').textContent = msg;
    $('#ask-ok').textContent = okLabel;
    box.hidden = false;
    $('#ask-ok').focus();
    const done = (v) => { box.hidden = true; $('#ask-ok').onclick = $('#ask-cancel').onclick = null; resolve(v); };
    $('#ask-ok').onclick = () => done(true);
    $('#ask-cancel').onclick = () => done(false);
  });
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
  if ((state.presetVersion || 0) < PRESET_VERSION) {
    wrap.append(el('div', { class: 'card banner' },
      el('b', {}, '✨ Sua rotina personalizada está pronta'),
      el('p', { class: 'muted small' }, 'Troca as atividades atuais pela rotina sugerida (com rotas, horário da academia e lives). Se você editou alguma atividade, vai precisar refazer. O histórico de progresso é mantido.'),
      el('div', { class: 'row' },
        el('button', { class: 'btn ghost', onclick: () => { state.presetVersion = PRESET_VERSION; save(); renderToday(); } }, 'Agora não'),
        el('button', { class: 'btn grow', onclick: () => {
          state.items = presetItems();
          state.presetVersion = PRESET_VERSION;
          state.waterGoal = Math.max(state.waterGoal, 14);
          save(); renderToday();
        } }, 'Aplicar rotina'),
      ),
    ));
  }
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
  if (!formDays.size) { toast('Escolha pelo menos um dia.'); return; }
  const data = { title, period: $('#f-period').value, time: $('#f-time').value, days: [...formDays].sort() };
  const id = $('#f-id').value;
  if (id) Object.assign(state.items.find((i) => i.id === id), data);
  else state.items.push({ id: uid(), ...data });
  save();
  resetForm();
  renderManage();
}

async function deleteItem(it) {
  if (!(await ask(`Remover "${it.title}"?`, 'Remover'))) return;
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

// ---------- Aba Plano ----------
let planDay = new Date().getDay();

function renderPlan() {
  const chips = $('#plan-days');
  chips.innerHTML = '';
  const names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  [1, 2, 3, 4, 5, 6, 0].forEach((d) => {
    chips.append(el('button', {
      type: 'button', class: d === planDay ? 'on' : '', 'aria-pressed': String(d === planDay),
      onclick: () => { planDay = d; renderPlan(); },
    }, names[d]));
  });

  const w = WORKOUTS[planDay];
  const isToday = planDay === new Date().getDay();
  const k = todayKey();
  const doneList = (isToday && state.wk[k]) || [];
  $('#plan-title').textContent = w.title;
  $('#plan-sub').textContent = isToday ? `Hoje · ${doneList.length}/${w.ex.length} feitos` : 'Toque em hoje para marcar';

  const list = $('#plan-list');
  list.innerHTML = '';
  w.ex.forEach(([name, sets, rest], i) => {
    const done = doneList.includes(i);
    const toggle = () => {
      if (!isToday) return;
      const cur = state.wk[k] || [];
      state.wk[k] = cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i];
      save(); renderPlan();
    };
    const load = el('input', {
      class: 'load', inputmode: 'decimal', placeholder: 'kg', 'aria-label': `Carga de ${name}`,
      onclick: (e) => e.stopPropagation(),
      onchange: (e) => { const v = e.target.value.trim(); if (v) state.loads[name] = v; else delete state.loads[name]; save(); },
    });
    load.value = state.loads[name] || '';
    const isCardio = !rest || /cardio|caminhada|alongamento/i.test(name);
    list.append(el('div', {
      class: 'task ex' + (done ? ' done' : '') + (isToday ? '' : ' readonly'),
      role: 'checkbox', 'aria-checked': String(done), tabindex: isToday ? '0' : '-1',
      onclick: toggle,
      onkeydown: (e) => { if (e.target === e.currentTarget && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); toggle(); } },
    },
      el('span', { class: 'check' }, done ? '✓' : ''),
      el('span', { class: 't-title' }, name, el('small', {}, [sets, rest && `descanso ${rest}`].filter(Boolean).join(' · '))),
      isCardio ? null : load,
    ));
  });

  renderShopping();
  const g = $('#guides');
  if (!g.childElementCount) {
    const tips = el('details', { class: 'card guide' }, el('summary', {}, '🏋️ Como treinar e progredir'));
    tips.insertAdjacentHTML('beforeend', TRAINING_TIPS);
    g.append(tips);
    for (const [title, html] of GUIDES) {
      const d = el('details', { class: 'card guide' }, el('summary', {}, title));
      d.insertAdjacentHTML('beforeend', html);
      g.append(d);
    }
  }
}

// ---------- Lista de compras ----------
function renderShopping() {
  const box = $('#shopping');
  const wasOpen = box.querySelector('details')?.open;
  box.innerHTML = '';
  state.shop = state.shop || {};
  const total = SHOPPING.reduce((s, [, , items]) => s + items.length, 0);
  const got = SHOPPING.reduce((s, [, , items]) => s + items.filter((i) => state.shop[i]).length, 0);
  const d = el('details', { class: 'card guide' }, el('summary', {}, `🛒 Lista de compras (${got}/${total})`));
  if (wasOpen) d.open = true;
  d.append(el('p', { class: 'muted small' }, SHOPPING_TIPS));
  for (const [group, weekly, items] of SHOPPING) {
    d.append(el('h3', {}, group));
    for (const item of items) {
      const id = 'shop-' + item.replace(/\W+/g, '-');
      const cb = el('input', { type: 'checkbox', id, onchange: (e) => {
        if (e.target.checked) state.shop[item] = true; else delete state.shop[item];
        save(); renderShopping();
      } });
      cb.checked = !!state.shop[item];
      d.append(el('label', { class: 'shop-item' + (cb.checked ? ' got' : ''), for: id }, cb, el('span', {}, item)));
    }
  }
  d.append(el('button', { class: 'btn ghost', type: 'button', style: 'width:100%;margin-top:12px', onclick: () => {
    for (const [, weekly, items] of SHOPPING) if (weekly) items.forEach((i) => delete state.shop[i]);
    save(); renderShopping();
  } }, 'Desmarcar o mercado da semana'));
  box.append(d);
}

// ---------- Peso e cintura ----------
function renderBody() {
  const list = $('#body-list');
  list.innerHTML = '';
  const rows = [...state.body].sort((a, b) => b.d.localeCompare(a.d)).slice(0, 8);
  if (!rows.length) list.append(el('p', { class: 'muted small' }, 'Nenhum registro ainda. Meça todo domingo, em jejum.'));
  rows.forEach((r, idx) => {
    const prev = rows[idx + 1];
    const diff = (v, p, unit) => (p == null || v == null ? '' : ` (${v - p > 0 ? '+' : ''}${(v - p).toFixed(1).replace('.', ',')}${unit})`);
    list.append(el('div', { class: 'body-row' },
      el('span', {}, r.d.split('-').reverse().slice(0, 2).join('/')),
      el('span', {}, r.kg != null ? `${String(r.kg).replace('.', ',')} kg${diff(r.kg, prev && prev.kg, '')}` : '–'),
      el('span', {}, r.cm != null ? `${String(r.cm).replace('.', ',')} cm${diff(r.cm, prev && prev.cm, '')}` : '–'),
      el('button', { class: 'icon-btn', 'aria-label': 'Apagar registro', onclick: async () => {
        if (!(await ask('Apagar este registro?', 'Apagar'))) return;
        state.body = state.body.filter((x) => x !== r); save(); renderBody();
      } }, '✕'),
    ));
  });
}

function onBodySubmit(e) {
  e.preventDefault();
  const num = (s) => { const v = parseFloat(String(s).replace(',', '.')); return Number.isFinite(v) ? v : null; };
  const kg = num($('#b-kg').value), cm = num($('#b-cm').value);
  if (kg == null && cm == null) return;
  const d = todayKey();
  state.body = state.body.filter((x) => x.d !== d);
  state.body.push({ d, kg, cm });
  save();
  e.target.reset();
  renderBody();
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
  renderBody();
}

// Resumo dos últimos 7 dias completos (até ontem), pra colar na conversa com o Claude
function weeklySummary() {
  const fmt = (d) => d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '');
  const days = [];
  for (let i = 7; i >= 1; i--) days.push(daysAgo(i));
  const L = [`RESUMO DA SEMANA (${fmt(days[0])} a ${fmt(days[6])})`, ''];

  L.push('DIAS:');
  const ratios = [];
  for (const d of days) {
    const r = dayRatio(d);
    if (r !== null) ratios.push(r);
    const k = dateKey(d);
    const w = WORKOUTS[d.getDay()];
    const wk = (state.wk[k] || []).length;
    L.push(`- ${fmt(d)}: ${r === null ? 'sem registro' : Math.round(r * 100) + '%'} · treino ${wk}/${w.ex.length} (${w.title}) · água ${state.water[k] || 0}/${state.waterGoal}`);
  }
  if (ratios.length) L.push(`Média: ${Math.round(ratios.reduce((s, x) => s + x, 0) / ratios.length * 100)}%`);

  L.push('', 'POR ATIVIDADE (feito/programado):');
  const missed = [];
  for (const it of state.items) {
    let total = 0, ok = 0;
    for (const d of days) {
      if (dateKey(d) < state.startDate || !it.days.includes(d.getDay())) continue;
      total++;
      if ((state.done[dateKey(d)] || []).includes(it.id)) ok++;
    }
    if (!total) continue;
    L.push(`- ${it.title}${it.time ? ' (' + it.time + ')' : ''}: ${ok}/${total}`);
    if (ok / total < 0.5) missed.push(it.title);
  }
  if (missed.length) L.push('', 'MENOS DA METADE DAS VEZES:', ...missed.map((m) => '- ' + m));

  const loads = Object.entries(state.loads);
  if (loads.length) L.push('', 'CARGAS ATUAIS:', ...loads.map(([n, v]) => `- ${n}: ${v} kg`));

  const body = [...state.body].sort((x, y) => x.d.localeCompare(y.d)).slice(-4);
  if (body.length) L.push('', 'PESO/CINTURA (últimos registros):', ...body.map((b) => `- ${b.d.split('-').reverse().join('/')}: ${b.kg ?? '–'} kg · ${b.cm ?? '–'} cm`));

  const notes = days.filter((d) => state.notes[dateKey(d)]).map((d) => `- ${fmt(d)}: ${state.notes[dateKey(d)].trim().replace(/\s+/g, ' ')}`);
  if (notes.length) L.push('', 'NOTAS:', ...notes);

  L.push('', 'Como me senti na semana (sono, energia, dores, fome): ');
  return L.join('\n');
}

async function shareSummary() {
  const text = weeklySummary();
  if (!IN_CLAUDE) {
    try {
      if (navigator.share) { await navigator.share({ text }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast('Resumo copiado ✓ Cole na conversa com o Claude.');
  } catch (e) {
    const box = $('#summary-box');
    box.hidden = false; box.value = text; box.focus(); box.select();
  }
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
  file.text().then(async (txt) => {
    const data = parseBackup(txt);
    if (!(await ask('Substituir os dados atuais pelos do arquivo?', 'Substituir'))) return;
    state = { ...structuredClone(DEFAULT_STATE), ...data };
    save();
    renderAll();
    toast('Dados importados ✓');
  }).catch(() => toast('Não consegui ler esse arquivo.'))
    .finally(() => { e.target.value = ''; });
}

async function copyText(text, okMsg, fallbackBox) {
  try {
    await navigator.clipboard.writeText(text);
    toast(okMsg);
  } catch (e) {
    if (fallbackBox) { fallbackBox.hidden = false; fallbackBox.value = text; fallbackBox.focus(); fallbackBox.select(); }
  }
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
  if (currentView === 'plano') renderPlan();
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
$('#body-form').addEventListener('submit', onBodySubmit);
$('#share-summary').addEventListener('click', shareSummary);
document.querySelectorAll('.cal-link').forEach((link) => { link.href = 'webcal://' + ICS_BASE + link.dataset.file; });
document.querySelectorAll('.cal-copy').forEach((b) => b.addEventListener('click', () =>
  copyText('https://' + ICS_BASE + b.dataset.file, 'Link copiado ✓', $('#cal-url-box'))));
$('#app-version').textContent = `Versão ${APP_VERSION}`;
$('#update-app').addEventListener('click', async () => {
  $('#update-app').textContent = 'Atualizando…';
  try {
    if ('serviceWorker' in navigator) {
      for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
    }
    if (window.caches) for (const k of await caches.keys()) await caches.delete(k);
  } catch (e) { /* segue pro reload */ }
  location.reload();
});
$('#import').addEventListener('change', importData);
$('#ob-fresh').addEventListener('click', () => startFresh());
$('#ob-import').addEventListener('click', async () => {
  try {
    const data = parseBackup($('#ob-paste').value);
    if (!(await ask('Trazer estes dados para o app novo?', 'Trazer dados'))) return;
    startFresh(data);
    toast('Dados importados ✓');
  } catch (e) { toast('Não reconheci esse texto. Copie de novo no app antigo.'); }
});
$('#ob-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  file.text().then((txt) => { startFresh(parseBackup(txt)); toast('Dados importados ✓'); })
    .catch(() => toast('Não consegui ler esse arquivo.'))
    .finally(() => { e.target.value = ''; });
});
$('#move-copy').addEventListener('click', () =>
  copyText(JSON.stringify(state), 'Dados copiados ✓ Agora abra o app novo e cole.', $('#move-box')));
$('#move-link').href = NEW_APP_URL;
$('#move-url').textContent = NEW_APP_URL;
$('#water-goal').addEventListener('change', (e) => {
  state.waterGoal = Math.min(30, Math.max(1, parseInt(e.target.value, 10) || 8));
  save();
});

// Atualiza quando o dia vira ou o app volta ao primeiro plano
let lastDay = todayKey();
setInterval(() => { if (todayKey() !== lastDay) { lastDay = todayKey(); renderAll(); } }, 60_000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) renderAll(); });

document.body.classList.toggle('in-claude', IN_CLAUDE);
resetForm();
saveLocal();
renderAll();

if (IN_CLAUDE) {
  connectDb();
} else if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
