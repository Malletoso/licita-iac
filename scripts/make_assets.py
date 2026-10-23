"""Prepara as imagens do app a partir dos originais em static/originais/.

Gera:
  static/icons/*.png         ícones do app instalável (PWA)
  static/brand/*.png         logo, brasão e marca d'água em tamanho de uso
  src/assets.js              as mesmas imagens em data URI, para o app e as peças .docx

Uso: python3 scripts/make_assets.py   (requer Pillow)
"""
import base64
import io
import json
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
ORIG = RAIZ / 'static' / 'originais'
BRAND = RAIZ / 'static' / 'brand'
ICONS = RAIZ / 'static' / 'icons'
OPACIDADE_MARCA = 0.10  # brasão ao fundo das peças


def recortar(im):
    """Corta as bordas transparentes (o branco interno da imagem é preservado)."""
    im = im.convert('RGBA')
    return im.crop(im.getchannel('A').getbbox())


def altura(im, h):
    return im.resize((round(im.width * h / im.height), h), Image.LANCZOS)


def esmaecer(im, opacidade):
    im = im.copy()
    a = im.getchannel('A').point(lambda v: round(v * opacidade))
    im.putalpha(a)
    return im


def png_bytes(im):
    buf = io.BytesIO()
    im.save(buf, 'PNG', optimize=True)
    return buf.getvalue()


def data_uri(im):
    return 'data:image/png;base64,' + base64.b64encode(png_bytes(im)).decode()


def icone(logo, tamanho, margem, arredondado):
    fundo = Image.new('RGBA', (tamanho, tamanho), (0, 0, 0, 0))
    from PIL import ImageDraw
    d = ImageDraw.Draw(fundo)
    if arredondado:
        d.rounded_rectangle([0, 0, tamanho - 1, tamanho - 1], radius=round(tamanho * 0.22), fill=(255, 255, 255, 255))
    else:
        d.rectangle([0, 0, tamanho, tamanho], fill=(255, 255, 255, 255))
    area = round(tamanho * (1 - 2 * margem))
    k = min(area / logo.width, area / logo.height)
    l = logo.resize((round(logo.width * k), round(logo.height * k)), Image.LANCZOS)
    fundo.alpha_composite(l, ((tamanho - l.width) // 2, (tamanho - l.height) // 2))
    return fundo


def main():
    BRAND.mkdir(parents=True, exist_ok=True)
    ICONS.mkdir(parents=True, exist_ok=True)
    logo = recortar(Image.open(ORIG / 'logo-licita-iac.png'))
    brasao = recortar(Image.open(ORIG / 'brasao-iacanga.png'))

    logo_ui = altura(logo, 96)
    brasao_cab = altura(brasao, 220)
    marca = esmaecer(altura(brasao, 480), OPACIDADE_MARCA).quantize(colors=48, method=Image.Quantize.FASTOCTREE).convert('RGBA')

    logo_ui.save(BRAND / 'logo.png', optimize=True)
    brasao_cab.save(BRAND / 'brasao-iacanga.png', optimize=True)
    marca.save(BRAND / 'marca-iacanga.png', optimize=True)

    icone(logo, 192, 0.10, True).save(ICONS / 'icon-192.png', optimize=True)
    icone(logo, 512, 0.10, True).save(ICONS / 'icon-512.png', optimize=True)
    icone(logo, 512, 0.20, False).save(ICONS / 'icon-maskable-512.png', optimize=True)
    icone(logo, 64, 0.06, True).save(ICONS / 'favicon-64.png', optimize=True)

    assets = {
        'logo': data_uri(logo_ui),
        'brasaoIacanga': data_uri(brasao_cab),
        'marcaIacanga': data_uri(marca),
        'brasaoProporcao': round(brasao.width / brasao.height, 4),
    }
    js = ('/* Gerado por scripts/make_assets.py — não editar à mão */\n'
          f'const ASSETS = {json.dumps(assets)};\n'
          "if (typeof module !== 'undefined') module.exports = ASSETS;\n")
    (RAIZ / 'src' / 'assets.js').write_text(js)
    print('assets.js:', round(len(js) / 1024), 'KB')


if __name__ == '__main__':
    main()
