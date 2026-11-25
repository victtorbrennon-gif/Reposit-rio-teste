// Escolhe estilo, cores e textos de um cliente a partir da ficha e do logo.

// Estilos disponíveis -> tema base (fontes, animação assinatura, fundo)
export const ESTILOS = {
  urbano: { tema: "alfa", bg: "#0B0B0D", fg: "#E11D48", fundoEscuro: true },
  classico: { tema: "verde", bg: "#0E2A1E", fg: "#34D399", fundoEscuro: false }, // fundo creme
  premium: { tema: "navalha", bg: "#0C0A09", fg: "#CA8A04", fundoEscuro: true },
};

const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgb2hex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const lum = (c) => {
  const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
function hsl(c) {
  const [r, g, b] = c.map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function deHsl([h, s, l]) {
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)].map((v) => v * 255);
}

/** Ajusta a cor do logo para ter contraste com o fundo do estilo. */
export function acentoLegivel(hex, fundoEscuro) {
  let [h, s, l] = hsl(hex2rgb(hex));
  s = Math.max(s, 0.45);
  if (fundoEscuro) while (lum(deHsl([h, s, l])) < 0.16 && l < 0.85) l += 0.03;
  else while (lum(deHsl([h, s, l])) > 0.16 && l > 0.15) l -= 0.03;
  const c = deHsl([h, s, l]);
  return { acento: rgb2hex(c), tinta: lum(c) > 0.4 ? "#121212" : "#FFFFFF", glow: `rgba(${c.map(Math.round).join(",")},.2)` };
}

/** Estilo: o que a ficha pediu, senão decide pelo logo. */
export function escolherEstilo(pedido, corLogo, logoClaro) {
  if (pedido && pedido !== "auto") return { estilo: pedido, motivo: "escolhido na ficha" };
  if (!corLogo) return logoClaro === false
    ? { estilo: "classico", motivo: "logo escuro: fica melhor em fundo claro" }
    : { estilo: "urbano", motivo: "logo claro/prateado: fica melhor em fundo escuro" };
  const [h] = hsl(hex2rgb(corLogo));
  if (h >= 30 && h <= 58) return { estilo: "premium", motivo: `logo dourado/amarelo (${corLogo})` };
  if (h > 75 && h <= 170) return { estilo: "classico", motivo: `logo verde (${corLogo})` };
  return { estilo: "urbano", motivo: `cor do logo ${corLogo}` };
}

// Textos padrão por estilo (3 variações; escolhe pelo nome para não repetir entre clientes)
const TEXTOS = {
  urbano: [
    { slogan: "Corte na régua, sem enrolação.", sobre: "Barbearia em {bairro}, com atendimento rápido e corte bem feito. Agende online, escolha o horário e venha.", manifesto: "Aqui o corte sai na régua, do jeito que você pediu, sem fila e sem enrolação." },
    { slogan: "Seu corte, seu estilo, na hora marcada.", sobre: "A {nome} atende em {bairro} com degradê caprichado e barba alinhada. Marque online em menos de 1 minuto.", manifesto: "Chega de esperar na cadeira: você escolhe o horário e o seu corte sai do jeito que você imaginou." },
    { slogan: "Visual na régua todo dia.", sobre: "Corte, barba e acabamento em {bairro}. Veja os horários livres e garanta o seu sem precisar chamar ninguém.", manifesto: "Cada detalhe do seu visual tratado com atenção, do pezinho à barba, sem pressa e sem fila." },
  ],
  classico: [
    { slogan: "Corte, barba e aquela resenha boa.", sobre: "Barbearia em {bairro}. Ambiente tranquilo para cortar o cabelo, fazer a barba e trocar uma ideia.", manifesto: "Senta, respira e deixa a gente cuidar do cabelo e da barba enquanto a resenha rola." },
    { slogan: "Tradição de barbearia, do jeito certo.", sobre: "A {nome} une o clássico e o moderno em {bairro}: toalha quente, navalha e atendimento sem pressa.", manifesto: "Barbearia de verdade é lugar de conversa boa, cuidado com o detalhe e cliente que sai sorrindo." },
    { slogan: "O seu lugar de cuidar do visual.", sobre: "Corte e barba com calma e capricho em {bairro}. Agende online e chegue no horário certo.", manifesto: "Aqui ninguém tem pressa: cada cliente é atendido com cuidado, do primeiro corte à barba." },
  ],
  premium: [
    { slogan: "Precisão na navalha. Estilo que dura.", sobre: "Barbearia em {bairro} para quem leva o visual a sério: corte técnico, barba desenhada e hora marcada.", manifesto: "Cada detalhe pensado, cada traço da navalha no lugar. Seu estilo merece esse cuidado." },
    { slogan: "Experiência de barbearia, à sua altura.", sobre: "A {nome} oferece atendimento exclusivo em {bairro}, com profissionais experientes e agenda online.", manifesto: "Um espaço feito para você: atendimento sem pressa, acabamento impecável e horário garantido." },
    { slogan: "Seu visual, no padrão mais alto.", sobre: "Corte, barba e tratamentos em {bairro}, com atendimento personalizado do começo ao fim.", manifesto: "Excelência em cada corte, cuidado em cada detalhe. É assim que a gente trata o seu estilo." },
  ],
};
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export function textos(estilo, dados) {
  const base = TEXTOS[estilo][hash(dados.nome) % 3];
  const fill = (t) => t.replaceAll("{bairro}", dados.bairro).replaceAll("{nome}", dados.nome);
  return {
    slogan: dados.slogan || base.slogan,
    sobre: dados.sobre || fill(base.sobre),
    manifesto: dados.manifesto || base.manifesto,
  };
}
