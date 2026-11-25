// Regras do agendamento. Usado pela função do Netlify (servidor) e pelo site (para montar os dias).
// Horário de Manaus: UTC-4 fixo (sem horário de verão).
// Cada horário ocupado vira uma "vaga" no armazenamento: slot/<AAAA-MM-DD>/<HHMM>.
// A vaga só é criada se ainda não existir (onlyIfNew): é isso que impede dois clientes no mesmo horário.

export const OFFSET_MANAUS_MIN = -240;
const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DIAS_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const hm = (s) => { const [h, m] = String(s).split(":").map(Number); return h * 60 + m; };
export const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const chave = (m) => fmt(m).replace(":", "");

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
export function dataLonga(data) {
  const [a, m, d] = data.split("-");
  return `${DIAS_SEMANA[diaSemana(data)]}, ${d}/${m}`;
}

/** Próximos dias da agenda, com aberto/fechado. */
export function proximosDias(cfg, now = Date.now()) {
  const { data: hoje } = agoraManaus(now);
  return Array.from({ length: cfg.dias }, (_, i) => {
    const data = somaDias(hoje, i);
    return { data, aberto: !!cfg.abertura[diaSemana(data)], rotulo: nomeDia(data, hoje), dia: data.slice(8, 10) };
  });
}

/** Inícios possíveis do dia (em minutos), respeitando abertura e pausa. */
export function grade(cfg, data) {
  const ab = cfg.abertura[diaSemana(data)];
  if (!ab) return [];
  const [ini, fim] = ab.map(hm);
  const pausa = cfg.pausa ? cfg.pausa.map(hm) : null;
  const out = [];
  for (let m = ini; m + cfg.intervalo <= fim; m += cfg.intervalo) {
    if (pausa && m >= pausa[0] && m < pausa[1]) continue;
    out.push(m);
  }
  return out;
}

/** Vagas que um serviço ocupa a partir de `inicio`; null se não cabe (passa do fechamento ou pega a pausa). */
export function vagasDoServico(cfg, data, inicio, duracao) {
  const g = new Set(grade(cfg, data));
  const n = Math.ceil(duracao / cfg.intervalo);
  const vagas = [];
  for (let i = 0; i < n; i++) {
    const m = inicio + i * cfg.intervalo;
    if (!g.has(m)) return null;
    vagas.push(m);
  }
  return vagas;
}

function dataNaJanela(cfg, data, now) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data))) return false;
  return proximosDias(cfg, now).some((d) => d.data === data && d.aberto);
}
const jaPassou = (cfg, data, inicio, now) => {
  const a = agoraManaus(now);
  return data === a.data && inicio < a.min + cfg.antecedencia;
};

export async function ocupados(store, data) {
  const { blobs } = await store.list({ prefix: `slot/${data}/` });
  return new Set(blobs.map((b) => hm(b.key.slice(-4, -2) + ":" + b.key.slice(-2))));
}

/** Horários de um dia para um serviço, com livre/ocupado. */
export async function horarios(store, cfg, data, servIdx, now = Date.now()) {
  const serv = cfg.servicos[servIdx];
  if (!serv || !dataNaJanela(cfg, data, now)) return null;
  const occ = await ocupados(store, data);
  return grade(cfg, data).flatMap((m) => {
    const vagas = vagasDoServico(cfg, data, m, serv.duracao);
    if (!vagas) return []; // serviço não cabe antes de fechar
    const livre = !jaPassou(cfg, data, m, now) && vagas.every((v) => !occ.has(v));
    return [{ hora: fmt(m), livre }];
  });
}

const novoCodigo = () => {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(b, (x) => abc[x % abc.length]).join("");
};
const limpa = (s, max) => String(s ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, max);

