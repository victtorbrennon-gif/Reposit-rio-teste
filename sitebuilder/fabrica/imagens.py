#!/usr/bin/env python3
"""Fábrica de sites: trata o logo e as fotos de um cliente.

Uso: python3 fabrica/imagens.py <pasta do cliente> <pasta de saída do site>
Imprime um JSON com o que foi feito (lido pelo fabrica.mjs).

Logo:  amplia se for pequeno (rede neural EDSR, sem inventar desenho), tira fundo liso,
       recorta, gera logo.webp (site), logo-icone.png (aba do navegador) e entrega/logo-hd.png.
Cor:   descobre a cor principal do logo (para pintar o site).
Fotos: corrige a rotação, reduz para 1400px, salva em JPG sem metadados (sem GPS).
"""
import colorsys
import json
import os
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps

AQUI = Path(__file__).resolve().parent
MODELO = AQUI / "modelos" / "EDSR_x4.pb"
EXT = {".png", ".jpg", ".jpeg", ".webp"}


def log(*a):
    print(*a, file=sys.stderr)


def garantir_modelo():
    """Baixa o modelo EDSR (38 MB, uma vez só). Sem ele, amplia do jeito comum."""
    if MODELO.exists():
        return True
    try:
        tmp = AQUI / "modelos" / "_edsr"
        MODELO.parent.mkdir(parents=True, exist_ok=True)
        if not tmp.exists():
            subprocess.run(["git", "clone", "-q", "--depth", "1", "https://github.com/Saafke/EDSR_Tensorflow", str(tmp)],
                           check=True, env={**os.environ, "GIT_LFS_SKIP_SMUDGE": "1"}, timeout=300)
        (tmp / "models" / "EDSR_x4.pb").rename(MODELO)
        return True
    except Exception as e:  # noqa: BLE001
        log("aviso: não consegui baixar o modelo EDSR:", e)
        return False


def ampliar(img: Image.Image, jpg: bool):
    """Amplia 4x. Retorna (imagem, método)."""
    try:
        import cv2  # opencv-contrib-python-headless==4.10.*
        import numpy as np
        if not hasattr(cv2, "dnn_superres") or not garantir_modelo():
            raise ImportError
        bgr = cv2.cvtColor(np.asarray(img.convert("RGB")), cv2.COLOR_RGB2BGR)
        if jpg:
            bgr = cv2.fastNlMeansDenoisingColored(bgr, None, 4, 4, 5, 15)  # tira os "quadradinhos" do JPG
        sr = cv2.dnn_superres.DnnSuperResImpl_create()
        sr.readModel(str(MODELO))
        sr.setModel("edsr", 4)
        up = sr.upsample(bgr)
        return Image.fromarray(cv2.cvtColor(up, cv2.COLOR_BGR2RGB)), "rede neural (EDSR 4x)"
    except Exception:  # noqa: BLE001
        base = img.convert("RGB")
        if jpg:
            base = base.filter(ImageFilter.MedianFilter(3))
        up = base.resize((base.width * 4, base.height * 4), Image.LANCZOS)
        return up.filter(ImageFilter.UnsharpMask(radius=2, percent=90, threshold=3)), "ampliação comum (instale opencv para ficar melhor)"


