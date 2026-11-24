# Padrão de segurança dos sites

Todo site de cliente feito neste projeto segue este checklist antes da entrega.

## 1. Estrutura
- [ ] Site estático (HTML/CSS/JS), sem banco de dados nem painel de login. Assim quase não há o que invadir.
- [ ] Contato e agendamento por link do WhatsApp (`https://wa.me/55...`). Não há formulário guardando dados no nosso servidor.
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
- [ ] Se usar analytics ou pixel, incluir aviso de privacidade e banner de cookies.
- [ ] Sem analytics, não há coleta de dados e não é preciso banner.

## 7. Teste antes de entregar
- [ ] https://securityheaders.com → nota A ou A+
- [ ] https://developer.mozilla.org/en-US/observatory → nota A ou mais
- [ ] Abrir no celular e no computador: cadeado aparece, sem erros no console.
- [ ] Código salvo no Git (é o backup).
