// Efeitos de animação reutilizáveis + a animação assinatura de cada tema.
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "framer-motion";

export const EASE = [0.22, 1, 0.36, 1];
const wrap = (min, max, v) => {
  const r = max - min;
  return ((((v - min) % r) + r) % r) + min;
};
const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const finoPonteiro = (e) => e.pointerType === "mouse" || e.pointerType === "pen";

/* Abertura: tesoura atravessa a tela cortando a linha e a cortina se parte em duas.
   Aparece uma vez por visita (sessionStorage) e some com "reduzir movimento". */
export const T_CORTE = 0.25, D_CORTE = 0.85, D_ABRE = 0.75;
export function Cortina({ nome }) {
  const reduce = useReducedMotion();
  const [mostrar] = useState(() => {
    try { if (sessionStorage.getItem("abertura-vista")) return false; sessionStorage.setItem("abertura-vista", "1"); } catch {}
    return true;
  });
  const [fim, setFim] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFim(true), (T_CORTE + D_CORTE + D_ABRE + 0.2) * 1000);
    return () => clearTimeout(t);
  }, []);
  if (reduce || !mostrar || fim) return null;
  const abre = { duration: D_ABRE, ease: [0.76, 0, 0.24, 1], delay: T_CORTE + D_CORTE };
  return (
    <div className="corte" aria-hidden="true">
      <motion.div className="corte-metade cima" animate={{ y: "-100%" }} transition={abre}>
        <motion.span className="corte-nome" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
          {nome}
        </motion.span>
      </motion.div>
      <motion.div className="corte-metade baixo" animate={{ y: "100%" }} transition={abre} />
      <motion.div className="corte-linha" animate={{ opacity: 0 }} transition={{ duration: 0.2, delay: T_CORTE + D_CORTE }}>
        <span className="corte-tracejado" />
        <motion.span className="corte-feito" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: D_CORTE, ease: "linear", delay: T_CORTE }} />
      </motion.div>
      <motion.svg className="corte-tesoura" viewBox="0 0 120 60" initial={{ x: "-20vw" }} animate={{ x: "112vw" }}
        transition={{ duration: D_CORTE * 1.12, ease: "linear", delay: T_CORTE - 0.08 }}>
        <g className="tes-sup">
          <path d="M55 27.5 L113 19 Q119 21.5 114 25.5 L63 33 Z" fill="currentColor" />
          <path d="M57 28 L31 18" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          <circle cx="22" cy="15" r="9" fill="none" stroke="currentColor" strokeWidth="4.5" />
        </g>
        <g className="tes-inf">
          <path d="M55 32.5 L113 41 Q119 38.5 114 34.5 L63 27 Z" fill="currentColor" />
          <path d="M57 32 L31 42" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          <circle cx="22" cy="45" r="9" fill="none" stroke="currentColor" strokeWidth="4.5" />
        </g>
        <circle cx="60" cy="30" r="3" className="tes-pino" />
      </motion.svg>
    </div>
  );
}

/* Botão magnético: puxa levemente na direção do mouse. */
export function Magnetico({ children, forca = 0.35 }) {
  const x = useSpring(0, { stiffness: 220, damping: 15, mass: 0.4 });
  const y = useSpring(0, { stiffness: 220, damping: 15, mass: 0.4 });
  return (
    <motion.span className="magnetico" style={{ x, y }}
      onPointerMove={(e) => {
        if (!finoPonteiro(e)) return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * forca);
        y.set((e.clientY - (r.top + r.height / 2)) * forca);
      }}
      onPointerLeave={() => { x.set(0); y.set(0); }}>
      {children}
    </motion.span>
  );
}

/* Cartão que inclina em 3D seguindo o mouse. */
export function Tilt({ children, className, variants }) {
  const rx = useSpring(0, { stiffness: 180, damping: 18 });
  const ry = useSpring(0, { stiffness: 180, damping: 18 });
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const brilho = useMotionTemplate`radial-gradient(320px circle at ${gx}% ${gy}%, var(--glow), transparent 65%)`;
  return (
    <motion.article className={className} variants={variants}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onPointerMove={(e) => {
        if (!finoPonteiro(e)) return;
        const r = e.currentTarget.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        ry.set((px - 0.5) * 14);
        rx.set((0.5 - py) * 14);
        gx.set(px * 100);
        gy.set(py * 100);
      }}
      onPointerLeave={() => { rx.set(0); ry.set(0); }}>
      <motion.span className="card-brilho" style={{ background: brilho }} aria-hidden="true" />
      {children}
    </motion.article>
  );
}

