# Estado do projeto (leia primeiro numa conversa nova)

Última atualização: 27/11/2026.

## Meta
Ganhar R$ 5.000 entre 25/11 e 24/12/2026 vendendo sites com agendamento para barbearias de Manaus.
Abordagem só por WhatsApp. Preços: Completo R$ 897 + R$ 79/mês · Site R$ 497 · unidade extra R$ 597 ·
sinal de 50% no Pix · entrega em até 3 dias úteis.

## Links (Artifacts do Claude, privados)
- Central de Fechamento (venda por etapas, mensagens prontas, acompanhamento dias 2/5/10):
  https://claude.ai/artifact/WYAVWjNBCuZRTqXjrf3fj3 (coleções `negociacoes` e `config/geral`)
- Painel de leads e lembretes: https://claude.ai/artifact/J5a2NYbmwK8zD5dvRrYyu6 (coleção `lembretes`)
- Kit de vendas (Claude Docs): https://claude.ai/artifact/VhawzG67ZTCcySsE4rpLb4
- Design system BR3NNOX: https://claude.ai/artifact/Wggr3YFmKXLY1ChPqD4ju8

## O que já está pronto
- Fábrica de sites (`clientes/<slug>/` + `cd sitebuilder && npm run fabrica -- <slug>`), ver `CLAUDE.md` e `clientes/LEIA-ME.md`.
- Agendamento em conversa (estilo inBarber) com trava de horário em tempo real, confirmação no WhatsApp.
- Painel do barbeiro em `/admin` (fechar dia, horário do dia, dias/horários da semana, cancelar, bloquear).
- Prévias: `barbearia-alfa` (logo HD), `cheiro-verde`, `navalhada`.
- Portfólio BR3NNOX: fonte em `portfolio/` (textos em `index.html`, contato em `dados.json`), montar com
  `cd sitebuilder && npm run portfolio` (saída `sites/portfolio/public`, noindex até aprovar; `-- --publico` libera). Não publicado.
- Atalhos para Windows: `instalar.bat`, `novo-cliente.bat`, `fabrica.bat`, guia `COMO-USAR-NO-PC.md`.

## Regras combinadas com o usuário
- Responder em português do Brasil.
- **Não publicar no Netlify sem o usuário aprovar** (cada deploy gasta ~15 créditos).
  Os links do Netlify ainda mostram a versão antiga (formulário); a versão com conversa e fábrica não foi publicada.
- Sites ficam privados (SSO do Netlify) até o usuário dizer "pode liberar".
- Logo do cliente: só melhorar a qualidade, nunca mudar o desenho.
- Cada modificação nos sites vira lembrete no painel.
- Segurança: seguir `SEGURANCA.md`. `ADMIN_TOKEN` só no Netlify.

## A confirmar com o usuário
- WhatsApp e Instagram do próprio usuário para o portfólio (`portfolio/dados.json`).
- WhatsApp real da Alpha (o (92) 9138-4642 parece fixo) e da Navalhada.
- Se a "Alpha" do logo é a "Barbearia Alfa" da Compensa.
- Marca BR3NNOX no rodapé dos sites, durações dos serviços e preços finais.

## Próximo passo
Hoje (27/11): primeiro contato com o primeiro cliente usando a Central de Fechamento.
Quando fechar: criar `clientes/<slug>/` com o material recebido, rodar a fábrica, pedir aprovação e publicar.