def cor_de_fundo(img: Image.Image):
    """Se a borda for de uma cor só, devolve essa cor; senão None."""
    rgb = img.convert("RGB")
    w, h = rgb.size
    px = rgb.load()
    borda = [px[x, y] for x in range(0, w, max(1, w // 60)) for y in (0, 1, h - 2, h - 1)]
    borda += [px[x, y] for y in range(0, h, max(1, h // 60)) for x in (0, 1, w - 2, w - 1)]
    med = tuple(sorted(c[i] for c in borda)[len(borda) // 2] for i in range(3))
    perto = sum(1 for c in borda if max(abs(c[i] - med[i]) for i in range(3)) < 28)
    return med if perto / len(borda) > 0.85 else None


def tirar_fundo(img: Image.Image, fundo):
    """Fundo liso -> transparente, com borda suave (desfaz a mistura com o fundo)."""
    import numpy as np
    a = np.asarray(img.convert("RGB")).astype(np.float32)
    f = np.array(fundo, dtype=np.float32)
    dist = np.abs(a - f).max(axis=2)
    alfa = np.clip((dist - 18) / (110 - 18), 0, 1)
    # Só é fundo o que encosta na borda da imagem: partes da mesma cor DENTRO do desenho
    # (ex.: letras brancas num logo de fundo branco) continuam no logo.
    try:
        import cv2
        perto = (dist < 110).astype(np.uint8)
        n, rotulos = cv2.connectedComponents(perto, connectivity=8)
        borda = np.unique(np.concatenate([rotulos[0], rotulos[-1], rotulos[:, 0], rotulos[:, -1]]))
        do_fundo = np.isin(rotulos, borda[borda > 0])
        alfa = np.where(do_fundo, alfa, 1.0)
    except ImportError:
        pass
    seguro = np.maximum(alfa[..., None], 1e-3)
    cor = np.clip((a - f * (1 - alfa[..., None])) / seguro, 0, 255)
    cor = np.where(alfa[..., None] >= 1, a, cor)
    return Image.fromarray(np.dstack([cor, alfa * 255]).astype(np.uint8), "RGBA")


def cor_principal(img: Image.Image):
    """Cor de destaque do logo (ou None se for preto/branco/prata) e se o logo é claro."""
    pequeno = img.convert("RGBA")
    pequeno.thumbnail((200, 200))
    dados = pequeno.get_flattened_data() if hasattr(pequeno, "get_flattened_data") else pequeno.getdata()
    pix = [p for p in dados if p[3] > 200]
    if not pix:
        return None, True
    hsv = [colorsys.rgb_to_hsv(r / 255, g / 255, b / 255) for r, g, b, _ in pix]
    claro = sum(v for _, _, v in hsv) / len(hsv) > 0.5
    vivos = [(h, p) for (h, s, v), p in zip(hsv, pix) if s > 0.35 and v > 0.3]
    if len(vivos) / len(pix) < 0.08:
        return None, claro
    caixas = [0] * 36
    for h, _ in vivos:
        caixas[int(h * 36) % 36] += 1
    alvo = max(range(36), key=caixas.__getitem__)
    sel = sorted((p for h, p in vivos if int(h * 36) % 36 == alvo), key=lambda p: sum(p[:3]))
    r, g, b, _ = sel[len(sel) // 2]
    return f"#{r:02X}{g:02X}{b:02X}", claro


def tratar_logo(pasta: Path, saida: Path, entrega: Path):
    arquivos = sorted(p for p in pasta.glob("logo.*") if p.suffix.lower() in EXT)
    if not arquivos:
        return None
    arq = arquivos[0]
    img = ImageOps.exif_transpose(Image.open(arq))
    rel = {"original": f"{img.width}x{img.height}", "ampliado": None, "fundo_removido": False}
    tem_transparencia = img.mode in ("RGBA", "LA", "P") and img.convert("RGBA").getextrema()[3][0] < 250
    fundo = None if tem_transparencia else cor_de_fundo(img)
    if max(img.size) < 700:
        alfa = img.convert("RGBA").getchannel("A") if tem_transparencia else None
        img, metodo = ampliar(img, arq.suffix.lower() in (".jpg", ".jpeg"))
        if alfa is not None:
            img.putalpha(alfa.resize(img.size, Image.LANCZOS))
        rel["ampliado"] = metodo
    img = img.convert("RGBA") if tem_transparencia else img
    if fundo is not None:
        img = tirar_fundo(img, fundo)
        rel["fundo_removido"] = True
    img = img.convert("RGBA")
    caixa = img.getbbox()
    if caixa:
        img = img.crop(caixa)
    entrega.mkdir(parents=True, exist_ok=True)
    img.save(entrega / "logo-hd.png", optimize=True)
    web = img.copy()
    web.thumbnail((800, 800), Image.LANCZOS)
    web.save(saida / "logo.webp", "WEBP", quality=88, method=6)
    ic = img.copy()
    ic.thumbnail((128, 128), Image.LANCZOS)
    ic.save(saida / "logo-icone.png", optimize=True)
    cor, claro = cor_principal(img)
    rel.update({"final": f"{img.width}x{img.height}", "cor": cor, "claro": claro})
    return rel


def tratar_fotos(pasta: Path, saida: Path):
    fotos = sorted(p for p in (pasta / "fotos").glob("*") if p.suffix.lower() in EXT) if (pasta / "fotos").exists() else []
    ignoradas = sorted(p.name for p in (pasta / "fotos").glob("*") if p.suffix.lower() not in EXT) if (pasta / "fotos").exists() else []
    nomes = []
    for i, p in enumerate(fotos[:6], 1):
        img = ImageOps.exif_transpose(Image.open(p)).convert("RGB")  # gira certo e descarta EXIF/GPS
        img.thumbnail((1400, 1400), Image.LANCZOS)
        nome = f"foto-{i}.jpg"
        img.save(saida / nome, "JPEG", quality=80, optimize=True, progressive=True)
        nomes.append(nome)
    return nomes, ignoradas, max(0, len(fotos) - 6)


def main():
    pasta, saida = Path(sys.argv[1]), Path(sys.argv[2])
    saida.mkdir(parents=True, exist_ok=True)
    for velho in list(saida.glob("foto-*.jpg")) + list(saida.glob("logo*")):
        velho.unlink()
    logo = tratar_logo(pasta, saida, pasta / "entrega")
    fotos, ignoradas, sobrando = tratar_fotos(pasta, saida)
    print(json.dumps({"logo": logo, "fotos": fotos, "fotos_ignoradas": ignoradas, "fotos_a_mais": sobrando}, ensure_ascii=False))


if __name__ == "__main__":
    main()
