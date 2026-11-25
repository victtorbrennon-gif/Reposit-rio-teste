#!/usr/bin/env python3
"""Gera os sites estáticos das barbearias em sites/<slug>/.

Uso:  python3 ferramentas/gerar_sites.py

Cada site sai pronto para arrastar no Netlify (pasta inteira), já com
cabeçalhos de segurança (_headers), sem JavaScript e sem nada externo.
Veja SEGURANCA.md.
"""
from html import escape
from pathlib import Path
from urllib.parse import quote
import re
import shutil

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "sites"

AUTOR = "BR3NNOX"  # quem assina o site no rodapé

# demo=True: site de demonstração. Mostra a faixa "prévia", não é indexado
# pelo Google e os valores aparecem como exemplo.
BARBEARIAS = [
    {
        "slug": "barbearia-alfa",
        "nome": "Barbearia Alfa",
        "bairro": "Compensa",
        "endereco": "Av. Oscar Borel, 102 – Compensa, Manaus – AM",
        "telefone": "(92) 9138-4642",
        "instagram": "",
        "tema": "alfa",
        "slogan": "Corte na régua, sem enrolação.",
        "sobre": "Barbearia de bairro na Compensa, com atendimento rápido e corte bem feito. Chama no WhatsApp, escolhe o horário e vem.",
        "servicos": [
            ("Corte masculino", "35"), ("Barba", "25"), ("Corte + barba", "55"),
            ("Pezinho e acabamento", "15"), ("Sobrancelha", "10"), ("Corte infantil", "30"),
        ],
        "horarios": [("Segunda a sexta", "9h às 20h"), ("Sábado", "8h às 19h"), ("Domingo", "Fechado")],
        "demo": True,
    },
    {
        "slug": "cheiro-verde",
        "nome": "Barbearia Cheiro Verde",
        "bairro": "Cidade Nova",
        "endereco": "Rua Fraternidade, 36 – Cidade Nova 1, Manaus – AM",
        "telefone": "(92) 99423-8806",
        "instagram": "",
        "tema": "verde",
        "slogan": "Corte, barba e aquela resenha boa.",
        "sobre": "Barbearia e tabacaria na Cidade Nova 1. Ambiente tranquilo para cortar o cabelo, fazer a barba e trocar uma ideia.",
        "servicos": [
            ("Corte masculino", "30"), ("Barba na toalha quente", "25"), ("Corte + barba", "50"),
            ("Degradê", "35"), ("Pigmentação", "25"), ("Sobrancelha", "10"),
        ],
        "horarios": [("Segunda a sexta", "9h às 20h"), ("Sábado", "9h às 18h"), ("Domingo", "Fechado")],
        "demo": True,
    },
    {
        "slug": "navalhada",
        "nome": "Navalhada Barbershop",
        "bairro": "Adrianópolis",
        "endereco": "Rua Belo Horizonte, 990 – Adrianópolis, Manaus – AM",
        "telefone": "",
        "instagram": "",
        "tema": "navalha",
        "slogan": "Precisão na navalha. Estilo que dura.",
        "sobre": "Barbearia no coração de Adrianópolis para quem leva o visual a sério: corte técnico, barba desenhada e atendimento com hora marcada.",
        "servicos": [
            ("Corte assinatura", "60"), ("Barba completa", "45"), ("Corte + barba", "95"),
            ("Platinado", "180"), ("Hidratação de barba", "35"), ("Dia do noivo", "250"),
        ],
        "horarios": [("Segunda a sexta", "10h às 21h"), ("Sábado", "9h às 20h"), ("Domingo", "Fechado")],
        "demo": True,
    },
]

HEADERS = """/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Content-Security-Policy: default-src 'none'; style-src 'self'; img-src 'self' data:; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
"""

