#!/usr/bin/env python3
"""Genera iconos P2P Ledger en diferentes tamaños."""
import struct
import zlib
import os
import sys

OUTPUT_DIR = "/home/z/my-project/public"
SIZES = [192, 512]

# Logo: una "W" (wallet) en gradient esmeralda sobre fondo oscuro.
# Para simplicidad usamos un cuadrado con gradiente y un patrón simple.

def make_png(width: int, height: int, pixels: bytes) -> bytes:
    """Crea un PNG a partir de pixels RGBA."""
    def chunk(ctype: str, data: bytes) -> bytes:
        c = ctype.encode("ascii") + data
        crc = struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)
        return struct.pack(">I", len(data)) + c + crc

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)  # 8-bit RGBA
    raw = b""
    stride = width * 4
    for y in range(height):
        raw += b"\x00"  # filter: None
        raw += pixels[y * stride:(y + 1) * stride]
    idat = zlib.compress(raw, 9)
    return sig + chunk("IHDR", ihdr) + chunk("IDAT", idat) + chunk("IEND", b"")


def lerp(a, b, t):
    return int(a + (b - a) * t)


def lerp_color(c1, c2, t):
    return tuple(lerp(c1[i], c2[i], t) for i in range(3))


def draw_icon(size: int) -> bytes:
    """Dibuja el icono: gradiente diagonal esmeralda con un símbolo de wallet."""
    # Colores del gradiente (esquina sup-izq -> inf-der)
    top_left = (16, 185, 129)      # emerald-500
    bottom_right = (20, 184, 166)  # teal-500
    bg_top = (15, 23, 42)          # slate-900
    bg_bottom = (30, 41, 59)       # slate-800

    pixels = bytearray(size * size * 4)

    for y in range(size):
        for x in range(size):
            # Fondo con gradiente diagonal
            t = (x + y) / (2 * size)
            bg = lerp_color(bg_top, bg_bottom, t)

            # Borde redondeado (esquinas circulares)
            margin = size * 0.08
            corner_r = size * 0.18
            in_x = margin < x < size - margin
            in_y = margin < y < size - margin
            # Test de esquina redondeada
            in_corner = True
            cx_lo = margin + corner_r
            cx_hi = size - margin - corner_r
            cy_lo = margin + corner_r
            cy_hi = size - margin - corner_r
            if x < cx_lo and y < cy_lo:
                dx, dy = cx_lo - x, cy_lo - y
                in_corner = (dx * dx + dy * dy) <= corner_r * corner_r
            elif x > cx_hi and y < cy_lo:
                dx, dy = x - cx_hi, cy_lo - y
                in_corner = (dx * dx + dy * dy) <= corner_r * corner_r
            elif x < cx_lo and y > cy_hi:
                dx, dy = cx_lo - x, y - cy_hi
                in_corner = (dx * dx + dy * dy) <= corner_r * corner_r
            elif x > cx_hi and y > cy_hi:
                dx, dy = x - cx_hi, y - cy_hi
                in_corner = (dx * dx + dy * dy) <= corner_r * corner_r

            if not (in_x and in_y and in_corner):
                # Fuera del área del icono → transparente
                pixels[(y * size + x) * 4 + 3] = 0
                continue

            # Gradiente dentro del icono
            t2 = ((x - margin) + (y - margin)) / (2 * (size - 2 * margin))
            color = lerp_color(top_left, bottom_right, t2)

            # Símbolo de wallet: rectángulo horizontal con una línea
            # Zona central del icono
            cx = size / 2
            cy = size / 2
            # wallet: rectángulo de 60% ancho, 40% alto
            w_w = size * 0.56
            w_h = size * 0.42
            w_x0 = cx - w_w / 2
            w_x1 = cx + w_w / 2
            w_y0 = cy - w_h / 2
            w_y1 = cy + w_h / 2
            # Línea del "wallet flap" (separación)
            flap_y = cy - w_h * 0.1

            in_wallet = w_x0 <= x <= w_x1 and w_y0 <= y <= w_y1
            in_flap_line = (
                w_x0 + size * 0.04 <= x <= w_x1 - size * 0.04
                and abs(y - flap_y) < size * 0.012
            )
            in_border = (
                in_wallet
                and (
                    abs(x - w_x0) < size * 0.012
                    or abs(x - w_x1) < size * 0.012
                    or abs(y - w_y0) < size * 0.012
                    or abs(y - w_y1) < size * 0.012
                )
            )

            # Pequeño botón circular (punto) a la derecha del wallet
            dot_cx = w_x1 - size * 0.10
            dot_cy = cy + size * 0.02
            dot_r = size * 0.035
            in_dot = ((x - dot_cx) ** 2 + (y - dot_cy) ** 2) <= dot_r * dot_r

            if in_dot:
                # Punto blanco
                color = (255, 255, 255)
            elif in_flap_line or in_border:
                color = (255, 255, 255)
            elif in_wallet:
                # Relleno blanco semi (no dibujamos, dejamos el gradiente)
                color = lerp_color(top_left, bottom_right, t2)

            idx = (y * size + x) * 4
            pixels[idx] = color[0]
            pixels[idx + 1] = color[1]
            pixels[idx + 2] = color[2]
            pixels[idx + 3] = 255

    return bytes(pixels)


def draw_svg(size: int) -> str:
    """Genera SVG escalable del icono."""
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="logo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#14b8a6"/>
    </linearGradient>
  </defs>
  <rect width="{size}" height="{size}" rx="{size*0.18}" fill="url(#bg)"/>
  <rect x="{size*0.22}" y="{size*0.29}" width="{size*0.56}" height="{size*0.42}" rx="{size*0.05}" fill="url(#logo)"/>
  <rect x="{size*0.22}" y="{size*0.29}" width="{size*0.56}" height="{size*0.42}" rx="{size*0.05}" fill="none" stroke="#ffffff" stroke-width="{size*0.015}"/>
  <line x1="{size*0.26}" y1="{size*0.40}" x2="{size*0.74}" y2="{size*0.40}" stroke="#ffffff" stroke-width="{size*0.015}"/>
  <circle cx="{size*0.66}" cy="{size*0.52}" r="{size*0.035}" fill="#ffffff"/>
</svg>"""


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    for s in SIZES:
        print(f"==> Generando icon-{s}.png ({s}x{s})")
        px = draw_icon(s)
        png = make_png(s, s, px)
        path = os.path.join(OUTPUT_DIR, f"icon-{s}.png")
        with open(path, "wb") as f:
            f.write(png)
        print(f"   {path}: {len(png)} bytes")

    # SVG version
    svg = draw_svg(512)
    svg_path = os.path.join(OUTPUT_DIR, "icon.svg")
    with open(svg_path, "w") as f:
        f.write(svg)
    print(f"==> {svg_path}")

    # Apple touch icon = 192 version
    import shutil
    shutil.copy(
        os.path.join(OUTPUT_DIR, "icon-192.png"),
        os.path.join(OUTPUT_DIR, "apple-touch-icon.png"),
    )
    print("==> apple-touch-icon.png copiado de icon-192.png")
    print("\n✓ Iconos generados en", OUTPUT_DIR)


if __name__ == "__main__":
    main()
