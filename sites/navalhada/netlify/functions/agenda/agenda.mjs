// Função do Netlify: API do agendamento.
//   GET  /api/agenda?data=AAAA-MM-DD&servico=N  -> horários livres/ocupados (sem dados de clientes)
//   POST /api/agenda                             -> cria reserva
//   /api/admin (com senha ADMIN_TOKEN)           -> barbeiro lista, cancela e bloqueia
import { getStore } from "@netlify/blobs";
import * as core from "./core.mjs";
import CFG_SITE from "./config.mjs";

const SEG = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
};
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: SEG });

function senhaOk(req) {
  const esperado = Netlify.env.get("ADMIN_TOKEN") || "";
  const veio = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (esperado.length < 20 || veio.length !== esperado.length) return false;
  let dif = 0;
  for (let i = 0; i < esperado.length; i++) dif |= esperado.charCodeAt(i) ^ veio.charCodeAt(i);
  return dif === 0;
}

async function corpo(req) {
  const txt = await req.text();
  if (txt.length > 2000) throw new Error("grande");
  return JSON.parse(txt || "{}");
}

export default async (req) => {
  const url = new URL(req.url);
  const store = getStore({ name: "agenda", consistency: "strong" });
  try {
    const CFG = await core.cfgVivo(store, CFG_SITE); // inclui dias/horários que o barbeiro mudou
    if (url.pathname === "/api/agenda") {
      if (req.method === "GET") {
        if (url.searchParams.get("semana")) return json({ abertura: CFG.abertura, pausa: CFG.pausa || null });
        const serv = (url.searchParams.get("servicos") ?? url.searchParams.get("servico") ?? "").split(",").slice(0, core.MAX_SERVICOS);
        if (url.searchParams.get("resumo")) {
          const dias = await core.resumoDias(store, CFG, serv);
          if (!dias) return json({ erro: "Serviço inválido." }, 400);
          return json({ dias, atualizado: new Date().toISOString() });
        }
        const lista = await core.horarios(store, CFG, url.searchParams.get("data"), serv);
        if (!lista) {
          if (!core.pacote(CFG, serv)) return json({ erro: "Serviço inválido." }, 400);
          return json({ fechado: true, horarios: [] }); // dia fechado pelo barbeiro ou fora da agenda
        }
        return json({ horarios: lista, atualizado: new Date().toISOString() });
      }
      if (req.method === "POST") {
        const r = await core.reservar(store, CFG, await corpo(req));
        return r.ok ? json({ reserva: r.reserva }, 201) : json({ erro: r.erro }, r.status);
      }
      return json({ erro: "Método não permitido." }, 405);
    }

    if (url.pathname === "/api/admin") {
      if (!senhaOk(req)) return json({ erro: "Senha incorreta." }, 401);
      if (req.method === "GET") {
        const data = url.searchParams.get("data") || core.agoraManaus().data;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return json({ erro: "Data inválida." }, 400);
        return json(await core.listarDia(store, CFG, data));
      }
      if (req.method === "POST") {
        const b = await corpo(req);
        if (b.acao === "semana") {
          const r = await core.salvarSemana(store, b.abertura);
          return r.ok ? json({ ok: true }) : json({ erro: r.erro }, 400);
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.data))) return json({ erro: "Data inválida." }, 400);
        if (b.acao === "cancelar") return json({ ok: await core.cancelar(store, b.data, String(b.id).slice(0, 12)) });
        if (b.acao === "bloquear") return json({ ok: await core.bloquear(store, CFG, b.data, b.hora, true) });
        if (b.acao === "liberar") return json({ ok: await core.bloquear(store, CFG, b.data, b.hora, false) });
        const r =
          b.acao === "fecharDia" ? await core.fecharDia(store, b.data) :
          b.acao === "horarioDia" ? await core.horarioDoDia(store, b.data, b.abre, b.fecha) :
          b.acao === "diaNormal" ? await core.diaNormal(store, b.data) : null;
        if (r) return r.ok ? json({ ok: true }) : json({ erro: r.erro }, 400);
        return json({ erro: "Ação inválida." }, 400);
      }
      return json({ erro: "Método não permitido." }, 405);
    }
    return json({ erro: "Não encontrado." }, 404);
  } catch (e) {
    console.error(e);
    return json({ erro: "Erro no servidor. Tente de novo em instantes." }, 500);
  }
};

export const config = {
  path: ["/api/agenda", "/api/admin"],
  rateLimit: { windowLimit: 40, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
