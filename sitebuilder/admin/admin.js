// Painel do barbeiro: lista, cancela e bloqueia horários. Senha fica só nesta aba (sessionStorage).
(() => {
  const $ = (id) => document.getElementById(id);
  const API = "/api/admin";
  let senha = "";
  try { senha = sessionStorage.getItem("senha-agenda") || ""; } catch {}
  let data = hojeManaus();
  let timer = null;

  function hojeManaus() { return new Date(Date.now() - 4 * 3600000).toISOString().slice(0, 10); }
  function somaDias(d, n) { return new Date(Date.parse(d + "T12:00:00Z") + n * 86400000).toISOString().slice(0, 10); }
  const SEM = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  function dataLonga(d) { const x = new Date(d + "T12:00:00Z"); return `${SEM[x.getUTCDay()]}, ${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`; }
  const hm = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
  function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function msg(t) { $("msg").textContent = t || ""; $("msg").hidden = !t; }

  async function api(method, query, body) {
    const r = await fetch(API + (query || ""), {
      method, cache: "no-store",
      headers: { Authorization: "Bearer " + senha, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { sair(); throw new Error("Senha incorreta."); }
    if (!r.ok) throw new Error(j.erro || "Erro.");
    return j;
  }

  function entrar() {
    $("login").hidden = true; $("painel").hidden = false; $("sair").hidden = false;
    $("data").value = data; carregar();
    clearInterval(timer);
    timer = setInterval(() => document.visibilityState === "visible" && carregar(true), 20000);
  }
  function sair() {
    senha = ""; try { sessionStorage.removeItem("senha-agenda"); } catch {}
    clearInterval(timer);
    $("login").hidden = false; $("painel").hidden = true; $("sair").hidden = true;
  }

  async function carregar(silencioso) {
    try {
      const j = await api("GET", "?data=" + data);
      msg("");
      render(j);
      $("atualizado").textContent = "Atualizado " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch (e) { if (!silencioso) msg(e.message); }
  }

  function render({ reservas, bloqueios, grade }) {
    $("titulo-dia").textContent = dataLonga(data) + (data === hojeManaus() ? " (hoje)" : "");
    $("n-res").textContent = reservas.length;
    const total = reservas.reduce((s, r) => s + (Number(r.preco) || 0), 0);
    $("total").textContent = "R$ " + total.toLocaleString("pt-BR");

    const ul = $("lista"); ul.replaceChildren();
    if (!reservas.length) ul.append(el("li", "vazio", "Nenhum agendamento neste dia."));
    for (const r of reservas) {
      const li = el("li", "item");
      const top = el("div", "item-top");
      top.append(el("span", "hora", `${r.hora} – ${r.fim}`), el("span", "cod", "Código " + r.id));
      li.append(top, el("div", null, r.nome), el("div", "serv", `${r.servico} · R$ ${r.preco}`));
      const ac = el("div", "acoes");
      const tel = String(r.telefone).replace(/\D/g, "");
      const wa = el("a", "wa", "WhatsApp " + tel.replace(/^(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3"));
      wa.href = "https://wa.me/55" + tel.replace(/^55/, "");
      wa.target = "_blank"; wa.rel = "noopener noreferrer";
      const cancel = el("button", "cancelar", "Cancelar");
      cancel.type = "button";
      cancel.onclick = async () => {
        if (!cancel.classList.contains("armado")) { cancel.classList.add("armado"); cancel.textContent = "Toque de novo para cancelar"; return; }
        cancel.disabled = true;
        try { await api("POST", "", { acao: "cancelar", data, id: r.id }); carregar(); } catch (e) { msg(e.message); cancel.disabled = false; }
      };
      ac.append(wa, cancel); li.append(ac); ul.append(li);
    }

    const ocup = new Map();
    for (const r of reservas) for (let m = hm(r.hora); m < hm(r.fim); m += 30) ocup.set(m, r.nome);
    const g = $("grade"); g.replaceChildren();
    if (!grade.length) g.append(el("p", "vazio", "Fechado neste dia."));
    for (const h of grade) {
      const b = el("button", "slot", h); b.type = "button";
      const quem = ocup.get(hm(h));
      if (quem) { b.classList.add("ocupado"); b.append(el("small", null, quem.split(" ")[0])); b.disabled = true; }
      else if (bloqueios.includes(h)) { b.classList.add("bloqueado"); b.append(el("small", null, "bloqueado")); b.onclick = () => alternar(h, false); }
      else { b.append(el("small", null, "livre")); b.onclick = () => alternar(h, true); }
      g.append(b);
    }
  }

  async function alternar(hora, bloquear) {
    try { await api("POST", "", { acao: bloquear ? "bloquear" : "liberar", data, hora }); carregar(); }
    catch (e) { msg(e.message); }
  }

  function irPara(d) { data = d; $("data").value = d; carregar(); }
  $("ant").onclick = () => irPara(somaDias(data, -1));
  $("prox").onclick = () => irPara(somaDias(data, 1));
  $("hoje").onclick = () => irPara(hojeManaus());
  $("data").onchange = (e) => e.target.value && irPara(e.target.value);
  $("sair").onclick = sair;
  $("login").onsubmit = async (e) => {
    e.preventDefault();
    senha = $("senha").value.trim();
    $("login-erro").hidden = true;
    try {
      await api("GET", "?data=" + data);
      try { sessionStorage.setItem("senha-agenda", senha); } catch {}
      $("senha").value = "";
      entrar();
    } catch (err) { $("login-erro").textContent = err.message; $("login-erro").hidden = false; }
  };
  if (senha) entrar();
})();