/* Título que entra letra por letra quando aparece na tela. */
const letraV = { hidden: { y: "105%", opacity: 0 }, show: { y: "0%", opacity: 1, transition: { duration: 0.6, ease: EASE } } };
export function TituloLetras({ texto, icone = null }) {
  return (
    <motion.h2 aria-label={texto} variants={{ hidden: {}, show: { transition: { staggerChildren: 0.022 } } }}>
      {icone}
      {texto.split(" ").map((w, i) => (
        <span key={i} className="t-palavra" aria-hidden="true">
          {[...w].map((c, j) => (
            <span key={j} className="t-letra"><motion.span variants={letraV}>{c}</motion.span></span>
          ))}
        </span>
      ))}
    </motion.h2>
  );
}

/* Faixa infinita que acelera e inverte com a velocidade da rolagem. */
export function Faixa({ itens, base = -3 }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const { scrollY } = useScroll();
  const vel = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const fator = useTransform(vel, [0, 1000], [0, 4], { clamp: false });
  const dir = useRef(1);
  useAnimationFrame((_, delta) => {
    if (reduce) return;
    let mv = dir.current * base * (delta / 1000);
    const f = fator.get();
    if (f < 0) dir.current = -1;
    else if (f > 0) dir.current = 1;
    mv += dir.current * mv * f;
    x.set(wrap(-50, 0, x.get() + mv));
  });
  const xp = useTransform(x, (v) => `${v}%`);
  const lista = [...itens, ...itens, ...itens, ...itens];
  return (
    <div className="faixa" aria-hidden="true">
      <motion.div className="faixa-trilho" style={{ x: xp }}>
        {lista.map((t, i) => (
          <span key={i}>{t}<i>✦</i></span>
        ))}
      </motion.div>
    </div>
  );
}

/* Mancha de luz que flutua devagar no fundo do topo. */
export function Mancha() {
  return (
    <motion.div className="mancha" aria-hidden="true"
      animate={{ x: ["0%", "-18%", "8%", "0%"], y: ["0%", "12%", "-8%", "0%"], scale: [1, 1.15, 0.95, 1] }}
      transition={{ duration: 18, ease: "easeInOut", repeat: Infinity }} />
  );
}

/* Holofote que segue o mouse dentro do topo. */
export function useHolofote() {
  const mx = useMotionValue(-999);
  const my = useMotionValue(-999);
  const bg = useMotionTemplate`radial-gradient(520px circle at ${mx}px ${my}px, var(--glow), transparent 70%)`;
  const onPointerMove = (e) => {
    if (!finoPonteiro(e)) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
  };
  return { bg, onPointerMove };
}

/* Partículas em canvas: "fumaca" (Cheiro Verde) ou "ouro" (Navalhada). Pausa fora da tela. */
export function Particulas({ modo, cor }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const c = ref.current;
    const ctx = c.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0, raf = 0, visivel = true;
    const resize = () => {
      w = c.clientWidth; h = c.clientHeight;
      c.width = w * dpr; c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const fumaca = modo === "fumaca";
    const novo = (inicio) =>
      fumaca
        ? { x: Math.random() * w, y: inicio ? Math.random() * h : h + 80, r: 30 + Math.random() * 50, vy: -(0.25 + Math.random() * 0.5), ph: Math.random() * 6.28, a: 0.06 + Math.random() * 0.08 }
        : { x: Math.random() * w, y: Math.random() * h, r: 0.6 + Math.random() * 1.8, vy: -(0.06 + Math.random() * 0.3), ph: Math.random() * 6.28, tw: 0.6 + Math.random() * 2.2 };
    const ps = Array.from({ length: fumaca ? 26 : 80 }, () => novo(true));
    const t0 = performance.now();
    const loop = () => {
      raf = 0;
      if (!visivel) return;
      const t = (performance.now() - t0) / 1000;
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        p.y += p.vy;
        const x = p.x + Math.sin(t * 0.6 + p.ph) * (fumaca ? 22 : 7);
        if (fumaca) {
          p.r += 0.09;
          const vida = Math.max(0, Math.min(1, p.y / h));
          const g = ctx.createRadialGradient(x, p.y, 0, x, p.y, p.r);
          g.addColorStop(0, rgba(cor, p.a * vida));
          g.addColorStop(1, rgba(cor, 0));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(x, p.y, p.r, 0, 6.283); ctx.fill();
          if (p.y < -p.r || vida <= 0.01) Object.assign(p, novo(false));
        } else {
          const al = 0.2 + 0.8 * Math.abs(Math.sin(t * p.tw + p.ph));
          ctx.fillStyle = rgba(cor, al);
          ctx.beginPath(); ctx.arc(x, p.y, p.r, 0, 6.283); ctx.fill();
          if (p.y < -6) { p.y = h + 6; p.x = Math.random() * w; }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    const io = new IntersectionObserver(([e]) => {
      visivel = e.isIntersecting;
      if (visivel && !raf) raf = requestAnimationFrame(loop);
    });
    io.observe(c);
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, [modo, cor, reduce]);
  return <canvas ref={ref} className="particulas" aria-hidden="true" />;
}

/* ALFA: poste de barbearia 3D girando + faixa listrada correndo no rodapé do topo. */
export function PosteAlfa() {
  return (
    <>
      <div className="poste3d" aria-hidden="true">
        <motion.div className="poste3d-in" initial={{ y: -60, opacity: 0, rotate: -6 }} animate={{ y: 0, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 90, damping: 14, delay: 1.1 }}>
          <div className="poste3d-tampa" />
          <div className="poste3d-corpo"><span /></div>
          <div className="poste3d-tampa baixo" />
        </motion.div>
      </div>
      <div className="listra-corrida" aria-hidden="true"><span /></div>
    </>
  );
}

/* CHEIRO VERDE: folhas flutuando por cima da fumaça. */
export function FolhasVerde() {
  const folhas = [
    { l: "8%", t: "18%", s: 46, d: 9, r: 25 },
    { l: "78%", t: "12%", s: 64, d: 11, r: -30 },
    { l: "88%", t: "62%", s: 40, d: 8, r: 40 },
    { l: "60%", t: "78%", s: 30, d: 10, r: -15 },
  ];
  return folhas.map((f, i) => (
    <motion.svg key={i} className="folha" viewBox="0 0 24 24" width={f.s} height={f.s} aria-hidden="true"
      style={{ left: f.l, top: f.t }}
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: 0.85, scale: 1, y: [0, -18, 0], rotate: [f.r, f.r + 18, f.r] }}
      transition={{ opacity: { duration: 1, delay: 1 + i * 0.15 }, scale: { duration: 1, delay: 1 + i * 0.15 }, y: { duration: f.d, repeat: Infinity, ease: "easeInOut" }, rotate: { duration: f.d * 1.3, repeat: Infinity, ease: "easeInOut" } }}>
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" fill="currentColor" opacity=".9" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </motion.svg>
  ));
}

