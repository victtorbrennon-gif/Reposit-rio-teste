// Regras do agendamento. Usado pela função do Netlify (servidor) e pelo site.
// Horário de Manaus: UTC-4 fixo (sem horário de verão).
//
// Como a trava funciona: o dia é dividido em "tiques" de 5 minutos.
// Uma reserva de 50 min ocupa 10 tiques: slot/<AAAA-MM-DD>/<HHMM>.
// Cada tique só é criado se ainda não existir (onlyIfNew). Se algum já existir,
// a reserva devolve os que pegou e falha: dois clientes nunca dividem o mesmo minuto.

export const OFFSET_MANAUS_MIN = -240;
export const TIQUE = 5;
export const MAX_SERVICOS = 4;
const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DIAS_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export const hm = (s) => { const [h, m] = String(s).split(":").map(Number); return h * 60 + m; };
export const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const chave = (m) => fmt(m).replace(":", "");
const deChave = (k) => hm(k.slice(-4, -2) + ":" + k.slice(-2));

export function agoraManaus(now = Date.now()) {
  const d = new Date(now + OFFSET_MANAUS_MIN * 60000);
  return { data: d.toISOString().slice(0, 10), min: d.getUTCHours() * 60 + d.getUTCMinutes() };
}
export const diaSemana = (data) => new Date(`${data}T12:00:00Z`).getUTCDay();
const somaDias = (data, n) => new Date(Date.parse(`${data}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

export function nomeDia(data, hoje) {
  if (data === hoje) return "Hoje";
  if (data === somaDias(hoje, 1)) return "Amanhã";
  return DIAS_CURTO[diaSemana(data)];
}
export const dataLonga = (data) => `${DIAS_SEMANA[diaSemana(data)]}, ${data.slice(8, 10)}/${data.slice(5, 7)}`;
export const mesCurto = (data) => MESES[Number(data.slice(5, 7)) - 1];
export function duracaoTxt(m) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}h${String(r).padStart(2, "0")}` : `${h}h`;
}

/** Próximos dias da agenda, com aberto/fechado. */
export function proximosDias(cfg, now = Date.now()) {
  const { data: hoje } = agoraManaus(now);
  return Array.from({ length: cfg.dias }, (_, i) => {
    const data = somaDias(hoje, i);
    return { data, aberto: !!cfg.abertura[diaSemana(data)], rotulo: nomeDia(data, hoje), dia: data.slice(8, 10), mes: mesCurto(data) };
  });
}

function janela(cfg, data) {
  const ab = cfg.abertura[diaSemana(data)];
  if (!ab) return null;
  return { ini: hm(ab[0]), fim: hm(ab[1]), pausa: cfg.pausa ? cfg.pausa.map(hm) : null };
}

/** Grade fixa do dia (de `intervalo` em `intervalo`), usada no painel do barbeiro. */
export function grade(cfg, data) {
  const j = janela(cfg, data);
  if (!j) return [];
  const out = [];
  for (let m = j.ini; m + cfg.intervalo <= j.fim; m += cfg.intervalo) {
    if (j.pausa && m < j.pausa[1] && m + cfg.intervalo > j.pausa[0]) continue;
    out.push(m);
  }
  return out;
}

/** O atendimento [inicio, inicio+dur) cabe no expediente (sem passar do fechamento nem pegar a pausa)? */
export function cabe(cfg, data, inicio, dur) {
  const j = janela(cfg, data);
  if (!j || inicio % TIQUE || inicio < j.ini || inicio + dur > j.fim) return false;
  if (j.pausa && inicio < j.pausa[1] && inicio + dur > j.pausa[0]) return false;
  return true;
}
export const tiques = (inicio, dur) => Array.from({ length: Math.ceil(dur / TIQUE) }, (_, i) => inicio + i * TIQUE);

/** Pacote escolhido: valida os índices e soma preço e duração. */
export function pacote(cfg, indices) {
  const lista = Array.isArray(indices) ? indices : [indices];
  if (lista.some((x) => x === "" || x == null)) return null;
  const idx = [...new Set(lista.map(Number))];
  if (!idx.length || idx.length > MAX_SERVICOS || idx.some((i) => !Number.isInteger(i) || !cfg.servicos[i])) return null;
  const itens = idx.map((i) => cfg.servicos[i]);
  return {
    idx,
    nomes: itens.map((s) => s.nome),
    preco: itens.reduce((t, s) => t + Number(s.preco), 0),
    duracao: itens.reduce((t, s) => t + s.duracao, 0),
  };
}

function dataNaJanela(cfg, data, now) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data))) return false;
  return proximosDias(cfg, now).some((d) => d.data === data && d.aberto);
}
function jaPassou(cfg, data, inicio, now) {
  const a = agoraManaus(now);
  return data < a.data || (data === a.data && inicio < a.min + cfg.antecedencia);
}

