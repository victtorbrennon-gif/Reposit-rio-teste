// Portfólio BR3NNOX: animações leves, sem dependências.
document.documentElement.classList.add("js");
const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;

// título: cada palavra sobe em sequência
for (const h of document.querySelectorAll(".titulo-anim")) {
  let i = 0;
  const quebrar = (no) => {
    for (const filho of [...no.childNodes]) {
      if (filho.nodeType === 3) {
        const frag = document.createDocumentFragment();
        for (const parte of filho.textContent.split(/(\s+)/)) {
          if (!parte) continue;
          if (/^\s+$/.test(parte)) { frag.append(parte); continue; }
          const p = document.createElement("span"); p.className = "p";
          const s = document.createElement("span"); s.textContent = parte;
          s.style.animationDelay = (i++ * 70) + "ms";
          p.append(s); frag.append(p);
        }
        filho.replaceWith(frag);
      } else if (filho.nodeType === 1) quebrar(filho);
    }
  };
  h.setAttribute("aria-label", h.textContent);
  quebrar(h);
  for (const p of h.querySelectorAll(".p")) p.setAttribute("aria-hidden", "true");
}

// revelar ao rolar
const io = new IntersectionObserver((es) => {
  for (const e of es) if (e.isIntersecting) { e.target.classList.add("visto"); io.unobserve(e.target); }
}, { rootMargin: "0px 0px -10% 0px" });
document.querySelectorAll(".revelar").forEach((el, i) => { el.style.transitionDelay = (i % 3) * 90 + "ms"; io.observe(el); });

// agenda ao vivo: alguém marca um horário, ele some e a mensagem chega no WhatsApp
const grade = document.getElementById("av-grade");
if (grade) {
  const HORAS = ["09:00", "09:30", "10:00", "11:00", "13:30", "14:00", "15:00", "15:30", "16:30", "17:00", "18:00", "19:30"];
  const SERV = ["Corte", "Corte + Barba", "Barba", "Degradê", "Corte + Sobrancelha"];
  const NOMES = ["Lucas", "Rafael", "Diego", "Mateus", "João", "Bruno", "Kaio", "Pedro"];
  const msg = document.getElementById("av-msg"), txt = document.getElementById("av-texto");
  const els = HORAS.map((h) => { const d = document.createElement("div"); d.className = "av-h"; d.textContent = h; grade.append(d); return d; });
  let livres = [...els];
  const passo = () => {
    if (livres.length < 4) { els.forEach((e) => e.classList.remove("sumiu", "escolhido")); livres = [...els]; }
    const alvo = livres.splice(Math.floor(Math.random() * livres.length), 1)[0];
    alvo.classList.add("escolhido");
    msg.classList.remove("on");
    setTimeout(() => {
      txt.textContent = `${NOMES[Math.floor(Math.random() * NOMES.length)]} marcou ${SERV[Math.floor(Math.random() * SERV.length)]} às ${alvo.textContent}`;
      msg.classList.add("on");
      alvo.classList.remove("escolhido"); alvo.classList.add("sumiu");
    }, 900);
  };
  if (calmo) { els[6].classList.add("sumiu"); msg.classList.add("on"); }
  else { setTimeout(passo, 1200); setInterval(passo, 3200); }
}
