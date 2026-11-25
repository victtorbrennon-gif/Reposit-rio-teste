// Servidor local para testar um site com o agendamento funcionando (sem publicar nada).
// Usa a função real do agendamento com um armazenamento em memória no lugar do Netlify Blobs.
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const TIPOS = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
export const SENHA_TESTE = "senha-de-teste-1234567890";

const BLOBS_FALSO = `const m = new Map();
export function getStore() { return {
  async setJSON(k, v, o = {}) { if (o.onlyIfNew && m.has(k)) return { modified: false }; m.set(k, JSON.stringify(v)); return { modified: true }; },
  async get(k) { return m.has(k) ? JSON.parse(m.get(k)) : null; },
  async delete(k) { m.delete(k); },
  async list({ prefix }) { return { blobs: [...m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; },
}; }`;

/** Sobe o site sites/<slug> em http://localhost:<porta>. */
export async function servir(raizSite, porta = 9600) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fabrica-"));
  const fnOrig = path.join(raizSite, "netlify/functions/agenda");
  for (const f of fs.readdirSync(fnOrig)) fs.copyFileSync(path.join(fnOrig, f), path.join(tmp, f));
  fs.mkdirSync(path.join(tmp, "node_modules/@netlify/blobs"), { recursive: true });
  fs.writeFileSync(path.join(tmp, "node_modules/@netlify/blobs/package.json"), '{"name":"@netlify/blobs","type":"module","main":"index.js"}');
  fs.writeFileSync(path.join(tmp, "node_modules/@netlify/blobs/index.js"), BLOBS_FALSO);
  fs.writeFileSync(path.join(tmp, "package.json"), '{"type":"module"}');
  globalThis.Netlify = { env: { get: (k) => (k === "ADMIN_TOKEN" ? SENHA_TESTE : undefined) } };
  const { default: handler } = await import(pathToFileURL(path.join(tmp, "agenda.mjs")).href);
  const pub = path.join(raizSite, "public");
  const srv = http.createServer(async (q, r) => {
    const u = new URL(q.url, "http://x");
    if (u.pathname.startsWith("/api/")) {
      const body = await new Promise((ok) => { let b = ""; q.on("data", (c) => (b += c)); q.on("end", () => ok(b)); });
      const res = await handler(new Request("http://x" + q.url, { method: q.method, headers: q.headers, body: ["GET", "HEAD"].includes(q.method) ? undefined : body }));
      r.writeHead(res.status, Object.fromEntries(res.headers)); r.end(await res.text()); return;
    }
    let p = path.join(pub, decodeURIComponent(u.pathname));
    if (!p.startsWith(pub)) { r.writeHead(403); return r.end(); }
    if (p.endsWith("/")) p += "index.html";
    if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { "Content-Type": TIPOS[path.extname(p)] || "application/octet-stream", "Content-Security-Policy": CSP });
    r.end(fs.readFileSync(p));
  });
  await new Promise((ok) => srv.listen(porta, ok));
  const url = `http://localhost:${porta}/`;
  const api = (caminho, opcoes) => fetch(url + caminho.replace(/^\//, ""), opcoes).then((x) => x.json());
  return { url, api, fechar: () => { srv.close(); fs.rmSync(tmp, { recursive: true, force: true }); } };
}
