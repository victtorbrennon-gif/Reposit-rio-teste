import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { SITES, TEMAS } from "./src/sites.js";

const slug = process.env.SITE || SITES[0].slug;
const site = SITES.find((s) => s.slug === slug);
if (!site) throw new Error(`Site desconhecido: ${slug}`);

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export default defineConfig({
  plugins: [
    react(),
    {
      name: "meta-da-barbearia",
      transformIndexHtml: { order: "pre", handler(html) {
        const vars = {
          TITLE: `${site.nome} · Barbearia em ${site.bairro}, Manaus`,
          DESC: `${site.nome}: barbearia em ${site.bairro}, Manaus. ${site.slogan} Agende pelo WhatsApp.`,
          OG_TITLE: site.nome,
          SLOGAN: site.slogan,
          ROBOTS: site.demo ? "noindex, nofollow" : "index, follow",
          THEME: (site.cores || TEMAS[site.tema]).bg,
          ICON: site.icone ? `/img/${site.icone}` : "/favicon.svg",
          ICONTYPE: site.icone ? "image/png" : "image/svg+xml",
        };
        return html.replace(/%(\w+)%/g, (m, k) => (k in vars ? esc(vars[k]) : m));
      } },
    },
  ],
  resolve: {
    // tema do cliente gerado pela fábrica (tema base + cor do logo); senão o tema base
    alias: { "@tema": fileURLToPath(new URL(existsSync(new URL(`./src/temas/gerado/${slug}.js`, import.meta.url)) ? `./src/temas/gerado/${slug}.js` : `./src/temas/${site.tema}.js`, import.meta.url)) },
  },
  define: { __SLUG__: JSON.stringify(slug) },
  build: {
    outDir: fileURLToPath(new URL(`../sites/${slug}/public`, import.meta.url)),
    emptyOutDir: true,
    assetsInlineLimit: 0, // nada de data: (a CSP só permite arquivos do próprio site)
    modulePreload: { polyfill: false },
  },
});
