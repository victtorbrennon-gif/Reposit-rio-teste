// Configurações comuns a todos os sites.

export const AUTOR = "BR3NNOX";

// Os clientes agora vêm da FÁBRICA: cada um é uma pasta em clientes/<cliente>/ com ficha.txt, logo e fotos.
// Para criar ou mudar um cliente: npm run fabrica -- <cliente>   (veja clientes/LEIA-ME.md)
import { CLIENTES } from "./clientes.gerado.js";
export const SITES = CLIENTES;

// Configuração da agenda usada pelo servidor e pelo site.
export function agendaDe(site) {
  return {
    intervalo: 30,        // minutos entre um horário e outro
    dias: 14,             // quantos dias à frente dá para marcar
    antecedencia: 30,     // minutos mínimos de antecedência para marcar hoje
    maxPorTelefone: 2,    // reservas futuras por telefone
    abertura: site.abertura,
    pausa: site.pausa || null,
    servicos: site.servicos.map(([nome, preco, duracao]) => ({ nome, preco, duracao })),
  };
}

export const TEMAS = {
  alfa: { bg: "#0B0B0D", fg: "#E11D48" },
  verde: { bg: "#0E2A1E", fg: "#34D399" },
  navalha: { bg: "#0C0A09", fg: "#CA8A04" },
};
