import { useRef, useState } from "react";
import {
  motion,
  MotionConfig,
  AnimatePresence,
  useScroll,
  useSpring,
  useTransform,
  useMotionValueEvent,
} from "framer-motion";
import { SITES, AUTOR } from "./sites.js";

const site = SITES.find((s) => s.slug === __SLUG__);
const EASE = [0.22, 1, 0.36, 1];

function waLink(tel, nome) {
  let d = String(tel || "").replace(/\D/g, "");
  if (d.length < 10) return null;
  if (!d.startsWith("55")) d = "55" + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(`Olá, ${nome}! Vi o site e quero agendar um horário.`)}`;
}
const WA = waLink(site.telefone, site.nome);
const MAPA = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(`${site.nome}, ${site.endereco}`);

const Ext = ({ href, children, ...p }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" {...p}>
    {children}
  </a>
);

/* ---------- ícones (traço no estilo Lucide) ---------- */
const Icon = ({ d, children }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d ? <path d={d} /> : children}
  </svg>
);
const IcoChat = () => <Icon d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />;
const IcoPin = () => (
  <Icon>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </Icon>
);
const IcoClock = () => (
  <Icon>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </Icon>
);
const IcoTag = () => (
  <Icon>
    <path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4Z" />
    <circle cx="7.5" cy="7.5" r="1.5" />
  </Icon>
);

/* tesoura que se desenha sozinha */
function Tesoura() {
  const t = { duration: 1.6, ease: EASE };
  return (
    <motion.svg className="tesoura" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"
      initial={{ rotate: -20, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ duration: 1, ease: EASE, delay: 0.3 }}>
      <motion.circle cx="18" cy="18" r="8" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ ...t, delay: 0.4 }} />
      <motion.circle cx="18" cy="46" r="8" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ ...t, delay: 0.55 }} />
      <motion.path d="M24 24 32 32M54 12 24 40M40 40 54 52" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ ...t, delay: 0.8 }} />
    </motion.svg>
  );
}

/* título que sobe palavra por palavra */
function Palavras({ texto, delay = 0 }) {
  return (
    <span className="palavras" aria-label={texto}>
      {texto.split(" ").map((w, i) => (
        <span className="palavra" key={i} aria-hidden="true">
          <motion.span
            initial={{ y: "110%" }}
            animate={{ y: "0%" }}
            transition={{ duration: 0.9, ease: EASE, delay: delay + i * 0.08 }}
          >
            {w}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

const subir = { hidden: { opacity: 0, y: 32 }, show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } } };
const grupo = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } };

function Secao({ id, className = "", children }) {
  return (
    <motion.section id={id} className={`bloco ${className}`} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={grupo}>
      <div className="wrap">{children}</div>
    </motion.section>
  );
}

function BotaoWA({ className = "" }) {
  if (!WA) return <span className={`btn btn-main is-off ${className}`}>WhatsApp: número a confirmar</span>;
  return (
    <motion.a className={`btn btn-main ${className}`} href={WA} target="_blank" rel="noopener noreferrer"
      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 400, damping: 22 }}>
      <IcoChat /> Agendar no WhatsApp
    </motion.a>
  );
}

export default function App() {
  const { scrollY, scrollYProgress } = useScroll();
  const progresso = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });
  const [rolou, setRolou] = useState(false);
  const [mostraFixo, setMostraFixo] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => {
    setRolou(y > 24);
    setMostraFixo(y > 520);
  });

  const heroRef = useRef(null);
  const { scrollYProgress: heroP } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const fundoY = useTransform(heroP, [0, 1], ["0%", "35%"]);
  const heroOpacity = useTransform(heroP, [0, 0.8], [1, 0]);

  const faixa = site.servicos.map(([n]) => n);

  return (
    <MotionConfig reducedMotion="user">
      <motion.div className="progresso" style={{ scaleX: progresso }} aria-hidden="true" />

      {site.demo && <div className="demo">Prévia de demonstração feita para a {site.nome}. Textos e valores são exemplos.</div>}

      <header className={`topo ${rolou ? "is-rolou" : ""}`}>
        <div className="wrap topo-in">
          <a className="marca" href="#inicio">
            <span className="marca-ico"><Tesoura /></span>
            {site.nome}
          </a>
          <nav aria-label="Seções">
            {[["#servicos", "Serviços"], ["#horarios", "Horários"], ["#local", "Local"]].map(([h, t]) => (
              <a key={h} href={h}>{t}</a>
            ))}
          </nav>
        </div>
      </header>

      <main id="inicio">
        <section className="hero" ref={heroRef}>
          <motion.div className="hero-fundo" style={{ y: fundoY }} aria-hidden="true">
            {site.bairro}
          </motion.div>
          <div className="poste" aria-hidden="true"><span /></div>
          <motion.div className="wrap hero-in" style={{ opacity: heroOpacity }}>
            <motion.p className="eyebrow" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, ease: EASE }}>
              Barbearia · {site.bairro}, Manaus
            </motion.p>
            <h1><Palavras texto={site.slogan} delay={0.15} /></h1>
            <motion.p className="lead" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: 0.7 }}>
              {site.sobre}
            </motion.p>
            <motion.div className="acoes" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: 0.9 }}>
              <BotaoWA />
              <motion.a className="btn btn-ghost" href="#servicos" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                Ver serviços e valores
              </motion.a>
            </motion.div>
          </motion.div>
        </section>

        <div className="faixa" aria-hidden="true">
          <motion.div className="faixa-trilho" animate={{ x: ["0%", "-50%"] }} transition={{ duration: 28, ease: "linear", repeat: Infinity }}>
            {[...faixa, ...faixa, ...faixa, ...faixa].map((t, i) => (
              <span key={i}>{t}<i>✦</i></span>
            ))}
          </motion.div>
        </div>

        <Secao id="servicos">
          <motion.h2 variants={subir}>Serviços</motion.h2>
          <motion.ul className="precos" variants={grupo}>
            {site.servicos.map(([n, p]) => (
              <motion.li key={n} variants={subir} whileHover={{ x: 6 }} transition={{ type: "spring", stiffness: 300, damping: 24 }}>
                <span>{n}</span>
                <span className="dots" aria-hidden="true" />
                <b>R$ {p}</b>
              </motion.li>
            ))}
          </motion.ul>
          <motion.p className="obs" variants={subir}>
            {site.demo ? "Valores de exemplo, a confirmar com a barbearia." : "Valores sujeitos a alteração."}
          </motion.p>
        </Secao>

        <Secao className="alt">
          <motion.h2 variants={subir}>Por que agendar pelo site</motion.h2>
          <div className="cards">
            {[
              [IcoChat, "Agenda pelo WhatsApp", "Um toque e a conversa já abre com a mensagem pronta."],
              [IcoTag, "Preço claro", "Você vê os valores antes de sair de casa."],
              [IcoPin, "Fácil de achar", `Endereço em ${site.bairro} com rota direto no Google Maps.`],
            ].map(([I, t, d]) => (
              <motion.article key={t} className="card" variants={subir} whileHover={{ y: -8 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}>
                <span className="card-ico"><I /></span>
                <h3>{t}</h3>
                <p>{d}</p>
              </motion.article>
            ))}
          </div>
        </Secao>

        <Secao>
          <motion.h2 variants={subir}>Como agendar</motion.h2>
          <ol className="passos">
            {[
              ["Chama no WhatsApp", "Manda uma mensagem pelo botão do site."],
              ["Escolhe o horário", "A barbearia responde com os horários livres."],
              ["Chega e senta", "Sem fila: seu horário fica reservado."],
            ].map(([t, d], i) => (
              <motion.li key={t} variants={subir}>
                <motion.span className="num" initial={{ scale: 0.4, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.15 + i * 0.12 }}>
                  {i + 1}
                </motion.span>
                <b>{t}</b>
                <span>{d}</span>
              </motion.li>
            ))}
          </ol>
        </Secao>

        <Secao id="horarios" className="alt">
          <div className="duas">
            <motion.div variants={subir}>
              <h2><span className="h-ico"><IcoClock /></span>Horários</h2>
              <table className="horas">
                <tbody>
                  {site.horarios.map(([d, h]) => (
                    <tr key={d}><th scope="row">{d}</th><td>{h}</td></tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
            <motion.div id="local" variants={subir}>
              <h2><span className="h-ico"><IcoPin /></span>Onde fica</h2>
              <p className="end">{site.endereco}</p>
              <p>WhatsApp: <b className="tel">{site.telefone || "a confirmar"}</b></p>
              {site.instagram && (
                <p><Ext className="link" href={`https://www.instagram.com/${encodeURIComponent(site.instagram.replace(/^@/, ""))}/`}>{site.instagram}</Ext></p>
              )}
              <div className="acoes">
                <motion.a className="btn btn-ghost" href={MAPA} target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <IcoPin /> Abrir no Google Maps
                </motion.a>
              </div>
            </motion.div>
          </div>
        </Secao>

        <Secao className="final">
          <motion.h2 variants={subir}>Bora dar um tapa no visual?</motion.h2>
          <motion.div variants={subir} className="acoes centro"><BotaoWA /></motion.div>
        </Secao>
      </main>

      <footer className="rodape">
        <div className="wrap">
          <p>© 2026 {site.nome} · {site.bairro}, Manaus – AM</p>
          <p className="assina">Site feito por {AUTOR}</p>
        </div>
      </footer>

      <AnimatePresence>
        {WA && mostraFixo && (
          <motion.a className="fixo" href={WA} target="_blank" rel="noopener noreferrer"
            initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 120, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}>
            <IcoChat /> Agendar no WhatsApp
          </motion.a>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