export async function ocupados(store, data) {
  const { blobs } = await store.list({ prefix: `slot/${data}/` });
  return new Set(blobs.map((b) => deChave(b.key)));
}

/** Inícios livres: a grade fixa + "encaixes" logo depois de cada atendimento/bloqueio. */
export function livresNoDia(cfg, data, dur, occ, now = Date.now()) {
  const j = janela(cfg, data);
  if (!j) return [];
  const cand = new Set();
  for (let m = j.ini; m < j.fim; m += cfg.intervalo) cand.add(m);
  for (const m of occ) if (!occ.has(m + TIQUE)) cand.add(m + TIQUE); // logo após terminar
  if (j.pausa) cand.add(j.pausa[1]);
  return [...cand]
    .sort((a, b) => a - b)
    .filter((m) => cabe(cfg, data, m, dur) && !jaPassou(cfg, data, m, now) && tiques(m, dur).every((t) => !occ.has(t)));
}

/** Horários livres de um dia para o pacote de serviços. */
export async function horarios(store, cfg, data, indices, now = Date.now()) {
  const p = pacote(cfg, indices);
  if (!p || !dataNaJanela(cfg, data, now)) return null;
  const occ = await ocupados(store, data);
  return livresNoDia(cfg, data, p.duracao, occ, now).map((m) => ({ hora: fmt(m), livre: true }));
}

/** Quantos horários livres cada dia tem (para riscar os dias lotados). */
export async function resumoDias(store, cfg, indices, now = Date.now()) {
  const p = pacote(cfg, indices);
  if (!p) return null;
  return Promise.all(
    proximosDias(cfg, now).map(async (d) => ({
      data: d.data,
      livres: d.aberto ? livresNoDia(cfg, d.data, p.duracao, await ocupados(store, d.data), now).length : 0,
    }))
  );
}

const novoCodigo = () => {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(b, (x) => abc[x % abc.length]).join("");
};
const limpa = (s, max) => String(s ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, max);

/** Tenta pegar todos os tiques; se algum já tiver dono, devolve os que pegou. */
async function pegarTiques(store, data, lista, id) {
  const pegos = [];
  for (const t of lista) {
    const k = `slot/${data}/${chave(t)}`;
    const { modified } = await store.setJSON(k, { id }, { onlyIfNew: true });
    if (!modified) {
      await Promise.all(pegos.map((x) => store.delete(x)));
      return false;
    }
    pegos.push(k);
  }
  return true;
}

