// Gera todos os sites em ../sites/<slug>/ com cabeçalhos de segurança e favicon.
// Uso: npm run build            (todos)
//      SITE=navalhada npm run build   (só um)
import { build } from "vite";
import { writeFileSync } from "node:fs";
import { SITES, TEMAS } from "./src/sites.js";

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
`;

const favicon = ({ bg, fg }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${bg}"/><g fill="none" stroke="${fg}" stroke-width="4" stroke-linecap="round"><circle cx="20" cy="20" r="7"/><circle cx="20" cy="44" r="7"/><path d="M25 25 32 32M48 16 25 39M38 38 48 48"/></g></svg>`;

const alvo = process.env.SITE;
for (const site of SITES.filter((s) => !alvo || s.slug === alvo)) {
  process.env.SITE = site.slug;
  await build({ configFile: new URL("./vite.config.js", import.meta.url).pathname, logLevel: "warn" });
  const out = new URL(`../sites/${site.slug}/`, import.meta.url);
  writeFileSync(new URL("_headers", out), HEADERS + (site.demo ? "/*\n  X-Robots-Tag: noindex, nofollow\n" : ""));
  writeFileSync(new URL("favicon.svg", out), favicon(TEMAS[site.tema]));
  console.log("ok", site.slug);
}