FAVICON = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="{bg}"/><path d="M18 46 L40 14 L46 18 L24 50 Z" fill="{fg}"/><circle cx="20" cy="47" r="5" fill="none" stroke="{fg}" stroke-width="3"/></svg>"""

TEMAS = {  # cores do favicon (o resto está no styles.css)
    "alfa": ("#141414", "#E0392B"),
    "verde": ("#123524", "#9BD66E"),
    "navalha": ("#0C0C0C", "#C9A45C"),
}


def wa_link(tel, nome):
    d = re.sub(r"\D", "", tel or "")
    if len(d) < 10:
        return None
    if not d.startswith("55"):
        d = "55" + d
    msg = quote(f"Olá, {nome}! Vi o site e quero agendar um horário.")
    return f"https://wa.me/{d}?text={msg}"


def ext(href, texto, cls=""):
    c = f' class="{cls}"' if cls else ""
    return f'<a{c} href="{escape(href)}" target="_blank" rel="noopener noreferrer">{texto}</a>'


def pagina(b):
    e = {k: escape(v) if isinstance(v, str) else v for k, v in b.items()}
    wa = wa_link(b["telefone"], b["nome"])
    mapa = "https://www.google.com/maps/search/?api=1&query=" + quote(f'{b["nome"]}, {b["endereco"]}')
    if wa:
        cta = ext(wa, "Agendar no WhatsApp", "btn btn-main")
        cta_fixo = ext(wa, "Agendar no WhatsApp", "fixo")
    else:
        cta = '<span class="btn btn-main is-off">WhatsApp: número a confirmar</span>'
        cta_fixo = ""
    demo = b["demo"]
    rodape_preco = "Valores de exemplo, a confirmar com a barbearia." if demo else "Valores sujeitos a alteração."
    servicos = "\n".join(
        f'<li><span>{escape(n)}</span><span class="dots" aria-hidden="true"></span><b>R$ {escape(p)}</b></li>'
        for n, p in b["servicos"]
    )
    horarios = "\n".join(f"<tr><th scope=\"row\">{escape(d)}</th><td>{escape(h)}</td></tr>" for d, h in b["horarios"])
    insta = ""
    if b["instagram"]:
        user = b["instagram"].lstrip("@")
        insta = "<p>" + ext(f"https://www.instagram.com/{quote(user)}/", "@" + escape(user), "link") + "</p>"
    faixa = (
        f'<div class="demo">Prévia de demonstração feita para a {e["nome"]}. Textos e valores são exemplos.</div>'
        if demo else ""
    )
    robots = '<meta name="robots" content="noindex, nofollow">' if demo else '<meta name="robots" content="index, follow">'
    tel_txt = e["telefone"] or "a confirmar"

    return f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e["nome"]} · Barbearia em {e["bairro"]}, Manaus</title>
<meta name="description" content="{e["nome"]}: barbearia em {e["bairro"]}, Manaus. {e["slogan"]} Agende pelo WhatsApp.">
{robots}
<meta name="theme-color" content="{TEMAS[b["tema"]][0]}">
<meta property="og:title" content="{e["nome"]}">
<meta property="og:description" content="{e["slogan"]}">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="styles.css">
</head>
<body class="t-{e["tema"]}">
{faixa}
<header class="topo">
  <div class="wrap topo-in">
    <a class="marca" href="#inicio"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M18 46 L40 14 L46 18 L24 50 Z"/><circle cx="20" cy="47" r="5"/></svg>{e["nome"]}</a>
    <nav aria-label="Seções"><a href="#servicos">Serviços</a><a href="#horarios">Horários</a><a href="#local">Local</a></nav>
  </div>
</header>

<main id="inicio">
  <section class="hero">
    <div class="wrap hero-in">
      <p class="eyebrow">Barbearia · {e["bairro"]}, Manaus</p>
      <h1>{e["slogan"]}</h1>
      <p class="lead">{e["sobre"]}</p>
      <div class="acoes">{cta}<a class="btn btn-ghost" href="#servicos">Ver serviços e valores</a></div>
    </div>
    <div class="poste" aria-hidden="true"></div>
  </section>

  <section id="servicos" class="bloco">
    <div class="wrap">
      <h2>Serviços</h2>
      <ul class="precos">
{servicos}
      </ul>
      <p class="obs">{rodape_preco}</p>
    </div>
  </section>

  <section class="bloco alt">
    <div class="wrap">
      <h2>Como agendar</h2>
      <ol class="passos">
        <li><b>Chama no WhatsApp</b><span>Manda uma mensagem pelo botão do site.</span></li>
        <li><b>Escolhe o horário</b><span>A gente responde com os horários livres.</span></li>
        <li><b>Chega e senta</b><span>Sem fila: seu horário fica reservado.</span></li>
      </ol>
    </div>
  </section>

  <section id="horarios" class="bloco">
    <div class="wrap duas">
      <div>
        <h2>Horários</h2>
        <table class="horas"><tbody>
{horarios}
        </tbody></table>
      </div>
      <div id="local">
        <h2>Onde fica</h2>
        <p class="end">{e["endereco"]}</p>
        <p>WhatsApp: <b class="tel">{tel_txt}</b></p>
        {insta}
        <p>{ext(mapa, "Abrir no Google Maps", "btn btn-ghost")}</p>
      </div>
    </div>
  </section>
</main>

<footer class="rodape">
  <div class="wrap">
    <p>© 2026 {e["nome"]} · {e["bairro"]}, Manaus – AM</p>
    <p class="assina">Site feito por {escape(AUTOR)}</p>
  </div>
</footer>
{cta_fixo}
</body>
</html>
"""


def main():
    css = (RAIZ / "ferramentas" / "styles.css").read_text(encoding="utf-8")
    for b in BARBEARIAS:
        pasta = SAIDA / b["slug"]
        if pasta.exists():
            shutil.rmtree(pasta)
        pasta.mkdir(parents=True)
        (pasta / "index.html").write_text(pagina(b), encoding="utf-8")
        (pasta / "styles.css").write_text(css, encoding="utf-8")
        h = HEADERS + ("  X-Robots-Tag: noindex, nofollow\n" if b["demo"] else "")
        (pasta / "_headers").write_text(h, encoding="utf-8")
        bg, fg = TEMAS[b["tema"]]
        (pasta / "favicon.svg").write_text(FAVICON.format(bg=bg, fg=fg), encoding="utf-8")
        print("ok", pasta.relative_to(RAIZ))


if __name__ == "__main__":
    main()
