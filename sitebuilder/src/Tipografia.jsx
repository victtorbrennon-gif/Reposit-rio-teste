// Animações de texto (ver .claude/skills/tipografia-barbearias/SKILL.md).
import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useReducedMotion, useScroll, useTransform } from "framer-motion";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+";

/* Letras sorteadas que "decodificam" até a palavra certa. */
export function Embaralhado({ texto, atraso = 0, className, as: Tag = "p" }) {
  const reduce = useReducedMotion();
  const [txt, setTxt] = useState(reduce ? texto : texto.replace(/[^\s·,]/g, " "));
  useEffect(() => {
    if (reduce) return setTxt(texto);
    let frame = 0, raf = 0;
    const total = texto.length;
    const inicio = performance.now() + atraso * 1000;
    const tick = (agora) => {
      if (agora < inicio) { raf = requestAnimationFrame(tick); return; }
      frame++;
      const revelados = Math.floor(frame / 2);
      setTxt(
        [...texto].map((c, i) => (i < revelados || /[\s·,]/.test(c) ? c : CHARS[(Math.random() * CHARS.length) | 0])).join("")
      );
      if (revelados < total) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [texto, atraso, reduce]);
  return <Tag className={className} aria-label={texto}><span aria-hidden="true">{txt}</span></Tag>;
}

/* Frase longa que acende palavra por palavra conforme a rolagem. */
function PalavraAcende({ w, progresso, i, n }) {
  const ini = i / n, fim = ini + 1 / n;
  const opacity = useTransform(progresso, [ini, fim], [0.14, 1]);
  const y = useTransform(progresso, [ini, fim], [6, 0]);
  return <motion.span className="acende-palavra" style={{ opacity, y }}>{w}</motion.span>;
}
export function TextoAcende({ texto }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 45%"] });
  const palavras = texto.split(" ");
  return (
    <p ref={ref} className="acende" aria-label={texto}>
      <span aria-hidden="true">
        {palavras.map((w, i) => (
          <PalavraAcende key={i} w={w} i={i} n={palavras.length} progresso={scrollYProgress} />
        ))}
      </span>
    </p>
  );
}

/* Letras pulam em onda ao passar o mouse. */
export function LetrasPulam({ texto }) {
  return (
    <motion.span className="pulam" initial="parado" whileHover="pula" aria-label={texto}>
      {[...texto].map((c, i) => (
        <motion.span key={i} aria-hidden="true" className="pulam-l"
          variants={{ parado: { y: 0 }, pula: { y: [0, -6, 0], transition: { duration: 0.4, delay: i * 0.025 } } }}>
          {c === " " ? " " : c}
        </motion.span>
      ))}
    </motion.span>
  );
}

/* Número que sobe de 0 até o valor quando aparece. */
export function Contador({ valor, prefixo = "" }) {
  const ref = useRef(null);
  const visto = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? Number(valor) : 0);
  useEffect(() => {
    if (!visto || reduce) return;
    const c = animate(0, Number(valor), { duration: 1.2, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [visto, valor, reduce]);
  return <b ref={ref} aria-label={`${prefixo}${valor}`}><span aria-hidden="true">{prefixo}{n}</span></b>;
}
