// Dados de cada barbearia. Para um cliente novo: copie um bloco, ajuste e rode `npm run build`.
// demo: true = prévia (faixa de aviso, não indexa no Google, valores de exemplo).

export const AUTOR = "BR3NNOX";

export const SITES = [
  {
    slug: "barbearia-alfa",
    nome: "Barbearia Alfa",
    bairro: "Compensa",
    endereco: "Av. Oscar Borel, 102 – Compensa, Manaus – AM",
    telefone: "(92) 9138-4642",
    instagram: "",
    tema: "alfa",
    manifesto: "Aqui o corte sai na régua, do jeito que você pediu, sem fila e sem enrolação.",
    imagens: ["ambiente.jpg", "detalhe.jpg"],
    slogan: "Corte na régua, sem enrolação.",
    sobre:
      "Barbearia de bairro na Compensa, com atendimento rápido e corte bem feito. Chama no WhatsApp, escolhe o horário e vem.",
    servicos: [
      ["Corte masculino", "35"], ["Barba", "25"], ["Corte + barba", "55"],
      ["Pezinho e acabamento", "15"], ["Sobrancelha", "10"], ["Corte infantil", "30"],
    ],
    horarios: [["Segunda a sexta", "9h às 20h"], ["Sábado", "8h às 19h"], ["Domingo", "Fechado"]],
    demo: true,
  },
  {
    slug: "cheiro-verde",
    nome: "Barbearia Cheiro Verde",
    bairro: "Cidade Nova",
    endereco: "Rua Fraternidade, 36 – Cidade Nova 1, Manaus – AM",
    telefone: "(92) 99423-8806",
    instagram: "",
    tema: "verde",
    manifesto: "Senta, respira e deixa a gente cuidar do cabelo e da barba enquanto a resenha rola.",
    imagens: ["ambiente.jpg", "detalhe.jpg"],
    slogan: "Corte, barba e aquela resenha boa.",
    sobre:
      "Barbearia e tabacaria na Cidade Nova 1. Ambiente tranquilo para cortar o cabelo, fazer a barba e trocar uma ideia.",
    servicos: [
      ["Corte masculino", "30"], ["Barba na toalha quente", "25"], ["Corte + barba", "50"],
      ["Degradê", "35"], ["Pigmentação", "25"], ["Sobrancelha", "10"],
    ],
    horarios: [["Segunda a sexta", "9h às 20h"], ["Sábado", "9h às 18h"], ["Domingo", "Fechado"]],
    demo: true,
  },
  {
    slug: "navalhada",
    nome: "Navalhada Barbershop",
    bairro: "Adrianópolis",
    endereco: "Rua Belo Horizonte, 990 – Adrianópolis, Manaus – AM",
    telefone: "",
    instagram: "",
    tema: "navalha",
    manifesto: "Cada detalhe pensado, cada traço da navalha no lugar. Seu estilo merece esse cuidado.",
    imagens: ["ambiente.jpg", "detalhe.jpg"],
    slogan: "Precisão na navalha. Estilo que dura.",
    sobre:
      "Barbearia no coração de Adrianópolis para quem leva o visual a sério: corte técnico, barba desenhada e atendimento com hora marcada.",
    servicos: [
      ["Corte assinatura", "60"], ["Barba completa", "45"], ["Corte + barba", "95"],
      ["Platinado", "180"], ["Hidratação de barba", "35"], ["Dia do noivo", "250"],
    ],
    horarios: [["Segunda a sexta", "10h às 21h"], ["Sábado", "9h às 20h"], ["Domingo", "Fechado"]],
    demo: true,
  },
];

// cores do favicon e da barra do navegador
export const TEMAS = {
  alfa: { bg: "#0B0B0D", fg: "#E11D48" },
  verde: { bg: "#0E2A1E", fg: "#34D399" },
  navalha: { bg: "#0C0A09", fg: "#CA8A04" },
};