/* NAVALHADA: lâmina dourada corta a tela e revela o título, que depois brilha. */
export function TituloNavalha({ texto }) {
  const reduce = useReducedMotion();
  const dur = 1.3, atraso = 1.2;
  return (
    <div className="navalha-titulo">
      <motion.h1 className="brilho-ouro" initial={reduce ? false : { clipPath: "inset(0 100% 0 0)" }}
        animate={{ clipPath: "inset(0 0% 0 0)" }} transition={{ duration: dur, ease: [0.65, 0, 0.35, 1], delay: atraso }}>
        {texto}
      </motion.h1>
      {!reduce && (
        <motion.span className="lamina" aria-hidden="true" initial={{ left: "0%", opacity: 0 }}
          animate={{ left: "100%", opacity: [0, 1, 1, 0] }}
          transition={{ duration: dur, ease: [0.65, 0, 0.35, 1], delay: atraso, opacity: { duration: dur, delay: atraso, times: [0, 0.1, 0.85, 1] } }} />
      )}
    </div>
  );
}

/* Rolagem suave (Lenis). Desliga com "reduzir movimento" e em telas de toque. */
import Lenis from "lenis";
export function RolagemSuave() {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce || !window.matchMedia("(pointer: fine)").matches) return;
    const lenis = new Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4), anchors: true });
    let raf = requestAnimationFrame(function loop(t) { lenis.raf(t); raf = requestAnimationFrame(loop); });
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, [reduce]);
  return null;
}

/* Cursor personalizado: ponto + anel que cresce sobre links e botões (só com mouse). */
export function Cursor() {
  const reduce = useReducedMotion();
  const x = useMotionValue(-100), y = useMotionValue(-100);
  const ax = useSpring(x, { stiffness: 260, damping: 26, mass: 0.5 });
  const ay = useSpring(y, { stiffness: 260, damping: 26, mass: 0.5 });
  const escala = useSpring(1, { stiffness: 300, damping: 22 });
  useEffect(() => {
    if (reduce || !window.matchMedia("(pointer: fine)").matches) return;
    document.documentElement.classList.add("tem-cursor");
    const move = (e) => {
      x.set(e.clientX); y.set(e.clientY);
      escala.set(e.target.closest("a,button,.card,.precos li") ? 2.2 : 1);
    };
    window.addEventListener("pointermove", move);
    return () => { window.removeEventListener("pointermove", move); document.documentElement.classList.remove("tem-cursor"); };
  }, [reduce]);
  if (reduce) return null;
  return (
    <>
      <motion.div className="cursor-anel" style={{ x: ax, y: ay, scale: escala }} aria-hidden="true" />
      <motion.div className="cursor-ponto" style={{ x, y }} aria-hidden="true" />
    </>
  );
}
