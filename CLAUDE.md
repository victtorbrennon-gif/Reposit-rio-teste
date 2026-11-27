# Projeto: sites para barbearias em Manaus

- **Numa conversa nova, leia primeiro `ESTADO-DO-PROJETO.md`** (links, regras combinadas, o que já está pronto e o próximo passo).
- Responda sempre em português do Brasil.
- Todo site de cliente DEVE seguir o checklist de `SEGURANCA.md`: site estático, HTTPS forçado, cabeçalhos de segurança (CSP, HSTS etc.), nenhum segredo no código, `rel="noopener noreferrer"` em links externos, e teste no securityheaders.com antes da entrega.
- **Central BR3NNOX** (app único: meta, passos, lembretes, clientes com a venda por etapas e o criador de sites que roda a fábrica no PC): https://claude.ai/artifact/J5a2NYbmwK8zD5dvRrYyu6 (coleções `clientes`, `passos`, `lembretes`, `config`). Leads também em `leads-barbearias-manaus.md`.
- **Fábrica de sites:** cada cliente é uma pasta `clientes/<slug>/` com `ficha.txt`, `logo.*` e `fotos/` (veja `clientes/LEIA-ME.md` e o modelo em `clientes/MODELO/ficha.txt`). Rodar: `cd sitebuilder && npm run fabrica -- <slug>` (lê a ficha, trata logo/fotos, escolhe estilo/cor pelo logo, gera textos, monta, testa e tira prints em `clientes/<slug>/previa/`; `--video` grava demonstração; `--todos` remonta todos). Nunca edite `src/clientes.gerado.js` nem `clientes/*/site.json` à mão. Saída em `sites/<slug>/` (public + função) com `_headers` de segurança. Use a skill `ui-ux-pro-max` para escolher estilo, cores e fontes. Nada de CDN: fontes e scripts sempre locais (CSP `'self'`).
- Mensagem de barbeiro colada no chat ("o que respondo?"): use a skill `persuasao-barbearias`.
- Fontes e animações de texto: siga a skill `tipografia-barbearias` (`.claude/skills/tipografia-barbearias/SKILL.md`).
- Imagens: geradas no Canva (conector) e exportadas em JPG; ficam em `sitebuilder/public-imgs/<slug>/`, otimizadas e sem metadados. Em demonstração, sempre com a legenda "Imagem ilustrativa".
- **Cada modificação feita nos sites vira um lembrete** na coleção `lembretes` do painel (ArtifactData, campos: titulo, detalhe, site, data ISO, visto:false).
- Agendamento online: regras em `sitebuilder/agenda/core.mjs` (testes: `cd sitebuilder && npm test`), função em `sitebuilder/agenda/agenda.mjs`, painel do barbeiro em `sitebuilder/admin/`. Duração dos serviços = 3º item de `servicos` em `sites.js`; horários em `abertura`. Senha do painel = variável `ADMIN_TOKEN` no Netlify (nunca no repositório).
