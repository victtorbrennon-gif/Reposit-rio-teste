// Teste das regras do agendamento: npm test
import assert from "node:assert/strict";
import * as core from "../core.mjs";
import { SITES, agendaDe } from "../../src/sites.js";

// armazenamento falso com a mesma trava "só grava se não existir" do Netlify Blobs
function storeFalso() {
  const m = new Map();
  const espera = () => new Promise((r) => setTimeout(r, Math.random() * 4));
  return {
    m,
    async setJSON(k, v, o = {}) { await espera(); if (o.onlyIfNew && m.has(k)) return { modified: false }; m.set(k, JSON.stringify(v)); return { modified: true }; },
    async get(k) { await espera(); return m.has(k) ? JSON.parse(m.get(k)) : null; },
    async delete(k) { await espera(); m.delete(k); },
    async list({ prefix }) { await espera(); return { blobs: [...m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; },
  };
}
const cfg = agendaDe(SITES[0]); // Alpha: seg-sex 9-20, sáb 8-19; corte 30, barba 30, corte+barba 60, pezinho 15, sobrancelha 15
const AGORA = Date.parse("2026-12-01T14:10:00Z"); // terça 10:10 em Manaus
const D = "2026-12-02";
const horas = async (s, data, serv) => (await core.horarios(s, cfg, data, serv, AGORA)).map((h) => h.hora);
const reserva = (s, hora, servicos, tel = "92991112222", data = D, nome = "João Silva") => core.reservar(s, cfg, { data, hora, servicos, nome, telefone: tel }, AGORA);
let ok = 0; const t = async (nome, fn) => { await fn(); ok++; console.log("✓", nome); };

await t("dias: 14 dias, domingo fechado", () => {
  const d = core.proximosDias(cfg, AGORA);
  assert.equal(d.length, 14); assert.equal(d[0].rotulo, "Hoje"); assert.equal(d[0].mes, "dez");
  assert.equal(d.find((x) => x.data === "2026-12-06").aberto, false);
});
await t("vários serviços: soma preço e duração", () => {
  const p = core.pacote(cfg, [0, 1, 4]);
  assert.equal(p.preco, 35 + 25 + 10); assert.equal(p.duracao, 30 + 30 + 15);
  assert.equal(core.pacote(cfg, [0, 1, 2, 3, 4]), null); // máximo 4
  assert.equal(core.pacote(cfg, [99]), null);
});
await t("hoje: nada antes de agora + 30min", async () => {
  const h = await horas(storeFalso(), "2026-12-01", [0]);
  assert.ok(!h.includes("10:30")); assert.ok(h.includes("11:00"));
});
await t("não passa do fechamento (1h15 às 19:00 não cabe)", async () => {
  const h = await horas(storeFalso(), D, [0, 1, 4]);
  assert.ok(h.includes("18:30")); assert.ok(!h.includes("19:00"));
});
await t("encaixe: depois de um corte de 30min + sobrancelha 15min às 10:00, aparece 10:45", async () => {
  const s = storeFalso();
  assert.ok((await reserva(s, "10:00", [0, 4])).ok); // 10:00–10:45
  const h = await horas(s, D, [0]);
  assert.ok(!h.includes("10:00") && !h.includes("10:30"));
  assert.ok(h.includes("10:45"), "encaixe logo após terminar");
  assert.ok(h.includes("11:00"));
});
await t("20 clientes no MESMO horário ao mesmo tempo: só 1 consegue e não sobra lixo", async () => {
  const s = storeFalso();
  const rs = await Promise.all(Array.from({ length: 20 }, (_, i) => reserva(s, "15:00", [2], "929900000" + String(i).padStart(2, "0"))));
  assert.equal(rs.filter((r) => r.ok).length, 1);
  assert.equal(rs.filter((r) => r.status === 409).length, 19);
  const v = [...s.m.keys()].filter((k) => k.startsWith(`slot/${D}/`));
  assert.equal(v.length, 12); // 60min / 5
});
await t("horários que se cruzam ao mesmo tempo (10:00 1h e 10:40 30min): só 1", async () => {
  for (let i = 0; i < 10; i++) {
    const s = storeFalso();
    const [a, b] = await Promise.all([reserva(s, "10:00", [2], "92911111111"), reserva(s, "10:40", [0], "92922222222")]);
    assert.equal([a, b].filter((r) => r.ok).length, 1);
  }
});
await t("validações", async () => {
  const s = storeFalso(); const base = { hora: "15:00", servicos: [0], nome: "Ana", telefone: "92991112222" };
  const r = (x) => core.reservar(s, cfg, { ...base, ...x }, AGORA);
  assert.equal((await r({ data: "2026-12-06" })).status, 400);          // domingo
  assert.equal((await r({ data: "2026-12-01", hora: "10:00" })).status, 400); // já passou
  assert.equal((await r({ data: D, nome: "" })).status, 400);
  assert.equal((await r({ data: D, telefone: "123" })).status, 400);
  assert.equal((await r({ data: D, empresa: "x" })).status, 400);      // robô
  assert.equal((await r({ data: D, hora: "15:03" })).status, 400);     // fora dos 5 min
  assert.equal((await r({ data: D, hora: "19:45", servicos: [2] })).status, 400); // passa do fechamento
  assert.equal((await r({ data: "2027-12-02" })).status, 400);
  assert.ok((await r({ data: D, hora: "15:05" })).ok);                  // encaixe livre em múltiplo de 5
});
await t("máximo 2 reservas futuras por telefone", async () => {
  const s = storeFalso();
  assert.ok((await reserva(s, "10:00", [0])).ok); assert.ok((await reserva(s, "11:00", [0])).ok);
  assert.equal((await reserva(s, "12:00", [0])).status, 429);
});
await t("resumo dos dias: dia lotado aparece com 0 livres", async () => {
  const s = storeFalso();
  for (const h of core.grade(cfg, D).map(core.fmt)) await core.bloquear(s, cfg, D, h, true);
  const dias = await core.resumoDias(s, cfg, [0], AGORA);
  assert.equal(dias.find((d) => d.data === D).livres, 0);
  assert.ok(dias.find((d) => d.data === "2026-12-03").livres > 0);
  assert.equal(dias.find((d) => d.data === "2026-12-06").livres, 0);
});
await t("barbeiro: lista, cancela (libera) e bloqueia/libera", async () => {
  const s = storeFalso();
  const r = await reserva(s, "15:00", [0, 1]);
  let dia = await core.listarDia(s, cfg, D);
  assert.equal(dia.reservas.length, 1); assert.equal(dia.reservas[0].servico, "Corte masculino + Barba");
  assert.equal(dia.reservas[0].tiques, undefined); // não expõe detalhes internos
  assert.ok(await core.cancelar(s, D, r.reserva.id));
  assert.ok((await horas(s, D, [2])).includes("15:00"));
  assert.ok(await core.bloquear(s, cfg, D, "12:00", true));
  assert.equal(await core.bloquear(s, cfg, D, "12:00", true), false); // já bloqueado
  assert.ok(!(await horas(s, D, [0])).includes("12:00"));
  dia = await core.listarDia(s, cfg, D); assert.deepEqual(dia.bloqueios, ["12:00"]);
  assert.ok(await core.bloquear(s, cfg, D, "12:00", false));
  assert.ok((await horas(s, D, [0])).includes("12:00"));
  assert.equal(await core.bloquear(s, cfg, D, "03:00", true), false);
});
console.log(`\n${ok} testes passaram`);
