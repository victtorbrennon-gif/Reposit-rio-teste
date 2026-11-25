// Agendamento online: serviço -> dia -> horário -> dados -> confirmação + WhatsApp pronto.
// Os horários se atualizam sozinhos a cada 15s; o servidor é quem decide (trava de vaga única).
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { proximosDias, dataLonga } from "../agenda/core.mjs";
import { agendaDe } from "./sites.js";

const EASE = [0.22, 1, 0.36, 1];
const API = "/api/agenda";
const PASSOS = ["Serviço", "Dia", "Horário", "Seus dados"];

const Relogio = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
const Voltar = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
);

function mascaraTel(v) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
const duracaoTxt = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}` : `${m} min`);

export default function Agendamento({ site, waNumero }) {
  const cfg = useMemo(() => agendaDe(site), [site]);
  const [passo, setPasso] = useState(0);
  const [servico, setServico] = useState(null);
  const [dia, setDia] = useState(null);
  const [hora, setHora] = useState(null);
  const [nome, setNome] = useState("");
  const [tel, setTel] = useState("");
  const [isca, setIsca] = useState("");
  const [lista, setLista] = useState(null);     // horários do dia
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [atualizado, setAtualizado] = useState(null);
  const [reserva, setReserva] = useState(null);
  const dias = useMemo(() => proximosDias(cfg), [cfg, passo]);
  const pedido = useRef(0);

  async function buscar(silencioso = false) {
    if (servico === null || !dia) return;
    const n = ++pedido.current;
    if (!silencioso) { setCarregando(true); setLista(null); }
    try {
      const r = await fetch(`${API}?data=${dia}&servico=${servico}`, { cache: "no-store" });
      const j = await r.json();
      if (n !== pedido.current) return;
      if (!r.ok) throw new Error(j.erro);
      setLista(j.horarios);
      setAtualizado(new Date());
      if (hora && !j.horarios.find((h) => h.hora === hora && h.livre)) {
        setHora(null);
        setAviso("O horário que você escolheu acabou de ser reservado. Escolha outro.");
        setPasso(2);
      }
    } catch {
      if (n === pedido.current && !silencioso) { setLista([]); setAviso("Não foi possível carregar os horários. Verifique a internet e tente de novo."); }
    } finally {
      if (n === pedido.current) setCarregando(false);
    }
  }

  // busca ao trocar de dia/serviço e atualiza em tempo real a cada 15s (e ao voltar para a aba)
  useEffect(() => {
    if (passo < 2 || passo > 3 || !dia || servico === null) return;
    buscar();
    const id = setInterval(() => document.visibilityState === "visible" && buscar(true), 15000);
    const vis = () => document.visibilityState === "visible" && buscar(true);
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", vis); };
  }, [dia, servico, passo === 2 || passo === 3]);

  async function confirmar(e) {
    e.preventDefault();
    setAviso("");
    if (nome.trim().length < 2) return setAviso("Digite seu nome.");
    if (tel.replace(/\D/g, "").length < 10) return setAviso("Digite seu WhatsApp com DDD.");
    setEnviando(true);
    try {
      const r = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: dia, hora, servico, nome: nome.trim(), telefone: tel, empresa: isca }),
      });
      const j = await r.json();
      if (r.status === 409) { setHora(null); setPasso(2); setAviso(j.erro); buscar(); return; }
      if (!r.ok) return setAviso(j.erro || "Não foi possível agendar.");
      setReserva(j.reserva);
      setPasso(4);
    } catch {
      setAviso("Sem conexão. Tente de novo em instantes.");
    } finally {
      setEnviando(false);
    }
  }

  function reiniciar() {
    setPasso(0); setServico(null); setDia(null); setHora(null); setReserva(null); setAviso(""); setLista(null);
  }

  const s = servico !== null ? cfg.servicos[servico] : null;
  const msgWa = reserva &&
    `Olá, ${site.nome}! Acabei de agendar pelo site:\n` +
    `✂️ ${reserva.servico} (R$ ${reserva.preco})\n` +
    `📅 ${dataLonga(reserva.data)}\n` +
    `🕒 ${reserva.hora} às ${reserva.fim}\n` +
    `👤 ${reserva.nome}\n` +
    `Código: ${reserva.id}`;
  const linkWa = reserva && waNumero ? `https://wa.me/${waNumero}?text=${encodeURIComponent(msgWa)}` : null;

  const anim = { initial: { opacity: 0, x: 40 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -40 }, transition: { duration: 0.35, ease: EASE } };

  return (
    <div className="ag">
      {passo < 4 && (
        <ol className="ag-passos" aria-label="Etapas do agendamento">
          {PASSOS.map((p, i) => (
            <li key={p} className={i === passo ? "atual" : i < passo ? "feito" : ""}>
              <span className="ag-bola">{i < passo ? "✓" : i + 1}</span>
              <span className="ag-rot">{p}</span>
            </li>
          ))}
          <motion.span className="ag-barra" aria-hidden="true" animate={{ scaleX: passo / (PASSOS.length - 1) }} transition={{ duration: 0.5, ease: EASE }} />
        </ol>
      )}

      {passo > 0 && passo < 4 && (
        <div className="ag-resumo">
          <button type="button" className="ag-voltar" onClick={() => { setAviso(""); setPasso(passo - 1); }}><Voltar /> Voltar</button>
          <span>
            {s && <b>{s.nome}</b>}
            {s && <> · R$ {s.preco} · {duracaoTxt(s.duracao)}</>}
            {dia && passo > 1 && <> · {dataLonga(dia)}</>}
            {hora && passo > 2 && <> · {hora}</>}
          </span>
        </div>
      )}

      <AnimatePresence>
        {aviso && (
          <motion.p className="ag-aviso" role="alert" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {aviso}
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {passo === 0 && (
          <motion.div key="p0" {...anim} className="ag-servicos">
            {cfg.servicos.map((sv, i) => (
              <motion.button key={sv.nome} type="button" className={`ag-servico ${servico === i ? "on" : ""}`}
                whileHover={{ y: -4 }} whileTap={{ scale: 0.97 }}
                onClick={() => { setServico(i); setHora(null); setAviso(""); setPasso(1); }}>
                <span className="ag-s-nome">{sv.nome}</span>
                <span className="ag-s-info"><b>R$ {sv.preco}</b><span><Relogio /> {duracaoTxt(sv.duracao)}</span></span>
              </motion.button>
            ))}
          </motion.div>
        )}

        {passo === 1 && (
          <motion.div key="p1" {...anim} className="ag-dias" role="listbox" aria-label="Escolha o dia">
            {dias.map((d) => (
              <motion.button key={d.data} type="button" role="option" aria-selected={dia === d.data}
                className={`ag-dia ${dia === d.data ? "on" : ""}`} disabled={!d.aberto}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setDia(d.data); setHora(null); setAviso(""); setPasso(2); }}>
                <span className="ag-d-sem">{d.rotulo}</span>
                <span className="ag-d-num">{d.dia}</span>
                <span className="ag-d-mes">{d.aberto ? d.data.slice(5, 7) + "/" + d.data.slice(0, 4).slice(2) : "Fechado"}</span>
              </motion.button>
            ))}
          </motion.div>
        )}

        {passo === 2 && (
          <motion.div key="p2" {...anim}>
            <p className="ag-vivo"><span className="ag-ponto" aria-hidden="true" /> Horários atualizados em tempo real{atualizado ? ` · ${atualizado.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}</p>
            {carregando || !lista ? (
              <div className="ag-horas">{Array.from({ length: 12 }, (_, i) => <span key={i} className="ag-hora esqueleto" />)}</div>
            ) : lista.length === 0 || !lista.some((h) => h.livre) ? (
              <p className="ag-vazio">Nenhum horário livre neste dia para esse serviço. Escolha outro dia.</p>
            ) : (
              <motion.div className="ag-horas" initial="h" animate="v" variants={{ v: { transition: { staggerChildren: 0.02 } } }}>
                {lista.map((h) => (
                  <motion.button key={h.hora} type="button" disabled={!h.livre} className={`ag-hora ${hora === h.hora ? "on" : ""}`}
                    variants={{ h: { opacity: 0, y: 10 }, v: { opacity: 1, y: 0 } }} whileTap={{ scale: 0.94 }}
                    aria-label={h.livre ? `${h.hora} livre` : `${h.hora} ocupado`}
                    onClick={() => { setHora(h.hora); setAviso(""); setPasso(3); }}>
                    {h.hora}
                    {!h.livre && <small>ocupado</small>}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}

        {passo === 3 && (
          <motion.form key="p3" {...anim} className="ag-form" onSubmit={confirmar} noValidate>
            <div className="ag-campo">
              <label htmlFor="ag-nome">Seu nome</label>
              <input id="ag-nome" autoComplete="name" maxLength={60} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Como podemos te chamar?" />
            </div>
            <div className="ag-campo">
              <label htmlFor="ag-tel">Seu WhatsApp</label>
              <input id="ag-tel" type="tel" inputMode="numeric" autoComplete="tel-national" value={tel} onChange={(e) => setTel(mascaraTel(e.target.value))} placeholder="(92) 99999-9999" />
            </div>
            <div className="ag-isca" aria-hidden="true">
              <label htmlFor="ag-empresa">Não preencha</label>
              <input id="ag-empresa" tabIndex={-1} autoComplete="off" value={isca} onChange={(e) => setIsca(e.target.value)} />
            </div>
            <motion.button type="submit" className="btn btn-main ag-confirmar" disabled={enviando} whileTap={{ scale: 0.97 }}>
              {enviando ? "Reservando…" : `Confirmar ${hora} de ${dataLonga(dia).split(",")[0].toLowerCase()}`}
            </motion.button>
            <p className="ag-lgpd">Seu nome e WhatsApp são usados só para este agendamento.</p>
          </motion.form>
        )}

        {passo === 4 && reserva && (
          <motion.div key="p4" className="ag-ok" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: EASE }}>
            <svg className="ag-check" viewBox="0 0 52 52" aria-hidden="true">
              <motion.circle cx="26" cy="26" r="24" fill="none" strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />
              <motion.path d="M15 27l7 7 15-16" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.5 }} />
            </svg>
            <h3>Horário reservado!</h3>
            <dl className="ag-ficha">
              <div><dt>Serviço</dt><dd>{reserva.servico} · R$ {reserva.preco}</dd></div>
              <div><dt>Dia</dt><dd>{dataLonga(reserva.data)}</dd></div>
              <div><dt>Horário</dt><dd>{reserva.hora} às {reserva.fim}</dd></div>
              <div><dt>Nome</dt><dd>{reserva.nome}</dd></div>
              <div><dt>Código</dt><dd className="ag-codigo">{reserva.id}</dd></div>
            </dl>
            {linkWa ? (
              <>
                <motion.a className="btn btn-main brilha ag-wa" href={linkWa} target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  Enviar confirmação no WhatsApp
                </motion.a>
                <p className="ag-lgpd">A mensagem já vai pronta, é só tocar em enviar.</p>
              </>
            ) : (
              <p className="ag-lgpd">Guarde o código. A barbearia já recebeu seu agendamento.</p>
            )}
            <button type="button" className="ag-outro" onClick={reiniciar}>Fazer outro agendamento</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
