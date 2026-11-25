// Lê o ficha.txt de um cliente e transforma na configuração do site.
// Formato pensado para ser preenchido até pelo celular (veja clientes/MODELO/ficha.txt).

const DIAS = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6, "sáb": 6 };
const NOMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const SIM = /^(sim|s|yes|true|1)$/i;

const hora = (s) => {
  const m = String(s ?? "").trim().toLowerCase().replace(/\s+/g, "").match(/^(\d{1,2})(?:[:h](\d{2})?)?h?$/);
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2] || 0);
  if (h > 24 || mi > 59 || mi % 5) return null;
  return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
};
const hm = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };

function dias(txt) {
  const t = txt.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const out = new Set();
  // "seg a sex" ou "segunda - sexta" -> "seg-sex"; nomes completos viram as 3 primeiras letras
  const limpo = t.replace(/-feira/g, "").replace(/\s+a\s+/g, "-").replace(/\s*[-–]\s*/g, "-");
  for (const parte of limpo.split(/[,;\s]+/).filter(Boolean)) {
    const pedacos = parte.split("-").map((x) => x.slice(0, 3));
    if (pedacos.length > 2) return null;
    const [a, b] = pedacos;
    if (!(a in DIAS) || (b && !(b in DIAS))) return null;
    if (!b) { out.add(DIAS[a]); continue; }
    for (let d = DIAS[a]; ; d = (d + 1) % 7) { out.add(d); if (d === DIAS[b]) break; }
  }
  return [...out];
}

export { horariosTexto } from "../agenda/core.mjs";

/** Lê a ficha. Retorna { dados, erros[], avisos[] }. */
export function lerFicha(texto, slug) {
  const erros = [], avisos = [];
  const campos = {}, servicos = [], abertura = {};
  let secao = null;
  texto.split(/\r?\n/).forEach((linha0, i) => {
    const linha = linha0.replace(/#.*$/, "").trim();
    const n = i + 1;
    if (!linha) return;
    const kv = linha.match(/^([a-zçãéíóú_ ]+):\s*(.*)$/i);
    if (kv && !linha.includes("|")) {
      const chave = kv[1].trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "_");
      secao = null;
      if (chave === "servicos" || chave === "horarios") { secao = chave; return; }
      campos[chave] = kv[2].trim();
      return;
    }
    if (secao === "servicos") {
      const [nome, preco, tempo] = linha.split("|").map((x) => x.trim());
      const p = Number(String(preco).replace(/r\$|\s/gi, "").replace(",", "."));
      const d = Number(String(tempo).replace(/min/i, "").trim());
      if (!nome || !Number.isFinite(p) || !Number.isInteger(d) || d < 5 || d > 300) erros.push(`Linha ${n}: serviço deve ser "Nome | preço | minutos" (ex.: Corte | 35 | 30)`);
      else servicos.push([nome, String(p), Math.ceil(d / 5) * 5]);
      return;
    }
    if (secao === "horarios") {
      const [quando, ab, fe] = linha.split("|").map((x) => x.trim());
      const ds = dias(quando || "");
      if (!ds) { erros.push(`Linha ${n}: dia não reconhecido em "${quando}" (use seg, ter, qua, qui, sex, sab, dom ou seg-sex)`); return; }
      if (/fechad/i.test(ab || "")) { ds.forEach((d) => (abertura[d] = null)); return; }
      const a = hora(ab), f = hora(fe);
      if (!a || !f || hm(f) - hm(a) < 30) { erros.push(`Linha ${n}: horário deve ser "dias | abre | fecha" (ex.: seg-sex | 09:00 | 20:00)`); return; }
      ds.forEach((d) => (abertura[d] = [a, f]));
      return;
    }
    avisos.push(`Linha ${n} ignorada: "${linha}"`);
  });

  const obrig = { nome: "nome", bairro: "bairro", endereco: "endereço" };
  for (const [k, rot] of Object.entries(obrig)) if (!campos[k]) erros.push(`Falta o ${rot} (linha "${rot}: ...")`);
  if (!servicos.length) erros.push(`Falta a lista de serviços (seção "servicos:")`);
  const aberto = Object.fromEntries(Object.entries(abertura).filter(([, v]) => v));
  if (!Object.keys(aberto).length) erros.push(`Falta a lista de horários (seção "horarios:")`);

  const tel = (campos.whatsapp || campos.telefone || "").trim();
  const dig = tel.replace(/\D/g, "");
  if (!tel) avisos.push("Sem WhatsApp: o site não vai ter o botão de enviar a confirmação.");
  else if (dig.length < 10 || dig.length > 13) erros.push(`WhatsApp inválido: "${tel}" (use DDD, ex.: (92) 99999-9999)`);
  else if (dig.replace(/^55/, "").length === 10) avisos.push(`O número ${tel} tem 8 dígitos depois do DDD: parece fixo e pode não ter WhatsApp.`);

  let pausa = null;
  if (campos.pausa) {
    const [a, f] = campos.pausa.split(/[-–]|\s+a\s+/).map(hora);
    if (!a || !f || hm(f) <= hm(a)) erros.push(`Pausa inválida: "${campos.pausa}" (ex.: 12:00-13:00)`);
    else pausa = [a, f];
  }
  const estilo = (campos.estilo || "auto").toLowerCase();
  if (!["auto", "urbano", "classico", "clássico", "premium"].includes(estilo)) erros.push(`Estilo "${campos.estilo}" não existe (use auto, urbano, classico ou premium)`);

  return {
    erros,
    avisos,
    dados: {
      slug,
      nome: campos.nome,
      bairro: campos.bairro,
      endereco: campos.endereco,
      telefone: tel,
      instagram: campos.instagram || "",
      estilo: estilo.replace("clássico", "classico"),
      slogan: campos.slogan || "",
      sobre: campos.sobre || "",
      manifesto: campos.manifesto || "",
      demo: campos.demo ? SIM.test(campos.demo) : true,
      fotosIlustrativas: campos.fotos_ilustrativas ? SIM.test(campos.fotos_ilustrativas) : false,
      cor: campos.cor || "",
      servicos,
      abertura: aberto,
      pausa,
    },
  };
}
