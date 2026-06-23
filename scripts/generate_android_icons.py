#!/usr/bin/env python3
"""Regenera los mipmap-* de Android con el nuevo icono de P2P Ledger.

Estrategia:
- ic_launcher.png (legacy): cuadrado completo con el SVG completo.
- ic_launcher_round.png (legacy round): mismo cuadrado con mask circular.
- ic_launcher_foreground.png (adaptive): SVG completo sobre fondo transparente,
  con padding para que el icono quede dentro del "safe zone" (66/108 ≈ 61%).
"""
import cairosvg
from pathlib import Path
import io
from PIL import Image, ImageDraw

ANDROID = Path("/home/z/my-project/android/app/src/main/res")
SRC = Path("/home/z/my-project/public/icon.svg")

DENSITIES = {
    "mipmap-mdpi":    48,
    "mipmap-hdpi":    72,
    "mipmap-xhdpi":   96,
    "mipmap-xxhdpi":  144,
    "mipmap-xxxhdpi": 192,
}

# Densidades para foreground (108dp)
DENSITIES_FG = {
    "mipmap-mdpi":    108,
    "mipmap-hdpi":    162,
    "mipmap-xhdpi":   216,
    "mipmap-xxhdpi":  324,
    "mipmap-xxxhdpi": 432,
}


def render_png(svg_path: Path, size: int) -> bytes:
    buf = io.BytesIO()
    cairosvg.svg2png(
        url=str(svg_path),
        write_to=buf,
        output_width=size,
        output_height=size,
    )
    return buf.getvalue()


def make_round(png_bytes: bytes, size: int) -> bytes:
    """Aplica máscara circular a un PNG cuadrado."""
    img = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size - 1, size - 1), fill=255)
    # El round launcher en Android recorta a círculo + fondo. Para que se vea bien,
    # rellenamos fuera del círculo con el color de fondo del icono (esmeralda).
    bg = Image.new("RGBA", (size, size), (16, 185, 129, 255))  # #10b981
    bg.paste(img, (0, 0), mask)
    out = io.BytesIO()
    bg.save(out, format="PNG")
    return out.getvalue()


def make_foreground(svg_path: Path, size: int) -> bytes:
    """Renderiza el SVG sobre fondo transparente, escalado al safe-zone (66/108 ≈ 61%)."""
    safe_ratio = 66 / 108  # area segura de adaptive icons
    inner = max(1, int(size * safe_ratio))
    inner_bytes = render_png(svg_path, inner)

    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    inner_img = Image.open(io.BytesIO(inner_bytes)).convert("RGBA")
    offset = (size - inner) // 2
    img.paste(inner_img, (offset, offset), inner_img)

    out = io.BytesIO()
    img.save(out, format="PNG")
    return out.getvalue()


total = 0
# Legacy ic_launcher + ic_launcher_round
for density, size in DENSITIES.items():
    out_dir = ANDROID / density
    out_dir.mkdir(parents=True, exist_ok=True)

    launcher = render_png(SRC, size)
    (out_dir / "ic_launcher.png").write_bytes(launcher)
    total += 1

    round_png = make_round(launcher, size)
    (out_dir / "ic_launcher_round.png").write_bytes(round_png)
    total += 1

# Adaptive foreground
for density, size in DENSITIES_FG.items():
    out_dir = ANDROID / density
    out_dir.mkdir(parents=True, exist_ok=True)
    fg = make_foreground(SRC, size)
    (out_dir / "ic_launcher_foreground.png").write_bytes(fg)
    total += 1

print(f"OK: {total} archivos generados en {ANDROID}")
