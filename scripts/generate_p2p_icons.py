#!/usr/bin/env python3
"""
Genera todos los íconos del APK P2P Ledger y de la PWA.

Diseño:
  - Fondo: gradiente diagonal esmeralda → teal (matching del header de la app)
  - Símbolo: dos flechas horizontales contrapuestas (P2P) en blanco, con un círculo
    dorado en el centro simulando una moneda que viaja entre las dos partes.

Salidas:
  - public/icon.svg                (SVG fuente, también para la web)
  - public/logo.svg                (logo simplificado sin fondo)
  - public/icon-192.png            (PWA)
  - public/icon-512.png            (PWA)
  - public/apple-touch-icon.png    (iOS Web Clip, 180x180 con fondo)
  - android/.../mipmap-*/ic_launcher.png            (48 / 72 / 96 / 144 / 192)
  - android/.../mipmap-*/ic_launcher_round.png      (mismos tamaños, circular)
  - android/.../mipmap-*/ic_launcher_foreground.png (108dp en los 5 densities para adaptive icon)
  - android/.../drawable-v24/ic_launcher_foreground.xml  (vector foreground)
  - android/.../drawable/ic_launcher_background.xml      (vector background, gradiente esmeralda sólido)
"""

import os
import cairosvg
from PIL import Image, ImageDraw, ImageFilter
import io
import math

ROOT = "/home/z/my-project"
PUB = f"{ROOT}/public"
ANDROID_RES = f"{ROOT}/android/app/src/main/res"

# Colores del branding (matching del header)
EMERALD = "#10b981"
TEAL = "#14b8a6"
DARK = "#0f172a"
GOLD = "#fbbf24"

# ---------------------------------------------------------------------------
# 1) SVG fuente del ícono P2P (versión cuadrada con fondo)
# ---------------------------------------------------------------------------
P2P_ICON_SVG = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{EMERALD}"/>
      <stop offset="100%" stop-color="{TEAL}"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fde68a"/>
      <stop offset="50%" stop-color="{GOLD}"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="6"/>
      <feOffset dx="0" dy="4"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Fondo redondeado -->
  <rect x="0" y="0" width="512" height="512" rx="96" fill="url(#bg)"/>

  <!-- Flecha superior: izquierda → derecha (venta, "envío") -->
  <g filter="url(#shadow)" fill="#ffffff">
    <rect x="128" y="180" width="216" height="36" rx="18"/>
    <polygon points="344,158 392,198 344,238"/>
  </g>

  <!-- Flecha inferior: derecha → izquierda (compra, "recepción") -->
  <g filter="url(#shadow)" fill="#ffffff">
    <rect x="168" y="296" width="216" height="36" rx="18"/>
    <polygon points="168,274 120,314 168,354"/>
  </g>

  <!-- Moneda central: representa el activo transferido -->
  <g filter="url(#shadow)">
    <circle cx="256" cy="256" r="58" fill="url(#gold)" stroke="#ffffff" stroke-width="5"/>
    <text x="256" y="256"
          font-family="'Segoe UI', Roboto, Arial, sans-serif"
          font-size="56" font-weight="700"
          text-anchor="middle" dominant-baseline="central"
          fill="#78350f">$</text>
  </g>
