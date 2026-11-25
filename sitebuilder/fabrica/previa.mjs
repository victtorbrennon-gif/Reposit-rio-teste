// Prints (e vídeo opcional) de um site, com teste rápido do agendamento.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { servir } from "./servidor-teste.mjs";

const require = createRequire(import.meta.url);

/** Gera prints em <saida> e devolve um relatório do que foi checado. */
export async function gerarPrevia(raizSite, saida, { video = false, porta = 9600 } = {}) {
  const { chromium } = require("playwright");
  fs.mkdirSync(saida, { recursive: true });
  const s = await servir(raizSite, porta);
  const rel = { erros: [], checagens: {} };
  const b = await chromium.launch();
  try {
    // PC
    const pc = await b.newPage({ viewport: { width: 1280, height: 800 } });
    pc.on("pageerror", (e) => rel.erros.push("PC: " + e.message));
    pc.on("console", (m) => m.type() === "error" && rel.erros.push("PC: " + m.text()));
    await pc.goto(s.url); await pc.waitForTimeout(4200);
    await pc.screenshot({ path: path.join(saida, "pc-topo.png") });
    rel.checagens.pcSemEstourar = !(await pc.evaluate(() => document.documentElement.scrollWidth > innerWidth));
    await pc.close();

    // Celular: abre, vai para a conversa e faz um agendamento completo
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true,
      ...(video ? { recordVideo: { dir: saida, size: { width: 780, height: 1688 } } } : {}) });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => rel.erros.push("Celular: " + e.message));
    p.on("console", (m) => m.type() === "error" && rel.erros.push("Celular: " + m.text()));
    const ultima = async () => (await p.locator(".cv-linha.bot .cv-bolha").last().innerText().catch(() => "")).trim();
    const ate = async (t, ms = 9000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if ((await ultima()).includes(t)) return true; await p.waitForTimeout(150); } return false; };
    await p.goto(s.url); await p.waitForTimeout(4500);
    await p.screenshot({ path: path.join(saida, "celular-topo.png") });
    rel.checagens.celularSemEstourar = !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth));
    if (video) { for (let y = 0; y < 900; y += 8) { await p.evaluate((v) => scrollTo(0, v), y); await p.waitForTimeout(16); } await p.waitForTimeout(1500); }
    await p.locator(".hero .btn-main").tap(); await p.waitForTimeout(2200);
    rel.checagens.conversaComecou = await ate("nome");
    await p.locator("#cv-input").tap(); await p.keyboard.type("Cliente Teste", { delay: video ? 80 : 0 }); await p.locator(".cv-enviar").tap();
    await ate("O que você vai fazer"); await p.waitForTimeout(700);
    await p.locator(".cv-serv").first().tap(); await p.waitForTimeout(500);
    await p.screenshot({ path: path.join(saida, "celular-servicos.png") });
    await p.locator(".cv-barra .btn").tap(); await ate("Qual dia"); await p.waitForTimeout(1000);
    await p.locator(".cv-dia:not([disabled])").first().tap(); await ate("horários livres"); await p.waitForTimeout(1600);
    rel.checagens.horariosLivres = await p.locator(".cv-hora:not(.esq)").count();
    await p.screenshot({ path: path.join(saida, "celular-horarios.png") });
    await p.locator(".cv-hora:not(.esq)").first().tap(); await ate("WhatsApp");
    await p.locator("#cv-input").tap(); await p.keyboard.type("92988887777", { delay: video ? 70 : 0 }); await p.locator(".cv-enviar").tap();
    await ate("Confere"); await p.waitForTimeout(video ? 2000 : 500);
    await p.locator(".cv-botoes .btn").tap();
    rel.checagens.agendamentoConfirmado = await ate("Prontinho", 9000); await p.waitForTimeout(1500);
    await p.screenshot({ path: path.join(saida, "celular-confirmado.png") });
    if (video) { const y0 = await p.evaluate(() => scrollY); for (let y = y0; y < y0 + 3200; y += 8) { await p.evaluate((v) => scrollTo(0, v), y); await p.waitForTimeout(16); } await p.waitForTimeout(1500); }
    await ctx.close();
    // o agendamento chegou no painel do barbeiro?
    const hoje = await s.api("api/admin?data=" + new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10), { headers: { authorization: "Bearer senha-de-teste-1234567890" } });
    rel.checagens.painelResponde = Array.isArray(hoje.reservas);
  } finally {
    await b.close();
    s.fechar();
  }
  if (video) {
    const webm = fs.readdirSync(saida).find((f) => f.endsWith(".webm"));
    if (webm) {
      try {
        execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", path.join(saida, webm), "-vf", "fps=30,scale=720:-2", "-c:v", "libx264", "-crf", "23", "-pix_fmt", "yuv420p", "-movflags", "+faststart", path.join(saida, "demonstracao.mp4")]);
        fs.unlinkSync(path.join(saida, webm));
      } catch { rel.erros.push("ffmpeg não encontrado: vídeo ficou em .webm"); }
    }
  }
  return rel;
}
