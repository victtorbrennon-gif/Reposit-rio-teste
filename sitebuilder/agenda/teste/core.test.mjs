// Teste das regras do agendamento: node agenda/teste/core.test.mjs
import assert from "node:assert/strict";
import * as core from "../core.mjs";
import { SITES, agendaDe } from "../../src/sites.js";

// armazenamento falso com a mesma trava "só grava se não existir" do Netlify Blobs
function storeFalso() {
  const m = new Map();
  const espera = () => new Promise((r) => setTimeout(r, Math.random() * 5));
  return {
    m,
    async setJSON(k, v, o = {}) { await espera(); if (o.onlyIfNew && m.has(k)) return { modified: false }; m.set(k, JSON.stringify(v)); return { modified: true }; },
    async get(k) { await espera(); return m.has(k) ? JSON.parse(m.get(k)) : null; },
    async delete(k) { await espera(); m.delete(k); },
    async list({ prefix }) { await espera(); return { blobs: [...m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; },
  };
}
const cfg = agendaDe(SITES[0]); // Alpha: seg-sex 9-20, sáb 8-19
// "agora" fixo: terça 2026-12-01 10:10 em Manaus (14:10 UTC)
const AGORA = Date.parse("2026-12-01T14:10:00Z");
let ok = 0; const t = async (nome, fn) => { await fn(); ok++; console.log("✓", nome); };

await t("dias: domingo fechado, 14 dias", () => {
  const d = core.proximosDias(cfg, AGORA);
  assert.equal(d.length, 14); assert.equal(d[0].data, "2026-12-01"); assert.equal(d[0].rotulo, "Hoje");
  assert.equal(d.find((x) => x.data === "2026-12-06").aberto, false); // domingo
});
await t("horários de hoje: antes de 10:40 ficam ocupados (antecedência 30min)", async () => {
  const s = storeFalso();
  const h = await core.horarios(s, cfg, "2026-12-01", 0, AGORA);
  assert.equal(h.find((x) => x.hora === "10:30").livre, false);
  assert.equal(h.find((x) => x.hora === "11:00").livre, true);
  assert.equal(h.at(-1).hora, "19:30"); // corte de 30min cabe até 19:30
});
await t("serviço de 1h não aparece às 19:30 (não cabe antes de fechar)", async () => {
  const h = await core.horarios(storeFalso(), cfg, "2026-12-02", 2, AGORA);
  assert.equal(h.at(-1).hora, "19:00");
});
await t("reserva de 1h ocupa 2 horários e some para os outros", async () => {
  const s = storeFalso();
  const r = await core.reservar(s, cfg, { data: "2026-12-02", hora: "15:00", servico: 2, nome: "João", telefone: "92991112222" }, AGORA);
  assert.ok(r.ok, JSON.stringify(r)); assert.equal(r.reserva.fim, "16:00");
  const h = await core.horarios(s, cfg, "2026-12-02", 0, AGORA);
  assert.equal(h.find((x) => x.hora === "15:00").livre, false);
  assert.equal(h.find((x) => x.hora === "15:30").livre, false);
  assert.equal(h.find((x) => x.hora === "16:00").livre, true);
  const h1 = await core.horarios(s, cfg, "2026-12-02", 2, AGORA); // 1h às 14:30 bateria em 15:00
  assert.equal(h1.find((x) => x.hora === "14:30").livre, false);
});
await t("20 clientes clicando no MESMO horário ao mesmo tempo: só 1 consegue", async () => {
  const s = storeFalso();
  const rs = await Promise.all(Array.from({ length: 20 }, (_, i) =>
    core.reservar(s, cfg, { data: "2026-12-03", hora: "10:00", servico: 2, nome: "Cliente " + i, telefone: "929900000" + String(i).padStart(2, "0") }, AGORA)));
  assert.equal(rs.filter((r) => r.ok).length, 1);
  assert.equal(rs.filter((r) => r.status === 409).length, 19);
  const vagas = [...s.m.keys()].filter((k) => k.startsWith("slot/2026-12-03/"));
  assert.deepEqual(vagas.sort(), ["slot/2026-12-03/1000", "slot/2026-12-03/1030"]); // nada sobrando dos que perderam
});
await t("horários que se cruzam (10:00 1h e 10:30 1h) ao mesmo tempo: só 1", async () => {
  const s = storeFalso();
  const [a, b] = await Promise.all([
    core.reservar(s, cfg, { data: "2026-12-04", hora: "10:00", servico: 2, nome: "Ana", telefone: "92911111111" }, AGORA),
    core.reservar(s, cfg, { data: "2026-12-04", hora: "10:30", servico: 2, nome: "Bia", telefone: "92922222222" }, AGORA)]);
  assert.equal([a, b].filter((r) => r.ok).length, 1);
});
await t("validações: domingo, horário passado, nome, telefone, robô", async () => {
  const s = storeFalso(); const base = { hora: "15:00", servico: 0, nome: "Ana", telefone: "92991112222" };
  assert.equal((await core.reservar(s, cfg, { ...base, data: "2026-12-06" }, AGORA)).status, 400);
  assert.equal((await core.reservar(s, cfg, { ...base, data: "2026-12-01", hora: "10:00" }, AGORA)).status, 400);
  assert.equal((await core.reservar(s, cfg, { ...base, data: "2026-12-02", nome: "" }, AGORA)).status, 400);
  assert.equal((await core.reservar(s, cfg, { ...base, data: "2026-12-02", telefone: "123" }, AGORA)).status, 400);
  assert.equal((await core.reservar(s, cfg, { ...base, data: "2026-12-02", empresa: "x" }, AGORA)).status, 400);
  assert.equal((await core.reservar(s, cfg, { ...base, data: "2026-12-02", hora: "15:15" }, AGORA)).status, 400);
  assert.equal((await core.reservar(s, cfg, { ...base, data: "2027-12-02" }, AGORA)).status, 400);
});
await t("máximo 2 reservas futuras por telefone", async () => {
  const s = storeFalso(); const b = { servico: 0, nome: "Ana", telefone: "92991112222", data: "2026-12-02" };
  assert.ok((await core.reservar(s, cfg, { ...b, hora: "10:00" }, AGORA)).ok);
  assert.ok((await core.reservar(s, cfg, { ...b, hora: "11:00" }, AGORA)).ok);
  assert.equal((await core.reservar(s, cfg, { ...b, hora: "12:00" }, AGORA)).status, 429);
});
await t("barbeiro: lista, cancela (libera o horário) e bloqueia", async () => {
  const s = storeFalso();
  const r = await core.reservar(s, cfg, { data: "2026-12-02", hora: "15:00", servico: 2, nome: "João", telefone: "92991112222" }, AGORA);
  let dia = await core.listarDia(s, cfg, "2026-12-02");
  assert.equal(dia.reservas.length, 1); assert.equal(dia.reservas[0].nome, "João");
  assert.ok(await core.cancelar(s, "2026-12-02", r.reserva.id));
  assert.equal((await core.horarios(s, cfg, "2026-12-02", 2, AGORA)).find((x) => x.hora === "15:00").livre, true);
  assert.ok(await core.bloquear(s, cfg, "2026-12-02", "12:00", true));
  assert.equal((await core.horarios(s, cfg, "2026-12-02", 0, AGORA)).find((x) => x.hora === "12:00").livre, false);
  dia = await core.listarDia(s, cfg, "2026-12-02"); assert.deepEqual(dia.bloqueios, ["12:00"]);
  assert.ok(await core.bloquear(s, cfg, "2026-12-02", "12:00", false));
  assert.equal((await core.horarios(s, cfg, "2026-12-02", 0, AGORA)).find((x) => x.hora === "12:00").livre, true);
  assert.equal(await core.bloquear(s, cfg, "2026-12-02", "03:00", true), false);
});
console.log(`\n${ok} testes passaram`);