</svg>
"""

# Logo sin fondo (para el header / favicon si se quiere usar después)
P2P_LOGO_SVG = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{EMERALD}"/>
      <stop offset="100%" stop-color="{TEAL}"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fde68a"/>
      <stop offset="50%" stop-color="{GOLD}"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>
  <g>
    <rect x="128" y="180" width="216" height="36" rx="18" fill="url(#bg)"/>
    <polygon points="344,158 392,198 344,238" fill="url(#bg)"/>
    <rect x="168" y="296" width="216" height="36" rx="18" fill="url(#bg)"/>
    <polygon points="168,274 120,314 168,354" fill="url(#bg)"/>
    <circle cx="256" cy="256" r="58" fill="url(#gold)" stroke="#ffffff" stroke-width="5"/>
    <text x="256" y="256"
          font-family="'Segoe UI', Roboto, Arial, sans-serif"
          font-size="56" font-weight="700"
          text-anchor="middle" dominant-baseline="central"
          fill="#78350f">$</text>
  </g>
</svg>
"""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def svg_to_png(svg: str, size: int, output_path: str, bg: str = None, radius: int = 0) -> None:
    """Convierte un SVG a PNG de tamaño `size` x `size`."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    if bg is None:
        # Sin fondo adicional: el SVG ya lo trae
        cairosvg.svg2png(
            bytestring=svg.encode("utf-8"),
            write_to=output_path,
            output_width=size,
            output_height=size,
        )
    else:
        # Generar PNG del SVG y luego composar con PIL sobre un fondo sólido
        png_bytes = cairosvg.svg2png(
            bytestring=svg.encode("utf-8"),
            output_width=size,
            output_height=size,
        )
        with Image.open(io.BytesIO(png_bytes)) as svg_img:
            svg_img = svg_img.convert("RGBA")
            # Fondo
            canvas = Image.new("RGBA", (size, size), bg)
            canvas.alpha_composite(svg_img)
            if radius > 0:
                # Aplicar máscara circular
                mask = Image.new("L", (size, size), 0)
                md = ImageDraw.Draw(mask)
                md.ellipse((0, 0, size, size), fill=255)
                canvas.putalpha(mask)
            canvas.save(output_path, "PNG")


def make_round_png(svg: str, size: int, output_path: str) -> None:
    """Genera PNG circular recortando el SVG cuadrado."""
    png_bytes = cairosvg.svg2png(
        bytestring=svg.encode("utf-8"),
        output_width=size,
        output_height=size,
    )
    with Image.open(io.BytesIO(png_bytes)) as img:
        img = img.convert("RGBA")
        mask = Image.new("L", (size, size), 0)
        md = ImageDraw.Draw(mask)
        md.ellipse((0, 0, size, size), fill=255)
        # Suavizar borde del círculo con un leve blur
        mask = mask.filter(ImageFilter.GaussianBlur(radius=0.5))
        result = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        result.paste(img, (0, 0), mask)
        result.save(output_path, "PNG")


def make_foreground_png(size: int, output_path: str) -> None:
    """
    Genera el foreground del adaptive icon de Android:
    - Lienzo transparente 108dp con el símbolo centrado (~62% del área)
    - Símbolo: mismas flechas + moneda, en colores sólidos (sin fondo)
    """
    # El foreground ocupa el 62% central del lienzo (sistema recorta ~18% por borde)
    # Trabajamos a 4x el tamaño y reescalamos para nitidez
    canvas_size = size * 4
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))

    # Dibujar el símbolo manualmente con PIL para tener control total
    draw = ImageDraw.Draw(img, "RGBA")

    # Coordenadas relativas al canvas
    c = canvas_size / 2  # centro

    # Tamaños base
    arrow_len = int(canvas_size * 0.34)
    arrow_thick = int(canvas_size * 0.058)
    arrow_offset_y = int(canvas_size * 0.13)  # distancia vertical entre flechas
    coin_r = int(canvas_size * 0.12)

    # Flecha superior (apuntando derecha)
    fy1 = c - arrow_offset_y
    draw.rounded_rectangle(
        (c - arrow_len / 2, fy1 - arrow_thick / 2,
         c + arrow_len / 2 - arrow_thick * 0.7, fy1 + arrow_thick / 2),
        radius=arrow_thick // 2,
        fill=(255, 255, 255, 255),
    )
    # Punta de flecha derecha (triángulo)
    head_size = arrow_thick * 1.8
    draw.polygon(
        [
            (c + arrow_len / 2 - arrow_thick * 0.5, fy1 - head_size / 2),
            (c + arrow_len / 2 + head_size * 0.4, fy1),
            (c + arrow_len / 2 - arrow_thick * 0.5, fy1 + head_size / 2),
        ],
        fill=(255, 255, 255, 255),
    )

    # Flecha inferior (apuntando izquierda)
    fy2 = c + arrow_offset_y
    draw.rounded_rectangle(
        (c - arrow_len / 2 + arrow_thick * 0.7, fy2 - arrow_thick / 2,
         c + arrow_len / 2, fy2 + arrow_thick / 2),
        radius=arrow_thick // 2,
        fill=(255, 255, 255, 255),
    )
    head_size2 = arrow_thick * 1.8
    draw.polygon(
        [
            (c - arrow_len / 2 + arrow_thick * 0.5, fy2 - head_size2 / 2),
            (c - arrow_len / 2 - head_size2 * 0.4, fy2),
            (c - arrow_len / 2 + arrow_thick * 0.5, fy2 + head_size2 / 2),
        ],
        fill=(255, 255, 255, 255),
    )

    # Moneda central
    # Outer ring blanco
    draw.ellipse(
        (c - coin_r - 4, c - coin_r - 4, c + coin_r + 4, c + coin_r + 4),
        fill=(255, 255, 255, 255),
    )
    # Disco dorado
    draw.ellipse(
        (c - coin_r, c - coin_r, c + coin_r, c + coin_r),
        fill=(251, 191, 36, 255),  # fbbf24
    )
    # Borde oscuro interior (highlight)
    draw.ellipse(
        (c - coin_r, c - coin_r, c + coin_r, c + coin_r),
        outline=(217, 119, 6, 255),  # d97706
        width=max(2, canvas_size // 200),
    )
    # Símbolo $ con texto
    try:
        from PIL import ImageFont
        # Buscar una font TTF disponible
        font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
        if os.path.exists(font_path):
            font = ImageFont.truetype(font_path, int(coin_r * 1.4))
        else:
            font = ImageFont.load_default()
    except Exception:
        font = ImageFont.load_default()

    # Dibujar el "$" centrado
    text = "$"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = c - tw / 2 - bbox[0]
    ty = c - th / 2 - bbox[1]
    draw.text((tx, ty), text, font=font, fill=(120, 53, 15, 255))  # #78350f

    # Reescalar al tamaño final
    img = img.resize((size, size), Image.LANCZOS)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, "PNG")


# ---------------------------------------------------------------------------
# 2) Background XML simplificado (gradiente esmeralda → teal sólido)
# ---------------------------------------------------------------------------
BG_XML = f"""<?xml version="1.0" encoding="utf-8"?>
<!--
  Fondo del adaptive icon de P2P Ledger.
  Color sólido esmeralda-600 (#10b981) — el símbolo va en el foreground.
-->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportHeight="108"
    android:viewportWidth="108">
    <path
        android:fillColor="{EMERALD}"
        android:pathData="M0,0h108v108h-108z" />
</vector>
"""

# ---------------------------------------------------------------------------
# 3) Foreground XML (vector) del símbolo P2P
# ---------------------------------------------------------------------------
FG_XML = """<?xml version="1.0" encoding="utf-8"?>
<!--
  Foreground del adaptive icon de P2P Ledger.
  Dos flechas horizontales contrapuestas + moneda dorada central con "$".
  Lienzo 108dp, símbolo centrado en zona segura (~66-72% del área).
-->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportHeight="108"
    android:viewportWidth="108">

    <!-- Flecha superior: → (venta/envío) -->
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M30,42 L66,42 L66,36 L78,45 L66,54 L66,48 L30,48 Z" />

    <!-- Flecha inferior: ← (compra/recepción) -->
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M42,60 L78,60 L78,66 L42,66 L42,72 L30,63 L42,54 Z" />

    <!-- Moneda central: anillo blanco -->
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M54,38 m-12,0 a12,12 0 1,0 24,0 a12,12 0 1,0 -24,0 Z" />
    <!-- Moneda central: disco dorado -->
    <path
        android:fillColor="#FBBF24"
        android:pathData="M54,38 m-10,0 a10,10 0 1,0 20,0 a10,10 0 1,0 -20,0 Z" />
    <!-- Símbolo $ (simplificado como trazo) -->
    <path
        android:fillColor="#78350F"
        android:pathData="M55,32 L53,32 L53,33.5 C51.5,33.7 50.5,34.5 50.5,36 C50.5,37.5 51.7,38.3 53.5,38.7 L53.5,41 C52.8,40.9 52.3,40.5 52,40 L50.5,40.5 C50.9,41.8 52,42.5 53.5,42.7 L53.5,44 L55,44 L55,42.7 C56.7,42.5 57.8,41.6 57.8,40.1 C57.8,38.5 56.6,37.7 54.5,37.2 L54.5,35 C55.1,35.1 55.6,35.4 55.9,35.9 L57.3,35.4 C56.9,34.2 56,33.6 55,33.4 Z M53.5,35.2 L53.5,36.7 C52.7,36.5 52.3,36.2 52.3,35.7 C52.3,35.2 52.7,34.9 53.5,34.8 Z M54.5,39 L54.5,40.5 C55.4,40.7 55.9,41 55.9,41.5 C55.9,42.1 55.4,42.4 54.5,42.5 Z" />
</vector>
"""


def write_text_file(path: str, content: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


# ---------------------------------------------------------------------------
# Generación
# ---------------------------------------------------------------------------
def main():
    print("[1/4] Escribiendo SVGs fuente…")
    write_text_file(f"{PUB}/icon.svg", P2P_ICON_SVG)
    write_text_file(f"{PUB}/logo.svg", P2P_LOGO_SVG)

    print("[2/4] Generando PNGs de PWA…")
    # PWA: cuadrados con fondo (el SVG ya lo incluye)
    svg_to_png(P2P_ICON_SVG, 192, f"{PUB}/icon-192.png")
    svg_to_png(P2P_ICON_SVG, 512, f"{PUB}/icon-512.png")
    svg_to_png(P2P_ICON_SVG, 180, f"{PUB}/apple-touch-icon.png")
    # También favicon y maskable
    svg_to_png(P2P_ICON_SVG, 32, f"{PUB}/favicon-32.png")
    svg_to_png(P2P_ICON_SVG, 16, f"{PUB}/favicon-16.png")

    print("[3/4] Generando PNGs de Android (ic_launcher + ic_launcher_round)…")
    densities = {
        "mipmap-mdpi":    48,
        "mipmap-hdpi":    72,
        "mipmap-xhdpi":   96,
        "mipmap-xxhdpi":  144,
        "mipmap-xxxhdpi": 192,
    }
    for folder, size in densities.items():
        svg_to_png(P2P_ICON_SVG, size, f"{ANDROID_RES}/{folder}/ic_launcher.png")
        make_round_png(P2P_ICON_SVG, size, f"{ANDROID_RES}/{folder}/ic_launcher_round.png")

    print("[4/4] Generando foreground del adaptive icon…")
    # Foreground: lienzo transparente con el símbolo centrado
    # Android expects 108dp × 108dp; se generan en cada densidad.
    fg_densities = {
        "mipmap-mdpi":    108,
        "mipmap-hdpi":    162,
        "mipmap-xhdpi":   216,
        "mipmap-xxhdpi":  324,
        "mipmap-xxxhdpi": 432,
    }
    for folder, size in fg_densities.items():
        make_foreground_png(size, f"{ANDROID_RES}/{folder}/ic_launcher_foreground.png")

    # Background XML (drawable, no density-specific)
    write_text_file(f"{ANDROID_RES}/drawable/ic_launcher_background.xml", BG_XML)
    # Foreground XML (vector, en drawable-v24 para API 24+ adaptive icons)
    write_text_file(f"{ANDROID_RES}/drawable-v24/ic_launcher_foreground.xml", FG_XML)

    print("\n✓ Íconos generados correctamente:")
    print(f"  - Web:    {PUB}/icon.svg, icon-192.png, icon-512.png, apple-touch-icon.png")
    print(f"  - Android: {ANDROID_RES}/mipmap-*/ic_launcher*.png + ic_launcher_foreground.png")
    print(f"  - Vectores: drawable/ic_launcher_background.xml, drawable-v24/ic_launcher_foreground.xml")


if __name__ == "__main__":
    main()
