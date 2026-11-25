---
name: tipografia-barbearias
description: Escolha de fontes, escala tipográfica e animações de texto para os sites de barbearia do projeto (sitebuilder/). Use sempre que for criar ou mudar um site de cliente, trocar fonte, ajustar títulos, ou animar letras e palavras. Traz o catálogo de pares de fontes por estilo de barbearia, a regra de instalar fontes localmente (sem CDN, por causa da CSP) e os componentes de texto animado prontos em sitebuilder/src/Tipografia.jsx.
---

# Tipografia dos sites de barbearia

Fonte é metade da identidade de uma barbearia. Siga esta ordem sempre.

## 1. Escolha o estilo da barbearia e o par de fontes

Cada site usa **duas fontes**: uma de **título** (com personalidade) e uma de **texto** (fácil de ler no celular). No máximo 3 pesos no total.

| Estilo | Quando usar | Título | Texto | Pacotes (npm) |
|---|---|---|---|---|
| **Urbano / periferia forte** | bairro, preço acessível, público jovem | Anton (caixa alta) | Rubik 400/700 | `@fontsource/anton` `@fontsource/rubik` |
| **Clássico / old school** | barbearia tradicional, tabacaria, resenha | DM Serif Display | Didact Gothic | `@fontsource/dm-serif-display` `@fontsource/didact-gothic` |
| **Premium / grife** | ticket alto, Adrianópolis, Ponta Negra, Vieiralves | Cormorant 500/600 | Montserrat 400/600 | `@fontsource/cormorant` `@fontsource/montserrat` |
| **Vintage americano** | barbearia temática anos 50, tatuagem | Rye ou Bebas Neue | Barlow | `@fontsource/bebas-neue` `@fontsource/barlow` |
| **Moderno minimalista** | studio, unissex, design clean | Syne 700 | Inter | `@fontsource/syne` `@fontsource/inter` |
| **Tropical / amazônico** | identidade regional, cores vivas | Fraunces (variável) | Nunito Sans | `@fontsource-variable/fraunces` `@fontsource/nunito-sans` |

Regras:
- Use o nome da barbearia e o público para decidir. Na dúvida, rode a skill `ui-ux-pro-max` (`--domain typography`) e cruze com esta tabela.
- **Nunca** use Google Fonts por link nem CDN. Instale com `npm install @fontsource/<nome>` em `sitebuilder/` e importe só o subconjunto latino e os pesos usados, no arquivo do tema (`src/temas/<tema>.js`):
  `import "@fontsource/anton/latin-400.css";`
  O subconjunto `latin` já cobre todos os acentos do português (ã, ç, é, ô).
- Sempre declare a pilha de reserva no token: `--f-display:"Anton",Impact,"Arial Narrow",sans-serif`.

## 2. Escala e ajustes (tokens em `src/styles.css` e no tema)

- `h1`: `clamp(2.7rem, 9vw, 6rem)`; `h2`: `clamp(2rem, 5.5vw, 3.4rem)`; texto: 17px no celular (mínimo 16px).
- Altura de linha: títulos 1.0–1.1, texto 1.55–1.7. Linha de texto com até ~65 caracteres.
- Fonte condensada em caixa alta (Anton, Bebas): `--h1-case:uppercase`, `--h-track:.005em`.
- Serifadas grandes (Cormorant, DM Serif): `--h-track:-.015em`, peso 500–600.
- Rótulos pequenos (eyebrow): caixa alta, `letter-spacing:.16em` a `.28em`.
- Preços e horários: `font-variant-numeric: tabular-nums`.
- Títulos com `text-wrap: balance`.
- Teste os acentos: um título com "Ã", "Ç" e "É" não pode ter nada cortado. As máscaras de animação usam `padding` com `margin` negativa para isso, então não remova.

## 3. Animações de texto disponíveis

Ficam em `sitebuilder/src/Tipografia.jsx` (e as antigas em `Efeitos.jsx`). Todas respeitam "reduzir movimento" do sistema.

| Componente | Efeito | Onde usar |
|---|---|---|
| `Palavras` (App.jsx) | palavras sobem de uma máscara | título principal |
| `TituloLetras` (Efeitos.jsx) | letra por letra ao entrar na tela | títulos de seção |
| `TituloNavalha` (Efeitos.jsx) | lâmina corta e revela + brilho dourado | tema premium |
| `Embaralhado` | letras sorteadas que "decodificam" até a palavra certa | eyebrow, rótulos curtos |
| `TextoAcende` | frase longa que acende palavra por palavra conforme a rolagem | manifesto da barbearia |
| `LetrasPulam` | letras pulam em onda ao passar o mouse | nome da marca no topo |
| `Contador` | número sobe de 0 até o valor ao aparecer | preços |

Limites: um efeito de destaque por seção. Texto do corpo (parágrafos) nunca anima letra por letra, só entra junto (fade + sobe).

## 4. Checklist antes de entregar
- [ ] Par de fontes escolhido pela tabela, no máximo 3 pesos.
- [ ] Fontes locais (`@fontsource`), nada externo, e a CSP continua `font-src 'self'`.
- [ ] Acentos do título conferidos no print (sem corte).
- [ ] Texto legível no celular a 390px.
- [ ] Animações conferidas com "reduzir movimento" ligado.
