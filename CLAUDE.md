# Projeto: sites para barbearias em Manaus

- Responda sempre em português do Brasil.
- Todo site de cliente DEVE seguir o checklist de `SEGURANCA.md`: site estático, HTTPS forçado, cabeçalhos de segurança (CSP, HSTS etc.), nenhum segredo no código, `rel="noopener noreferrer"` em links externos, e teste no securityheaders.com antes da entrega.
- Leads ficam em `leads-barbearias-manaus.md` e no painel online (https://claude.ai/artifact/J5a2NYbmwK8zD5dvRrYyu6).
- Sites são feitos em `sitebuilder/` (React + Framer Motion + Vite). Dados de cada barbearia em `sitebuilder/src/sites.js`; temas em `sitebuilder/src/temas/`. Gerar: `cd sitebuilder && npm install && npm run build` → sai em `sites/<slug>/` com `_headers` de segurança. Use a skill `ui-ux-pro-max` para escolher estilo, cores e fontes. Nada de CDN: fontes e scripts sempre locais (CSP `'self'`).
