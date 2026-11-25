// Gera todos os sites em ../sites/<slug>/ com cabeçalhos de segurança e favicon.
// Uso: npm run build            (todos)
//      SITE=navalhada npm run build   (só um)
import { build } from "vite";
import { writeFileSync, existsSync, cpSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { SITES, TEMAS, agendaDe } from "./src/sites.js";

const HEADERS = `/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
/assets/*
  Cache-Control: public, max-age=31536000, immutable
/admin/*
  Cache-Control: no-store
  X-Robots-Tag: noindex, nofollow
`;

const NETLIFY_TOML = `[build]
  publish = "public"
  command = ""
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "22"

[functions]
  node_bundler = "esbuild"
`;

const favicon = ({ bg, fg }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${bg}"/><g fill="none" stroke="${fg}" stroke-width="4" stroke-linecap="round"><circle cx="20" cy="20" r="7"/><circle cx="20" cy="44" r="7"/><path d="M25 25 32 32M48 16 25 39M38 38 48 48"/></g></svg>`;

const alvo = process.env.SITE;
for (const site of SITES.filter((s) => !alvo || s.slug === alvo)) {
  process.env.SITE = site.slug;
  const raiz = new URL(`../sites/${site.slug}/`, import.meta.url);
  // limpa a pasta do site (mantém só .netlify, que liga a pasta ao projeto no Netlify)
  if (existsSync(raiz)) for (const f of readdirSync(raiz)) if (f !== ".netlify") rmSync(new URL(f, raiz), { recursive: true, force: true });
  await build({ configFile: new URL("./vite.config.js", import.meta.url).pathname, logLevel: "warn" });

  const pub = new URL("public/", raiz);
  writeFileSync(new URL("_headers", pub), HEADERS + (site.demo ? "/*\n  X-Robots-Tag: noindex, nofollow\n" : ""));
  writeFileSync(new URL("favicon.svg", pub), favicon(site.cores || TEMAS[site.tema]));
  const imgs = new URL(`./public-imgs/${site.slug}/`, import.meta.url);
  if (existsSync(imgs)) cpSync(imgs, new URL("img/", pub), { recursive: true });
  cpSync(new URL("./admin/", import.meta.url), new URL("admin/", pub), { recursive: true });

  // função do agendamento (servidor) com a configuração desta barbearia
  const fn = new URL("netlify/functions/agenda/", raiz);
  mkdirSync(fn, { recursive: true });
  cpSync(new URL("./agenda/agenda.mjs", import.meta.url), new URL("agenda.mjs", fn));
  cpSync(new URL("./agenda/core.mjs", import.meta.url), new URL("core.mjs", fn));
  writeFileSync(new URL("config.mjs", fn), `// gerado por build-all.mjs\nexport default ${JSON.stringify(agendaDe(site), null, 2)};\n`);
  writeFileSync(new URL("package.json", raiz), JSON.stringify({ name: `site-${site.slug}`, private: true, type: "module", dependencies: { "@netlify/blobs": "^11.1.11" } }, null, 2) + "\n");
  writeFileSync(new URL("netlify.toml", raiz), NETLIFY_TOML);
  console.log("ok", site.slug);
}