/** Cria a reserva. Retorna { ok, reserva } ou { erro, status }. */
export async function reservar(store, cfg, body, now = Date.now()) {
  if (body?.empresa) return { erro: "Não foi possível agendar.", status: 400 }; // campo-isca contra robôs
  const data = String(body?.data ?? "");
  const p = pacote(cfg, body?.servicos ?? body?.servico);
  const nome = limpa(body?.nome, 60);
  const tel = String(body?.telefone ?? "").replace(/\D/g, "");
  if (!p) return { erro: "Escolha de 1 a 4 serviços.", status: 400 };
  if (!dataNaJanela(cfg, data, now)) return { erro: "Esse dia não está disponível.", status: 400 };
  if (nome.length < 2) return { erro: "Digite seu nome.", status: 400 };
  if (tel.length < 10 || tel.length > 13) return { erro: "Digite um WhatsApp válido com DDD.", status: 400 };
  if (!/^\d{2}:\d{2}$/.test(String(body?.hora))) return { erro: "Escolha um horário.", status: 400 };
  const inicio = hm(body.hora);
  if (!cabe(cfg, data, inicio, p.duracao) || jaPassou(cfg, data, inicio, now)) return { erro: "Esse horário não está disponível.", status: 400 };

  // limite de reservas futuras por telefone (evita alguém travar a agenda toda)
  const { data: hoje } = agoraManaus(now);
  const { blobs: doTel } = await store.list({ prefix: `tel/${tel}/` });
  if (doTel.filter((b) => b.key.split("/")[2].slice(0, 10) >= hoje).length >= cfg.maxPorTelefone) {
    return { erro: "Você já tem horários marcados. Para mudar, chame a barbearia no WhatsApp.", status: 429 };
  }

  const id = novoCodigo();
  const lista = tiques(inicio, p.duracao);
  if (!(await pegarTiques(store, data, lista, id))) {
    return { erro: "Esse horário acabou de ser reservado por outra pessoa. Escolha outro.", status: 409 };
  }
  const reserva = {
    id, data, hora: fmt(inicio), fim: fmt(inicio + p.duracao),
    servico: p.nomes.join(" + "), servicos: p.nomes, preco: String(p.preco), duracao: p.duracao,
    nome, telefone: tel, tiques: lista.map(chave), criado: new Date(now).toISOString(),
  };
  await store.setJSON(`reserva/${data}/${id}`, reserva);
  await store.setJSON(`tel/${tel}/${data}-${id}`, { id });
  return { ok: true, reserva };
}

/* ---------------- área do barbeiro ---------------- */

export async function listarDia(store, cfg, data) {
  const { blobs } = await store.list({ prefix: `reserva/${data}/` });
  const reservas = (await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })))).filter(Boolean);
  reservas.sort((a, b) => a.hora.localeCompare(b.hora));
  const { blobs: bl } = await store.list({ prefix: `bloqueio/${data}/` });
  return {
    reservas: reservas.map(({ tiques: _t, ...r }) => r),
    bloqueios: bl.map((b) => fmt(deChave(b.key))).sort(),
    grade: grade(cfg, data).map(fmt),
    intervalo: cfg.intervalo,
  };
}

export async function cancelar(store, data, id) {
  const r = await store.get(`reserva/${data}/${id}`, { type: "json" });
  if (!r) return false;
  for (const t of r.tiques || []) {
    const k = `slot/${data}/${t}`;
    const v = await store.get(k, { type: "json" });
    if (v?.id === id) await store.delete(k);
  }
  await store.delete(`reserva/${data}/${id}`);
  await store.delete(`tel/${r.telefone}/${data}-${id}`);
  return true;
}

/** Bloqueia (ou libera) um bloco da grade, ex.: almoço. */
export async function bloquear(store, cfg, data, hora, ligar) {
  if (!/^\d{2}:\d{2}$/.test(String(hora)) || !grade(cfg, data).includes(hm(hora))) return false;
  const ini = hm(hora);
  const marca = `bloqueio/${data}/${chave(ini)}`;
  const lista = tiques(ini, cfg.intervalo);
  if (ligar) {
    if (!(await pegarTiques(store, data, lista, "BLOQUEIO"))) return false;
    await store.setJSON(marca, { hora });
    return true;
  }
  if (!(await store.get(marca, { type: "json" }))) return false;
  for (const t of lista) {
    const k = `slot/${data}/${chave(t)}`;
    const v = await store.get(k, { type: "json" });
    if (v?.id === "BLOQUEIO") await store.delete(k);
  }
  await store.delete(marca);
  return true;
}
