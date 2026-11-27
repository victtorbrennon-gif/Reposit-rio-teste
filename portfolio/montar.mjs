// Monta o portfólio em sites/portfolio/public (estático, com cabeçalhos de segurança).
// Uso: node portfolio/montar.mjs            (fica "noindex" enquanto não for aprovado)
//      node portfolio/montar.mjs --publico  (libera para o Google)
// Os prints vêm de clientes/<slug>/previa/ (gerados pela fábrica).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, "..");
const SAIDA = path.join(RAIZ, "sites/portfolio/public");
const FONTES = path.join(RAIZ, "sitebuilder/node_modules/@fontsource");
const dados = JSON.parse(fs.readFileSync(path.join(AQUI, "dados.json"), "utf8"));
const publico = process.argv.includes("--publico");

// Trabalhos mostrados (na ordem). "pontos" = destaques de cada prévia.
const TRABALHOS = [
  { slug: "barbearia-alfa", estiloNome: "Urbano", pontos: ["Logo original refeito em alta definição", "Abertura com tesoura cortando a tela", "Agendamento em conversa, com os horários ao vivo"] },
  { slug: "navalhada", estiloNome: "Premium", pontos: ["Visual escuro com dourado, cara de barbearia de alto padrão", "Título que se monta como um corte de navalha", "Serviços com duração e preço claros"] },
  { slug: "cheiro-verde", estiloNome: "Clássico", pontos: ["Verde da casa e clima de barbearia de bairro", "Texto que acende conforme a pessoa rola", "Horários de funcionamento sempre atualizados"] },
];

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const corOk = (c) => (/^#[0-9a-f]{3,8}$/i.test(c || "") ? c : "#8b5cf6");

fs.rmSync(path.join(RAIZ, "sites/portfolio"), { recursive: true, force: true });
fs.mkdirSync(path.join(SAIDA, "img"), { recursive: true });
fs.mkdirSync(path.join(SAIDA, "fontes"), { recursive: true });

// fontes locais
for (const [pkg, arq, nome] of [
  ["chakra-petch", "chakra-petch-latin-500-normal.woff2", "chakra-petch-500.woff2"],
  ["chakra-petch", "chakra-petch-latin-700-normal.woff2", "chakra-petch-700.woff2"],
  ["inter", "inter-latin-400-normal.woff2", "inter-400.woff2"],
  ["inter", "inter-latin-500-normal.woff2", "inter-500.woff2"],
  ["inter", "inter-latin-600-normal.woff2", "inter-600.woff2"],
]) fs.copyFileSync(path.join(FONTES, pkg, "files", arq), path.join(SAIDA, "fontes", nome));

// prints -> webp sem metadados
const usados = [], faltando = [];
for (const t of TRABALHOS) {
  const prev = path.join(RAIZ, "clientes", t.slug, "previa");
  if (!fs.existsSync(path.join(prev, "pc-topo.png"))) { faltando.push(t.slug); continue; }
  t.site = JSON.parse(fs.readFileSync(path.join(RAIZ, "clientes", t.slug, "site.json"), "utf8"));
  usados.push(t);
}
const py = `
import sys
from pathlib import Path
from PIL import Image
saida = Path(sys.argv[1])
for arg in sys.argv[2:]:
    origem, nome, larg = arg.split("|")
    img = Image.open(origem).convert("RGB")
    larg = int(larg)
    if img.width > larg:
        img = img.resize((larg, round(img.height * larg / img.width)), Image.LANCZOS)
    img.save(saida / nome, "WEBP", quality=82, method=6)
`;
const itens = [];
for (const t of usados) {
  const prev = path.join(RAIZ, "clientes", t.slug, "previa");
  itens.push(`${path.join(prev, "pc-topo.png")}|${t.slug}-pc-topo.webp|1280`);
  for (const s of ["topo", "servicos", "horarios", "confirmado"]) itens.push(`${path.join(prev, `celular-${s}.png`)}|${t.slug}-celular-${s}.webp|390`);
}
const PY = process.env.PYTHON || ["python3", "python", "py"].find((c) => spawnSync(c, ["--version"]).status === 0);
const r = spawnSync(PY, ["-c", py, path.join(SAIDA, "img"), ...itens], { encoding: "utf8" });
if (r.status !== 0) { console.error(r.stderr); process.exit(1); }

// HTML
const blocos = usados.map((t) => `
    <article class="trabalho revelar t-${t.slug}">
      <div class="t-telas">
        <figure class="t-pc"><div class="barra"><i></i><i></i><i></i></div><img src="img/${t.slug}-pc-topo.webp" width="1280" height="800" loading="lazy" alt="Site da ${esc(t.site.nome)} no computador"></figure>
        <figure class="t-cel"><img src="img/${t.slug}-celular-topo.webp" width="390" height="844" loading="lazy" alt="Site da ${esc(t.site.nome)} no celular"></figure>
      </div>
      <div class="t-info">
        <span class="estilo">${esc(t.estiloNome)}</span>
        <h3>${esc(t.site.nome)}</h3>
        <p class="slogan">“${esc(t.site.slogan)}”</p>
        <ul>${t.pontos.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
        <div class="t-cores"><i class="c1"></i><i class="c2"></i><span>${esc(t.site.cores.bg)} · ${esc(t.site.cores.fg)}</span></div>
      </div>
    </article>`).join("\n");

const dig = String(dados.whatsapp || "").replace(/\D/g, "");
const wa = dig.length >= 10
  ? "https://wa.me/" + (dig.startsWith("55") ? dig : "55" + dig) + "?text=" + encodeURIComponent("Oi! Vi seu portfólio e quero saber do site com agendamento para a minha barbearia.")
  : "#sem-whatsapp";
const insta = String(dados.instagram || "").replace(/^@/, "").replace(/[^\w.]/g, "");

let html = fs.readFileSync(path.join(AQUI, "index.html"), "utf8")
  .replaceAll("%TRABALHOS%", blocos)
  .replaceAll("%FLUXO%", usados[0]?.slug || "barbearia-alfa")
  .replaceAll("%WHATSAPP%", wa)
  .replaceAll("%NOME%", esc(dados.nome))
  .replaceAll("%CIDADE%", esc(dados.cidade))
  .replaceAll("%ANO%", String(new Date().getFullYear()))
  .replaceAll("%ROBOTS%", publico ? "index, follow" : "noindex, nofollow")
  .replaceAll("%INSTAGRAM%", insta ? `<a href="https://instagram.com/${insta}" target="_blank" rel="noopener noreferrer">@${insta}</a>` : "");
fs.writeFileSync(path.join(SAIDA, "index.html"), html);

// CSS + cores de cada trabalho (CSP não deixa estilo inline)
const css = fs.readFileSync(path.join(AQUI, "estilo.css"), "utf8")
  + "\n" + usados.map((t) => `.t-${t.slug}{--t-bg:${corOk(t.site.cores.bg)};--t-fg:${corOk(t.site.cores.fg)}}`).join("\n") + "\n";
fs.writeFileSync(path.join(SAIDA, "estilo.css"), css);
fs.copyFileSync(path.join(AQUI, "script.js"), path.join(SAIDA, "script.js"));
fs.writeFileSync(path.join(SAIDA, "favicon.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0b0d17"/><path d="M18 14h16a10 10 0 0 1 0 20H18zM18 34h18a10 10 0 0 1 0 20H18z" fill="none" stroke="#8b5cf6" stroke-width="5"/><circle cx="48" cy="16" r="4" fill="#22d3ee"/></svg>`);

fs.writeFileSync(path.join(SAIDA, "_headers"), `/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
/fontes/*
  Cache-Control: public, max-age=31536000, immutable
${publico ? "" : "/*\n  X-Robots-Tag: noindex, nofollow\n"}`);
fs.writeFileSync(path.join(RAIZ, "sites/portfolio/netlify.toml"), `[build]\n  publish = "public"\n  command = ""\n`);

console.log(`Portfólio montado em sites/portfolio/public (${usados.length} trabalhos${publico ? ", público" : ", noindex"}).`);
if (faltando.length) console.log(`! Sem prints (rode a fábrica): ${faltando.join(", ")}`);
if (wa === "#sem-whatsapp") console.log("! Coloque seu WhatsApp em portfolio/dados.json para os botões funcionarem.");
