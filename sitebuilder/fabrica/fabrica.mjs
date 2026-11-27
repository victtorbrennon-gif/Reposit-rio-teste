// FÁBRICA DE SITES
//   npm run fabrica -- <cliente>            monta o site do cliente (pasta clientes/<cliente>)
//   npm run fabrica -- <cliente> --video    + grava um vídeo de demonstração
//   npm run fabrica -- --novo <cliente>     cria a pasta do cliente a partir do modelo
//   npm run fabrica -- --todos              remonta todos os clientes (sem prévias)
//
// Faz tudo: lê a ficha, trata logo e fotos, escolhe estilo e cores pelo logo,
// gera os textos que faltarem, monta o site, roda os testes e tira os prints.
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { lerFicha, horariosTexto } from "./ficha.mjs";
import { ESTILOS, escolherEstilo, acentoLegivel, textos } from "./estilo.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SB = path.resolve(AQUI, "..");                 // sitebuilder/
const RAIZ = path.resolve(SB, "..");                 // repositório
const CLIENTES = path.join(RAIZ, "clientes");
// Python: "python3" no Mac/Linux; no Windows costuma ser "python" ou "py"
const PYTHON = process.env.PYTHON || ["python3", "python", "py"].find((c) => spawnSync(c, ["--version"], { encoding: "utf8" }).status === 0);
const ok = (t) => console.log("  ✓ " + t);
const aviso = (t) => console.log("  ! " + t);
const titulo = (t) => console.log("\n▶ " + t);

function slugValido(s) {
  if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(s || "")) {
    console.error(`Nome de pasta inválido: "${s}". Use letras minúsculas, números e hífen (ex.: barbearia-do-joao).`);
    process.exit(1);
  }
  return s;
}

/** Junta a ficha, o resultado das imagens e as escolhas de estilo no objeto do site. */
function montarConfig(dados, img) {
  const logo = img.logo;
  const { estilo, motivo } = escolherEstilo(dados.estilo, dados.cor || logo?.cor || null, logo?.claro);
  const base = ESTILOS[estilo];
  const corPedida = dados.cor || logo?.cor || null;
  const cores = corPedida ? acentoLegivel(corPedida, base.fundoEscuro) : null;
  const t = textos(estilo, dados);
  return {
    config: {
      slug: dados.slug,
      nome: dados.nome,
      ...(logo ? { logo: "logo.webp", icone: "logo-icone.png" } : {}),
      bairro: dados.bairro,
      endereco: dados.endereco,
      telefone: dados.telefone,
      instagram: dados.instagram,
      tema: base.tema,
      estilo,
      cores: { bg: base.bg, fg: cores?.acento || base.fg },
      ...(cores ? { acento: cores } : {}),
      abertura: dados.abertura,
      pausa: dados.pausa,
      slogan: t.slogan,
      sobre: t.sobre,
      manifesto: t.manifesto,
      imagens: img.fotos,
      fotosIlustrativas: dados.fotosIlustrativas,
      servicos: dados.servicos,
      horarios: horariosTexto(dados.abertura),
      demo: dados.demo,
    },
    motivo,
  };
}

/** Recria src/clientes.gerado.js e os temas de cada cliente a partir de clientes/<x>/site.json. */
function gerarIndice() {
  const pastas = fs.readdirSync(CLIENTES).filter((d) => fs.existsSync(path.join(CLIENTES, d, "site.json"))).sort();
  const lista = pastas.map((d) => JSON.parse(fs.readFileSync(path.join(CLIENTES, d, "site.json"), "utf8")));
  fs.writeFileSync(path.join(SB, "src/clientes.gerado.js"),
    `// GERADO pela fábrica (npm run fabrica). Não edite à mão: edite clientes/<cliente>/ficha.txt.\nexport const CLIENTES = ${JSON.stringify(lista, null, 2)};\n`);
  const dirTemas = path.join(SB, "src/temas/gerado");
  fs.rmSync(dirTemas, { recursive: true, force: true });
  fs.mkdirSync(dirTemas, { recursive: true });
  for (const c of lista) {
    const css = c.acento ? `:root{--accent:${c.acento.acento};--accent-ink:${c.acento.tinta};--glow:${c.acento.glow}}\n` : "";
    fs.writeFileSync(path.join(dirTemas, `${c.slug}.css`), `/* gerado pela fábrica */\n${css}`);
    fs.writeFileSync(path.join(dirTemas, `${c.slug}.js`), `// gerado pela fábrica\nimport "../${c.tema}.js";\nimport "./${c.slug}.css";\n`);
  }
  return lista.length;
}

