# Padrão de segurança dos sites

Todo site de cliente feito neste projeto segue este checklist antes da entrega.

## 1. Estrutura
- [ ] Páginas estáticas (HTML/CSS/JS). A única parte com servidor é o **agendamento** (função `agenda` no Netlify).
- [ ] Agendamento: a API pública (`/api/agenda`) só mostra horários livres/ocupados, **nunca nome ou telefone** de clientes.
- [ ] Reserva com trava "só grava se não existir" por horário (dois clientes nunca pegam o mesmo horário). Testes em `sitebuilder/agenda/teste/`.
- [ ] Validação no servidor: serviço, dia dentro da janela, horário da grade, nome (2–60), telefone (10–13 dígitos), campo-isca contra robôs, máx. 2 reservas futuras por telefone, corpo até 2 KB.
- [ ] Limite de 40 pedidos/minuto por IP na função (rate limit do Netlify).
- [ ] Painel do barbeiro (`/admin`) protegido pela senha `ADMIN_TOKEN` (variável do Netlify, **nunca no código**), comparação em tempo constante, sem cache e sem indexação.
- [ ] Respostas da API com `Cache-Control: no-store`, `nosniff` e CSP própria (o `_headers` não vale para funções).
- [ ] Nenhuma senha, chave de API ou token no código ou no repositório.

## 2. Hospedagem e HTTPS
- [ ] Hospedar em Netlify, Vercel ou GitHub Pages, com HTTPS automático (cadeado).
- [ ] Forçar HTTPS: redirecionar `http://` para `https://`.
- [ ] Domínio com renovação automática e cadeado de transferência ativado no registro.

## 3. Cabeçalhos de segurança
Configurar em `_headers` (Netlify) ou `vercel.json` (Vercel):
- [ ] `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- [ ] `Content-Security-Policy` restrita: só o próprio site e as fontes/CDNs realmente usadas, mais `frame-ancestors 'none'`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- [ ] `X-Frame-Options: DENY`

## 4. Código
- [ ] Links externos com `target="_blank"` também levam `rel="noopener noreferrer"`.
- [ ] Scripts de terceiros só se forem necessários, com versão fixa e `integrity` (SRI).
- [ ] Nada de `innerHTML` com texto vindo de fora.
- [ ] Imagens otimizadas e sem dados de localização (EXIF) nas fotos.
- [ ] Mapa do Google por link, não por código copiado de sites desconhecidos.

## 5. Contas e acessos
- [ ] Verificação em duas etapas (2FA) no GitHub, na hospedagem e no registro do domínio.
- [ ] O Google Meu Negócio e o domínio ficam **no nome do cliente**. Nós somos só gerentes ou usuários.
- [ ] Senhas guardadas num gerenciador (Bitwarden, que é gratuito), nunca em conversa de WhatsApp.

## 6. LGPD
- [ ] Formulário de agendamento avisa: "Seu nome e WhatsApp são usados só para este agendamento".
- [ ] Dados de clientes só aparecem no painel do barbeiro (com senha).
- [ ] Se usar analytics ou pixel, incluir aviso de privacidade e banner de cookies.
- [ ] Sem analytics, não há coleta de dados e não é preciso banner.

## 7. Teste antes de entregar
- [ ] https://securityheaders.com → nota A ou A+
- [ ] https://developer.mozilla.org/en-US/observatory → nota A ou mais
- [ ] Abrir no celular e no computador: cadeado aparece, sem erros no console.
- [ ] Código salvo no Git (é o backup).
