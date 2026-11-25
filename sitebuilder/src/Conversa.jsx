// Agendamento em formato de conversa: o "assistente" da barbearia pergunta e o cliente responde tocando.
// Nome -> serviços (vários) -> dia -> horário livre (encaixe exato) -> WhatsApp -> resumo -> confirmado.
// Os horários se atualizam sozinhos a cada 15s; quem decide de verdade é o servidor (vaga única).
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { proximosDias, dataLonga, duracaoTxt, MAX_SERVICOS } from "../agenda/core.mjs";
import { agendaDe } from "./sites.js";

const API = "/api/agenda";
const SPRING = { type: "spring", stiffness: 380, damping: 28 };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
let seq = 0;

function mascaraTel(v) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
const primeiro = (n) => n.trim().split(/\s+/)[0];
const brl = (v) => `R$ ${Number(v).toLocaleString("pt-BR")}`;

const IcoEnviar = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
);
const IcoCheck = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
);
const IcoTesoura = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12" /></svg>
);

export default function Conversa({ site, waNumero, logo }) {
  const cfg = useMemo(() => agendaDe(site), [site]);
  const caixa = useRef(null);
  const lista = useRef(null);
  const visivel = useInView(caixa, { once: true, amount: 0.3 });

  const [msgs, setMsgs] = useState([]);
  const [digitando, setDigitando] = useState(false);
  const [etapa, setEtapa] = useState(null); // nome | servicos | dia | hora | tel | resumo | enviando | ok
  const [texto, setTexto] = useState("");
  const [isca, setIsca] = useState("");
  const [nome, setNome] = useState("");
  const [tel, setTel] = useState("");
  const [sel, setSel] = useState([]);          // índices dos serviços
  const [dias, setDias] = useState(null);       // resumo de livres por dia
  const [dia, setDia] = useState(null);
  const [horas, setHoras] = useState(null);
  const [hora, setHora] = useState(null);
  const [atualizado, setAtualizado] = useState(null);
  const [reserva, setReserva] = useState(null);
  const ocupado = useRef(false);

  const pac = useMemo(() => {
    const itens = sel.map((i) => cfg.servicos[i]);
    return { nomes: itens.map((s) => s.nome), preco: itens.reduce((t, s) => t + Number(s.preco), 0), duracao: itens.reduce((t, s) => t + s.duracao, 0) };
  }, [sel, cfg]);
  const fim = (h) => { const [a, b] = h.split(":").map(Number); const m = a * 60 + b + pac.duracao; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };

  // ---- conversa ----
  const add = (de, conteudo) => setMsgs((m) => [...m, { id: ++seq, de, ...conteudo }]);
  async function bot(...falas) {
    for (const f of falas) {
      setDigitando(true);
      await espera(Math.min(1100, 450 + (typeof f === "string" ? f.length * 12 : 300)));
      setDigitando(false);
      add("bot", typeof f === "string" ? { texto: f } : f);
      await espera(120);
    }
  }
  const eu = (t) => add("eu", { texto: t });

  useEffect(() => {
    const el = lista.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs, digitando, etapa, horas, dias]);

  useEffect(() => {
    if (!visivel || etapa) return;
    (async () => {
      setEtapa("...");
      await bot(`Olá! 👋 Eu sou o assistente da ${site.nome}.`, "Vou marcar seu horário em menos de 1 minuto. Qual o seu nome?");
      setEtapa("nome");
    })();
  }, [visivel]);

  // ---- servidor ----
  async function carregarDias() {
    setDias(null);
    try {
      const r = await fetch(`${API}?resumo=1&servicos=${sel.join(",")}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw 0;
      setDias(Object.fromEntries(j.dias.map((d) => [d.data, d.livres])));
    } catch {
      setDias({}); // mostra os dias mesmo sem o resumo
    }
  }
  async function carregarHoras(silencioso) {
    if (!silencioso) setHoras(null);
    try {
      const r = await fetch(`${API}?data=${dia}&servicos=${sel.join(",")}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw 0;
      setHoras(j.horarios.map((h) => h.hora));
      setAtualizado(new Date());
      return j.horarios.map((h) => h.hora);
    } catch {
      if (!silencioso) setHoras([]);
      return null;
    }
  }

  // tempo real: enquanto o cliente escolhe horário, digita o WhatsApp ou revisa
  useEffect(() => {
    if (!["hora", "tel", "resumo"].includes(etapa) || !dia) return;
    const tick = async () => {
      if (document.visibilityState !== "visible" || ocupado.current) return;
      const livres = await carregarHoras(true);
      if (livres && hora && etapa !== "hora" && !livres.includes(hora)) perdeuHorario();
    };
    const id = setInterval(tick, 15000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, [etapa, dia, hora]);

  async function perdeuHorario() {
    ocupado.current = true;
    setHora(null);
    setEtapa("...");
    await bot("Eita! Alguém acabou de pegar esse horário 😅", "Separei os que ainda estão livres:");
    await carregarHoras();
    setEtapa("hora");
    ocupado.current = false;
  }

  // ---- ações do cliente ----
  async function enviarTexto(e) {
    e.preventDefault();
    // tira o foco do campo: senão o navegador rola a página atrás dele quando a conversa cresce
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    if (etapa === "nome") {
      const n = texto.trim().replace(/\s+/g, " ").slice(0, 60);
      if (n.length < 2) return;
      setNome(n); setTexto(""); eu(n); setEtapa("...");
      await bot(`Prazer, ${primeiro(n)}! O que você vai fazer? Pode escolher mais de um ✂️`);
      setEtapa("servicos");
    } else if (etapa === "tel") {
      const d = texto.replace(/\D/g, "");
      if (d.length < 10) { await bot("Hmm, acho que faltou número. Manda com DDD, tipo (92) 99999-9999."); return; }
      setTel(texto); setTexto(""); eu(texto); setEtapa("...");
      await bot("Fechou! Confere se está tudo certo:", { tipo: "resumo" });
      setEtapa("resumo");
    }
  }

  async function escolherServicos() {
    if (!sel.length) return;
    eu(pac.nomes.join(" + "));
    setEtapa("...");
    carregarDias();
    await bot(`Boa! Isso leva ${duracaoTxt(pac.duracao)} e fica ${brl(pac.preco)}. Qual dia fica melhor?`);
    setEtapa("dia");
  }

  async function escolherDia(d) {
    setDia(d.data); setHora(null); setHoras(null);
    eu(d.rotulo === "Hoje" || d.rotulo === "Amanhã" ? `${d.rotulo}, ${dataLonga(d.data).split(", ")[1]}` : dataLonga(d.data));
    setEtapa("...");
    await bot(`Esses são os horários livres de ${dataLonga(d.data).toLowerCase()} 👇`);
    setEtapa("hora");
  }
  useEffect(() => { if (etapa === "hora" && dia && horas === null) carregarHoras(); }, [etapa, dia]);

  async function escolherHora(h) {
    setHora(h);
    eu(`${h} às ${fim(h)}`);
    setEtapa("...");
    if (tel) {
      await bot("Fechou! Confere se está tudo certo:", { tipo: "resumo" });
      setEtapa("resumo");
    } else {
      await bot("Perfeito! Qual o seu WhatsApp? É pra te mandar a confirmação.");
      setEtapa("tel");
    }
  }

  async function alterar() {
    eu("Quero mudar algo");
    setEtapa("..."); setDia(null); setHoras(null); setHora(null);
    await bot("Sem problema! O que você vai fazer?");
    setEtapa("servicos");
  }

  async function confirmar() {
    ocupado.current = true;
    eu("Confirmar agendamento");
    setEtapa("enviando");
    setDigitando(true);
    try {
      const r = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: dia, hora, servicos: sel, nome, telefone: tel, empresa: isca }),
      });
      const j = await r.json();
      setDigitando(false);
      if (r.status === 409) { ocupado.current = false; return perdeuHorario(); }
      if (!r.ok) { await bot(j.erro || "Não consegui agendar agora."); setEtapa("resumo"); return; }
      setReserva(j.reserva);
      await bot(`Prontinho, ${primeiro(nome)}! Seu horário está reservado ✅`, { tipo: "ok" });
      setEtapa("ok");
    } catch {
      setDigitando(false);
      await bot("Fiquei sem conexão 😕 Tenta confirmar de novo em instantes.");
      setEtapa("resumo");
    } finally {
      ocupado.current = false;
    }
  }

  async function denovo() {
    setSel([]); setDia(null); setHoras(null); setHora(null); setReserva(null);
    eu("Fazer outro agendamento");
    setEtapa("...");
    await bot("Bora! O que você vai fazer dessa vez?");
    setEtapa("servicos");
  }

  // ---- peças da conversa ----
  const linkWa = reserva && waNumero
    ? `https://wa.me/${waNumero}?text=${encodeURIComponent(
        `Olá, ${site.nome}! Acabei de agendar pelo site:\n✂️ ${reserva.servico} (${brl(reserva.preco)})\n📅 ${dataLonga(reserva.data)}\n🕒 ${reserva.hora} às ${reserva.fim}\n👤 ${reserva.nome}\nCódigo: ${reserva.id}`
      )}`
    : null;

  const Resumo = () => (
    <div className="cv-cartao">
      <dl className="cv-ficha">
        <div><dt>Serviço</dt><dd>{pac.nomes.join(" + ")}</dd></div>
        <div><dt>Dia</dt><dd>{dia && dataLonga(dia)}</dd></div>
        <div><dt>Horário</dt><dd>{hora} às {hora && fim(hora)}</dd></div>
        <div><dt>Nome</dt><dd>{nome}</dd></div>
        <div><dt>WhatsApp</dt><dd>{tel}</dd></div>
        <div className="total"><dt>Total</dt><dd>{brl(pac.preco)}</dd></div>
      </dl>
      {etapa === "resumo" && (
        <div className="cv-botoes">
          <motion.button type="button" className="btn btn-main brilha" whileTap={{ scale: 0.97 }} onClick={confirmar}>Confirmar agendamento</motion.button>
          <button type="button" className="cv-link" onClick={alterar}>Mudar algo</button>
        </div>
      )}
    </div>
  );

  const Ok = () => (
    <div className="cv-cartao cv-ok">
      <svg className="cv-check" viewBox="0 0 52 52" aria-hidden="true">
        <motion.circle cx="26" cy="26" r="24" fill="none" strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />
        <motion.path d="M15 27l7 7 15-16" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.5 }} />
      </svg>
      <dl className="cv-ficha">
        <div><dt>Serviço</dt><dd>{reserva.servico}</dd></div>
        <div><dt>Dia</dt><dd>{dataLonga(reserva.data)}</dd></div>
        <div><dt>Horário</dt><dd>{reserva.hora} às {reserva.fim}</dd></div>
        <div className="total"><dt>Total</dt><dd>{brl(reserva.preco)}</dd></div>
        <div><dt>Código</dt><dd className="cv-codigo">{reserva.id}</dd></div>
      </dl>
      {linkWa ? (
        <>
          <motion.a className="btn btn-main brilha cv-wa" href={linkWa} target="_blank" rel="noopener noreferrer" whileTap={{ scale: 0.97 }}>Enviar confirmação no WhatsApp</motion.a>
          <p className="cv-nota">A mensagem já vai pronta, é só tocar em enviar.</p>
        </>
      ) : (
        <p className="cv-nota">Guarde o código. A barbearia já recebeu seu agendamento.</p>
      )}
      {etapa === "ok" && <button type="button" className="cv-link" onClick={denovo}>Fazer outro agendamento</button>}
    </div>
  );

  const Servicos = () => (
    <div className="cv-widget">
      <div className="cv-carrossel" data-lenis-prevent>
        {cfg.servicos.map((s, i) => {
          const on = sel.includes(i);
          const cheio = !on && sel.length >= MAX_SERVICOS;
          return (
            <motion.button key={s.nome} type="button" className={`cv-serv ${on ? "on" : ""}`} aria-pressed={on} disabled={cheio}
              whileTap={{ scale: 0.95 }} layout transition={SPRING}
              onClick={() => setSel((x) => (on ? x.filter((y) => y !== i) : [...x, i]))}>
              <span className="cv-marca">{on && <IcoCheck />}</span>
              <span className="cv-serv-nome">{s.nome}</span>
              <span className="cv-serv-info"><b>{brl(s.preco)}</b><span>{duracaoTxt(s.duracao)}</span></span>
            </motion.button>
          );
        })}
      </div>
      <p className="cv-arraste">Arraste para o lado para ver mais →</p>
      <AnimatePresence>
        {sel.length > 0 && (
          <motion.div className="cv-barra" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>
            <span><b>{brl(pac.preco)}</b> · {duracaoTxt(pac.duracao)} · {sel.length} {sel.length > 1 ? "serviços" : "serviço"}</span>
            <motion.button type="button" className="btn btn-main" whileTap={{ scale: 0.96 }} onClick={escolherServicos}>Continuar</motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const Dias = () => (
    <div className="cv-widget">
      <div className="cv-carrossel" data-lenis-prevent>
        {proximosDias(cfg).map((d) => {
          const livres = dias ? dias[d.data] : undefined;
          const lotado = !d.aberto || livres === 0;
          return (
            <motion.button key={d.data} type="button" className="cv-dia" disabled={lotado} whileTap={{ scale: 0.94 }} onClick={() => escolherDia(d)}>
              <span className="cv-dia-sem">{d.rotulo}</span>
              <span className="cv-dia-num">{d.dia}</span>
              <span className="cv-dia-mes">{d.mes}</span>
              <span className="cv-dia-livres">
                {!d.aberto ? "fechado" : livres === undefined ? "…" : livres === 0 ? "lotado" : `${livres} ${livres > 1 ? "horários" : "horário"}`}
              </span>
            </motion.button>
          );
        })}
      </div>
      <p className="cv-arraste">Arraste para o lado para ver mais dias →</p>
    </div>
  );

  const Horas = () => (
    <div className="cv-widget">
      <p className="cv-vivo"><span className="cv-ponto" aria-hidden="true" /> Ao vivo{atualizado ? ` · atualizado ${atualizado.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}</p>
      {horas === null ? (
        <div className="cv-horas">{Array.from({ length: 9 }, (_, i) => <span key={i} className="cv-hora esq" />)}</div>
      ) : horas.length === 0 ? (
        <div className="cv-vazio">
          Esse dia lotou para esse serviço 😕
          <button type="button" className="cv-link" onClick={async () => { eu("Ver outro dia"); setEtapa("..."); await carregarDias(); await bot("Tranquilo! Escolhe outro dia:"); setEtapa("dia"); }}>Escolher outro dia</button>
        </div>
      ) : (
        <motion.div className="cv-horas" initial="h" animate="v" variants={{ v: { transition: { staggerChildren: 0.025 } } }}>
          {horas.map((h) => (
            <motion.button key={h} type="button" className="cv-hora" variants={{ h: { opacity: 0, scale: 0.8 }, v: { opacity: 1, scale: 1 } }}
              whileTap={{ scale: 0.92 }} onClick={() => escolherHora(h)}>{h}</motion.button>
          ))}
        </motion.div>
      )}
      <button type="button" className="cv-link" onClick={async () => { eu("Ver outro dia"); setEtapa("..."); carregarDias(); await bot("Tranquilo! Escolhe outro dia:"); setEtapa("dia"); }}>Ver outro dia</button>
    </div>
  );

  const ultimaBot = [...msgs].reverse().find((m) => m.de === "bot")?.id;
  const campoAtivo = etapa === "nome" || etapa === "tel";

  return (
    <div className="cv" id="conversa" ref={caixa}>
      <header className="cv-topo">
        <span className="cv-avatar">{logo ? <img src={logo} alt="" /> : <IcoTesoura />}</span>
        <span className="cv-quem">
          <b>{site.nome}</b>
          <small><span className="cv-ponto" aria-hidden="true" /> {digitando ? "digitando…" : "online · responde na hora"}</small>
        </span>
      </header>

      <div className="cv-msgs" ref={lista} data-lenis-prevent aria-live="polite">
        <AnimatePresence initial={false}>
          {msgs.map((m) => (
            <motion.div key={m.id} className={`cv-linha ${m.de}`} initial={{ opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={SPRING} layout="position">
              {m.texto && <div className="cv-bolha">{m.texto}</div>}
              {m.tipo === "resumo" && Resumo()}
              {m.tipo === "ok" && reserva && Ok()}
              {m.de === "bot" && m.id === ultimaBot && !digitando && (
                <>
                  {etapa === "servicos" && Servicos()}
                  {etapa === "dia" && Dias()}
                  {etapa === "hora" && Horas()}
                </>
              )}
            </motion.div>
          ))}
          {digitando && (
            <motion.div key="dig" className="cv-linha bot" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="cv-bolha cv-dig" aria-label="digitando"><span /><span /><span /></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <form className={`cv-campo ${campoAtivo ? "" : "off"}`} onSubmit={enviarTexto} noValidate>
        <label className="sr" htmlFor="cv-input">{etapa === "tel" ? "Seu WhatsApp" : "Seu nome"}</label>
        <input id="cv-input" value={texto} disabled={!campoAtivo} maxLength={etapa === "tel" ? 15 : 60}
          type={etapa === "tel" ? "tel" : "text"} inputMode={etapa === "tel" ? "numeric" : "text"}
          autoComplete={etapa === "tel" ? "tel-national" : "name"}
          placeholder={etapa === "nome" ? "Digite seu nome e sobrenome" : etapa === "tel" ? "(92) 99999-9999" : "Escolha uma opção acima"}
          onChange={(e) => setTexto(etapa === "tel" ? mascaraTel(e.target.value) : e.target.value)} />
        <div className="cv-isca" aria-hidden="true">
          <label htmlFor="cv-empresa">Não preencha</label>
          <input id="cv-empresa" tabIndex={-1} autoComplete="off" value={isca} onChange={(e) => setIsca(e.target.value)} />
        </div>
        <motion.button type="submit" className="cv-enviar" disabled={!campoAtivo || !texto.trim()} whileTap={{ scale: 0.9 }} aria-label="Enviar"><IcoEnviar /></motion.button>
      </form>
      <p className="cv-lgpd">Seu nome e WhatsApp são usados só para este agendamento.</p>
    </div>
  );
}