/** Cria a reserva. Retorna { ok, reserva } ou { erro, status }. */
export async function reservar(store, cfg, body, now = Date.now()) {
  if (body?.empresa) return { erro: "Não foi possível agendar.", status: 400 }; // campo-isca contra robôs
  const data = String(body?.data ?? "");
  const servIdx = Number(body?.servico);
  const nome = limpa(body?.nome, 60);
  const tel = String(body?.telefone ?? "").replace(/\D/g, "");
  const serv = cfg.servicos[servIdx];
  if (!serv || !Number.isInteger(servIdx)) return { erro: "Escolha um serviço.", status: 400 };
  if (!dataNaJanela(cfg, data, now)) return { erro: "Esse dia não está disponível.", status: 400 };
  if (nome.length < 2) return { erro: "Digite seu nome.", status: 400 };
  if (tel.length < 10 || tel.length > 13) return { erro: "Digite um WhatsApp válido com DDD.", status: 400 };
  if (!/^\d{2}:\d{2}$/.test(String(body?.hora))) return { erro: "Escolha um horário.", status: 400 };
  const inicio = hm(body.hora);
  const vagas = vagasDoServico(cfg, data, inicio, serv.duracao);
  if (!vagas || jaPassou(cfg, data, inicio, now)) return { erro: "Esse horário não está disponível.", status: 400 };

  // limite de reservas futuras por telefone (evita alguém travar a agenda toda)
  const { data: hoje } = agoraManaus(now);
  const { blobs: doTel } = await store.list({ prefix: `tel/${tel}/` });
  const futuras = doTel.filter((b) => b.key.split("/")[2].slice(0, 10) >= hoje).length;
  if (futuras >= cfg.maxPorTelefone) {
    return { erro: "Você já tem horários marcados. Para mudar, chame a barbearia no WhatsApp.", status: 429 };
  }

  const id = novoCodigo();
  const pegas = [];
  for (const v of vagas) {
    const { modified } = await store.setJSON(`slot/${data}/${chave(v)}`, { id }, { onlyIfNew: true });
    if (!modified) {
      await Promise.all(pegas.map((k) => store.delete(k))); // devolve o que já tinha pego
      return { erro: "Esse horário acabou de ser reservado por outra pessoa. Escolha outro.", status: 409 };
    }
    pegas.push(`slot/${data}/${chave(v)}`);
  }
  const reserva = {
    id, data, hora: fmt(inicio), fim: fmt(inicio + vagas.length * cfg.intervalo),
    servico: serv.nome, preco: serv.preco, duracao: serv.duracao, nome, telefone: tel,
    criado: new Date(now).toISOString(),
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
  const { blobs: vs } = await store.list({ prefix: `slot/${data}/` });
  const bloqueios = [];
  for (const b of vs) {
    const v = await store.get(b.key, { type: "json" });
    if (v?.id === "BLOQUEIO") bloqueios.push(b.key.slice(-4, -2) + ":" + b.key.slice(-2));
  }
  return { reservas, bloqueios, grade: grade(cfg, data).map(fmt) };
}

export async function cancelar(store, data, id) {
  const r = await store.get(`reserva/${data}/${id}`, { type: "json" });
  if (!r) return false;
  const { blobs } = await store.list({ prefix: `slot/${data}/` });
  for (const b of blobs) {
    const v = await store.get(b.key, { type: "json" });
    if (v?.id === id) await store.delete(b.key);
  }
  await store.delete(`reserva/${data}/${id}`);
  await store.delete(`tel/${r.telefone}/${data}-${id}`);
  return true;
}

export async function bloquear(store, cfg, data, hora, ligar) {
  if (!/^\d{2}:\d{2}$/.test(String(hora)) || !grade(cfg, data).includes(hm(hora))) return false;
  const k = `slot/${data}/${hora.replace(":", "")}`;
  if (ligar) return (await store.setJSON(k, { id: "BLOQUEIO" }, { onlyIfNew: true })).modified;
  const v = await store.get(k, { type: "json" });
  if (v?.id !== "BLOQUEIO") return false;
  await store.delete(k);
  return true;
}