function rodar(cmd, args, opts = {}) {
  const r = spawnSync(cmd === "node" ? process.execPath : cmd, args, { cwd: SB, encoding: "utf8", ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} falhou:\n${(r.stderr || r.stdout || "").slice(-2000)}`);
  return r.stdout;
}

async function fabricar(slug, { previa = true, video = false } = {}) {
  const pasta = path.join(CLIENTES, slug);
  console.log(`\n================  ${slug}  ================`);
  if (!fs.existsSync(path.join(pasta, "ficha.txt"))) {
    console.error(`Não achei clientes/${slug}/ficha.txt. Crie com: npm run fabrica -- --novo ${slug}`);
    process.exit(1);
  }

  titulo("1. Lendo a ficha");
  const { dados, erros, avisos } = lerFicha(fs.readFileSync(path.join(pasta, "ficha.txt"), "utf8"), slug);
  avisos.forEach(aviso);
  if (erros.length) { erros.forEach((e) => console.log("  ✗ " + e)); console.log("\nCorrija a ficha e rode de novo."); process.exit(1); }
  ok(`${dados.nome} · ${dados.servicos.length} serviços · ${Object.keys(dados.abertura).length} dias de atendimento`);

  titulo("2. Logo e fotos");
  const saidaImg = path.join(SB, "public-imgs", slug);
  if (!PYTHON) { console.error("Python não encontrado. Instale o Python 3 (veja COMO-USAR-NO-PC.md)."); process.exit(1); }
  const img = JSON.parse(execFileSync(PYTHON, [path.join(AQUI, "imagens.py"), pasta, saidaImg], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }));
  if (img.logo) {
    ok(`logo ${img.logo.original} -> ${img.logo.final}` + (img.logo.ampliado ? ` (ampliado: ${img.logo.ampliado})` : "") + (img.logo.fundo_removido ? ", fundo removido" : ""));
    ok(`cor do logo: ${img.logo.cor || "sem cor forte (preto/branco/prata)"}`);
  } else aviso("sem logo: o site usa a tesoura no lugar (coloque clientes/" + slug + "/logo.png)");
  if (img.fotos.length) ok(`${img.fotos.length} fotos tratadas (sem localização/GPS)`); else aviso("sem fotos: a galeria \"O ambiente\" não aparece (coloque em clientes/" + slug + "/fotos/)");
  if (img.fotos_ignoradas.length) aviso(`fotos ignoradas (formato não aceito, use JPG/PNG/WEBP): ${img.fotos_ignoradas.join(", ")}`);
  if (img.fotos_a_mais) aviso(`${img.fotos_a_mais} fotos a mais ignoradas (máximo 6)`);

  titulo("3. Estilo, cores e textos");
  const { config, motivo } = montarConfig(dados, img);
  ok(`estilo ${config.estilo} (${motivo})`);
  ok(`cor de destaque ${config.cores.fg}`);
  if (!dados.slogan) ok(`slogan criado: "${config.slogan}"`);
  fs.writeFileSync(path.join(pasta, "site.json"), JSON.stringify(config, null, 2) + "\n");
  ok(`${gerarIndice()} clientes na fábrica`);

  titulo("4. Testes das regras de agendamento");
  const t = rodar("node", ["agenda/teste/core.test.mjs"]);
  ok(t.trim().split("\n").at(-1));

  titulo("5. Montando o site");
  rodar("node", ["build-all.mjs"], { env: { ...process.env, SITE: slug } });
  ok(`sites/${slug}/ pronto`);

  if (previa) {
    titulo("6. Prévia (prints" + (video ? " + vídeo" : "") + ") e teste de agendamento");
    const { gerarPrevia } = await import("./previa.mjs");
    const saida = path.join(pasta, "previa");
    fs.rmSync(saida, { recursive: true, force: true });
    const rel = await gerarPrevia(path.join(RAIZ, "sites", slug), saida, { video });
    for (const [k, v] of Object.entries(rel.checagens)) (v === false || v === 0 ? aviso : ok)(`${k}: ${v}`);
    rel.erros.forEach((e) => aviso("erro na página: " + e));
    ok(`prints em clientes/${slug}/previa/`);
  }
  console.log(`\nPronto! ${dados.demo ? "(prévia de demonstração)" : "(site final)"}  Publicar: peça no chat do Claude.\n`);
}

// ---------------- linha de comando ----------------
const args = process.argv.slice(2);
if (args[0] === "--novo") {
  const slug = slugValido(args[1]);
  const pasta = path.join(CLIENTES, slug);
  if (fs.existsSync(pasta)) { console.error(`clientes/${slug} já existe.`); process.exit(1); }
  fs.mkdirSync(path.join(pasta, "fotos"), { recursive: true });
  fs.copyFileSync(path.join(CLIENTES, "MODELO", "ficha.txt"), path.join(pasta, "ficha.txt"));
  console.log(`Criei clientes/${slug}/. Agora:\n  1. preencha clientes/${slug}/ficha.txt\n  2. coloque o logo em clientes/${slug}/logo.png (ou .jpg)\n  3. coloque as fotos em clientes/${slug}/fotos/\n  4. rode: npm run fabrica -- ${slug}`);
} else if (args[0] === "--todos") {
  const pastas = fs.readdirSync(CLIENTES).filter((d) => d !== "MODELO" && fs.existsSync(path.join(CLIENTES, d, "ficha.txt")));
  for (const s of pastas) await fabricar(s, { previa: false });
} else if (args[0]) {
  await fabricar(slugValido(args[0]), { video: args.includes("--video"), previa: !args.includes("--sem-previa") });
} else {
  console.log("Uso: npm run fabrica -- <cliente> [--video]   |   --novo <cliente>   |   --todos");
}
