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
import { SITES, AUTOR, TEMAS } from "./sites.js";
import {
  EASE, Cortina, Magnetico, Tilt, TituloLetras, Faixa, Mancha, useHolofote,
  Particulas, PosteAlfa, FolhasVerde, TituloNavalha, RolagemSuave, Cursor,
} from "./Efeitos.jsx";
import { Embaralhado, TextoAcende, LetrasPulam, Contador } from "./Tipografia.jsx";

const site = SITES.find((s) => s.slug === __SLUG__);
const COR = TEMAS[site.tema].fg;

function waLink(tel, nome) {
  let d = String(tel || "").replace(/\D/g, "");
  if (d.length < 10) return null;
  if (!d.startsWith("55")) d = "55" + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(`Olá, ${nome}! Vi o site e quero agendar um horário.`)}`;
}
const WA = waLink(site.telefone, site.nome);
const MAPA = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(`${site.nome}, ${site.endereco}`);

/* ---------- ícones (traço no estilo Lucide) ---------- */
const Icon = ({ d, children }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d ? <path d={d} /> : children}
  </svg>
);
const IcoChat = () => <Icon d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />;
const IcoPin = () => (<Icon><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></Icon>);
const IcoClock = () => (<Icon><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></Icon>);
const IcoTag = () => (<Icon><path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4Z" /><circle cx="7.5" cy="7.5" r="1.5" /></Icon>);

/* tesoura do logo que se desenha e abre/fecha devagar */
function Tesoura() {
  const t = { duration: 1.6, ease: EASE };
  return (
    <motion.svg className="tesoura" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"
      initial={{ rotate: -20, opacity: 0 }} animate={{ rotate: [0, -8, 0], opacity: 1 }}
      transition={{ opacity: { duration: 0.6, delay: 1.3 }, rotate: { duration: 3, repeat: Infinity, repeatDelay: 2.5, ease: "easeInOut", delay: 3 } }}>
      <motion.circle cx="18" cy="18" r="8" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ ...t, delay: 1.4 }} />
      <motion.circle cx="18" cy="46" r="8" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ ...t, delay: 1.55 }} />
      <motion.path d="M24 24 32 32M54 12 24 40M40 40 54 52" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ ...t, delay: 1.8 }} />
    </motion.svg>
  );
}

/* título do topo subindo palavra por palavra */
function Palavras({ texto, delay = 0 }) {
  return (
    <h1 aria-label={texto}>
      {texto.split(" ").map((w, i) => (
        <span className="palavra" key={i} aria-hidden="true">
          <motion.span initial={{ y: "110%", rotate: 6 }} animate={{ y: "0%", rotate: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: delay + i * 0.08 }}>
            {w}
          </motion.span>
        </span>
      ))}
    </h1>
  );
}

const subir = { hidden: { opacity: 0, y: 40 }, show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } } };
const grupo = { hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } } };

function Secao({ id, className = "", children }) {
  return (
    <motion.section id={id} className={`bloco ${className}`} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }} variants={grupo}>
      <div className="wrap">{children}</div>
    </motion.section>
  );
}

function BotaoWA() {
  if (!WA) return <span className="btn btn-main is-off">WhatsApp: número a confirmar</span>;
  return (
    <Magnetico>
      <motion.a className="btn btn-main brilha" href={WA} target="_blank" rel="noopener noreferrer"
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
        <IcoChat /> Agendar no WhatsApp
      </motion.a>
    </Magnetico>
  );
}

const DEPOIS = 1.25;

/* imagem com zoom suave e leve parallax dentro da moldura */
function Parallax({ src }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.25, 1.12, 1.2]);
  return <motion.img ref={ref} src={src} alt="" loading="lazy" decoding="async" style={{ y, scale }} />;
} // espera a cortina abrir

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
  const fundoX = useTransform(heroP, [0, 1], ["0%", "-25%"]);
  const conteudoY = useTransform(heroP, [0, 1], ["0%", "30%"]);
  const conteudoOp = useTransform(heroP, [0, 0.75], [1, 0]);
  const holofote = useHolofote();

  const passosRef = useRef(null);
  const { scrollYProgress: passosP } = useScroll({ target: passosRef, offset: ["start 85%", "end 60%"] });
  const linha = useSpring(passosP, { stiffness: 120, damping: 30 });

  return (
    <MotionConfig reducedMotion="user">
      <RolagemSuave />
      <Cursor />
      <Cortina nome={site.nome} />
      <motion.div className="progresso" style={{ scaleX: progresso }} aria-hidden="true" />

      {site.demo && <div className="demo">Prévia de demonstração feita para a {site.nome}. Textos e valores são exemplos.</div>}

      <header className={`topo ${rolou ? "is-rolou" : ""}`}>
        <div className="wrap topo-in">
          <a className="marca" href="#inicio">
            <span className="marca-ico"><Tesoura /></span>
            <LetrasPulam texto={site.nome} />
          </a>
          <nav aria-label="Seções">
            {[["#servicos", "Serviços"], ["#horarios", "Horários"], ["#local", "Local"]].map(([h, t]) => (
              <a key={h} href={h}>{t}<span className="sublinha" aria-hidden="true" /></a>
            ))}
          </nav>
        </div>
      </header>

      <main id="inicio">
        <section className="hero" ref={heroRef} onPointerMove={holofote.onPointerMove}>
          <Mancha />
          <motion.div className="holofote" style={{ background: holofote.bg }} aria-hidden="true" />
          {site.tema === "verde" && <Particulas modo="fumaca" cor="#2F5D46" />}
          {site.tema === "navalha" && <Particulas modo="ouro" cor={COR} />}
          <motion.div className="hero-fundo" style={{ x: fundoX }} aria-hidden="true">{site.bairro} · {site.bairro}</motion.div>
          {site.tema === "alfa" && <PosteAlfa />}
          {site.tema === "verde" && <FolhasVerde />}

          <motion.div className="wrap hero-in" style={{ y: conteudoY, opacity: conteudoOp }}>
            <Embaralhado className="eyebrow" texto={`Barbearia · ${site.bairro}, Manaus`} atraso={DEPOIS} />
            {site.tema === "navalha" ? <TituloNavalha texto={site.slogan} /> : <Palavras texto={site.slogan} delay={DEPOIS + 0.1} />}
            <motion.p className="lead" initial={{ opacity: 0, y: 24, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.9, ease: EASE, delay: DEPOIS + 0.7 }}>
              {site.sobre}
            </motion.p>
            <motion.div className="acoes" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: DEPOIS + 0.9 }}>
              <BotaoWA />
              <Magnetico forca={0.25}>
                <motion.a className="btn btn-ghost" href="#servicos" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                  Ver serviços e valores
                </motion.a>
              </Magnetico>
            </motion.div>
          </motion.div>

          <motion.a className="rolar" href="#servicos" aria-label="Rolar para os serviços"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: DEPOIS + 1.4 }}>
            <motion.span animate={{ y: [0, 10, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }} />
          </motion.a>
        </section>

        <Faixa itens={site.servicos.map(([n]) => n)} />

        <Secao id="servicos">
          <TituloLetras texto="Serviços" />
          <motion.ul className="precos" variants={grupo}>
            {site.servicos.map(([n, p]) => (
              <motion.li key={n} variants={{ hidden: { opacity: 0, x: -40 }, show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE } } }}
                whileHover={{ x: 8 }}>
                <span>{n}</span>
                <span className="dots" aria-hidden="true" />
                <Contador valor={p} prefixo="R$ " />
              </motion.li>
            ))}
          </motion.ul>
          <motion.p className="obs" variants={subir}>
            {site.demo ? "Valores de exemplo, a confirmar com a barbearia." : "Valores sujeitos a alteração."}
          </motion.p>
        </Secao>

        <section className="bloco manifesto">
          <div className="wrap"><TextoAcende texto={site.manifesto} /></div>
        </section>

        {site.imagens?.length > 0 && (
          <Secao className="alt">
            <TituloLetras texto="O ambiente" />
            <div className="galeria">
              {site.imagens.map((img, i) => (
                <motion.figure key={img}
                  variants={{ hidden: { clipPath: "inset(100% 0 0 0)" }, show: { clipPath: "inset(0% 0 0 0)", transition: { duration: 1.1, ease: [0.76, 0, 0.24, 1], delay: i * 0.15 } } }}>
                  <Parallax src={`/img/${img}`} />
                  {site.demo && <figcaption>Imagem ilustrativa</figcaption>}
                </motion.figure>
              ))}
            </div>
          </Secao>
        )}

        <Secao className={site.imagens?.length ? "" : "alt"}>
          <TituloLetras texto="Por que agendar pelo site" />
          <div className="cards">
            {[
              [IcoChat, "Agenda pelo WhatsApp", "Um toque e a conversa já abre com a mensagem pronta."],
              [IcoTag, "Preço claro", "Você vê os valores antes de sair de casa."],
              [IcoPin, "Fácil de achar", `Endereço em ${site.bairro} com rota direto no Google Maps.`],
            ].map(([I, t, d]) => (
              <Tilt key={t} className="card" variants={subir}>
                <motion.span className="card-ico" whileHover={{ rotate: [0, -12, 12, 0], scale: 1.1 }} transition={{ duration: 0.5 }}><I /></motion.span>
                <h3>{t}</h3>
                <p>{d}</p>
              </Tilt>
            ))}
          </div>
        </Secao>

        <Secao>
          <TituloLetras texto="Como agendar" />
          <div className="passos-wrap" ref={passosRef}>
            <motion.span className="passos-linha" style={{ scaleX: linha }} aria-hidden="true" />
            <ol className="passos">
              {[
                ["Chama no WhatsApp", "Manda uma mensagem pelo botão do site."],
                ["Escolhe o horário", "A barbearia responde com os horários livres."],
                ["Chega e senta", "Sem fila: seu horário fica reservado."],
              ].map(([t, d], i) => (
                <motion.li key={t} variants={subir}>
                  <motion.span className="num" initial={{ scale: 0, rotate: -90 }} whileInView={{ scale: 1, rotate: 0 }} viewport={{ once: true }}
                    transition={{ type: "spring", stiffness: 240, damping: 14, delay: 0.2 + i * 0.18 }}>
                    {i + 1}
                  </motion.span>
                  <b>{t}</b>
                  <span>{d}</span>
                </motion.li>
              ))}
            </ol>
          </div>
        </Secao>

        <Secao id="horarios" className="alt">
          <div className="duas">
            <motion.div variants={subir}>
              <TituloLetras texto="Horários" icone={<span className="h-ico"><IcoClock /></span>} />
              <table className="horas">
                <tbody>
                  {site.horarios.map(([d, h]) => (
                    <tr key={d}><th scope="row">{d}</th><td>{h}</td></tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
            <motion.div id="local" variants={subir}>
              <TituloLetras texto="Onde fica" icone={<span className="h-ico"><IcoPin /></span>} />
              <p className="end">{site.endereco}</p>
              <p>WhatsApp: <b className="tel">{site.telefone || "a confirmar"}</b></p>
              {site.instagram && (
                <p><a className="link" href={`https://www.instagram.com/${encodeURIComponent(site.instagram.replace(/^@/, ""))}/`} target="_blank" rel="noopener noreferrer">{site.instagram}</a></p>
              )}
              <div className="acoes">
                <Magnetico forca={0.25}>
                  <motion.a className="btn btn-ghost" href={MAPA} target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                    <IcoPin /> Abrir no Google Maps
                  </motion.a>
                </Magnetico>
              </div>
            </motion.div>
          </div>
        </Secao>

        <Secao className="final">
          <TituloLetras texto="Bora dar um tapa no visual?" />
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
            transition={{ type: "spring", stiffness: 320, damping: 26 }}>
            <motion.span className="fixo-pulso" animate={{ scale: [1, 1.12], opacity: [0.6, 0] }} transition={{ duration: 1.8, repeat: Infinity }} aria-hidden="true" />
            <IcoChat /> Agendar no WhatsApp
          </motion.a>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
