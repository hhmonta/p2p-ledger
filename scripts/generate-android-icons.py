#!/usr/bin/env python3
"""Genera iconos Android (mipmap) en todas las densidades necesarias."""
import struct
import zlib
import os
import sys

ANDROID_RES = "/home/z/my-project/android/app/src/main/res"
SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}
FOREGROUND_SIZES = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}


def make_png(width, height, pixels):
    def chunk(ctype, data):
        c = ctype.encode("ascii") + data
        crc = struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)
        return struct.pack(">I", len(data)) + c + crc

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    raw = b""
    stride = width * 4
    for y in range(height):
        raw += b"\x00"
        raw += pixels[y * stride:(y + 1) * stride]
    idat = zlib.compress(raw, 9)
    return sig + chunk("IHDR", ihdr) + chunk("IDAT", idat) + chunk("IEND", b"")


def lerp(a, b, t):
    return int(a + (b - a) * t)


def lerp_color(c1, c2, t):
    return tuple(lerp(c1[i], c2[i], t) for i in range(3))


def draw_launcher(size, with_bg=True):
    """Icono launcher completo (con fondo oscuro y logo esmeralda)."""
    bg_top = (15, 23, 42)
    bg_bottom = (30, 41, 59)
    logo_top = (16, 185, 129)
    logo_bot = (20, 184, 166)

    pixels = bytearray(size * size * 4)
    # En Android, los iconos son cuadrados con fondo
    for y in range(size):
        for x in range(size):
            t_bg = (x + y) / (2 * size)
            color = lerp_color(bg_top, bg_bottom, t_bg)

            # Zona del wallet (centrada)
            cx = size / 2
            cy = size / 2
            w_w = size * 0.56
            w_h = size * 0.42
            w_x0 = cx - w_w / 2
            w_x1 = cx + w_w / 2
            w_y0 = cy - w_h / 2
            w_y1 = cy + w_h / 2
            flap_y = cy - w_h * 0.1

            in_wallet = w_x0 <= x <= w_x1 and w_y0 <= y <= w_y1
            in_flap_line = (
                w_x0 + size * 0.04 <= x <= w_x1 - size * 0.04
                and abs(y - flap_y) < size * 0.012
            )
            in_border = (
                in_wallet
                and (
                    abs(x - w_x0) < size * 0.014
                    or abs(x - w_x1) < size * 0.014
                    or abs(y - w_y0) < size * 0.014
                    or abs(y - w_y1) < size * 0.014
                )
            )

            dot_cx = w_x1 - size * 0.10
            dot_cy = cy + size * 0.02
            dot_r = size * 0.035
            in_dot = ((x - dot_cx) ** 2 + (y - dot_cy) ** 2) <= dot_r * dot_r

            if in_dot:
                color = (255, 255, 255)
            elif in_flap_line or in_border:
                color = (255, 255, 255)
            elif in_wallet:
                t_logo = ((x - w_x0) + (y - w_y0)) / (w_w + w_h)
                color = lerp_color(logo_top, logo_bot, t_logo)

            idx = (y * size + x) * 4
            pixels[idx] = color[0]
            pixels[idx + 1] = color[1]
            pixels[idx + 2] = color[2]
            pixels[idx + 3] = 255
    return bytes(pixels)


def draw_foreground(size):
    """Solo el logo esmeralda con transparencia (foreground)."""
    logo_top = (16, 185, 129)
    logo_bot = (20, 184, 166)

    # El foreground se dibuja en un canvas cuadrado de 108dp con ~72dp de contenido central
    # 67% central
    content_size = size * 0.67
    offset = (size - content_size) / 2

    pixels = bytearray(size * size * 4)
    for y in range(size):
        for x in range(size):
            # Zona del wallet
            cx = size / 2
            cy = size / 2
            w_w = content_size * 0.84
            w_h = content_size * 0.63
            w_x0 = cx - w_w / 2
            w_x1 = cx + w_w / 2
            w_y0 = cy - w_h / 2
            w_y1 = cy + w_h / 2
            flap_y = cy - w_h * 0.1

            in_wallet = w_x0 <= x <= w_x1 and w_y0 <= y <= w_y1
            in_flap_line = (
                w_x0 + size * 0.04 <= x <= w_x1 - size * 0.04
                and abs(y - flap_y) < size * 0.014
            )
            in_border = (
                in_wallet
                and (
                    abs(x - w_x0) < size * 0.016
                    or abs(x - w_x1) < size * 0.016
                    or abs(y - w_y0) < size * 0.016
                    or abs(y - w_y1) < size * 0.016
                )
            )

            dot_cx = w_x1 - size * 0.13
            dot_cy = cy + size * 0.026
            dot_r = size * 0.045
            in_dot = ((x - dot_cx) ** 2 + (y - dot_cy) ** 2) <= dot_r * dot_r

            idx = (y * size + x) * 4
            if in_dot:
                pixels[idx] = 255
                pixels[idx + 1] = 255
                pixels[idx + 2] = 255
                pixels[idx + 3] = 255
            elif in_flap_line or in_border:
                pixels[idx] = 255
                pixels[idx + 1] = 255
                pixels[idx + 2] = 255
                pixels[idx + 3] = 255
            elif in_wallet:
                t_logo = ((x - w_x0) + (y - w_y0)) / (w_w + w_h)
                c = lerp_color(logo_top, logo_bot, t_logo)
                pixels[idx] = c[0]
                pixels[idx + 1] = c[1]
                pixels[idx + 2] = c[2]
                pixels[idx + 3] = 255
            else:
                # transparente
                pixels[idx + 3] = 0
    return bytes(pixels)


def main():
    # 1. Iconos launcher (ic_launcher.png y ic_launcher_round.png)
    for folder, size in SIZES.items():
        path = os.path.join(ANDROID_RES, folder)
        os.makedirs(path, exist_ok=True)
        px = draw_launcher(size)
        png = make_png(size, size, px)
        with open(os.path.join(path, "ic_launcher.png"), "wb") as f:
            f.write(png)
        # round = mismo cuadrado (el icono ya tiene fondo)
        with open(os.path.join(path, "ic_launcher_round.png"), "wb") as f:
            f.write(png)
        print(f"  ✓ {folder}/ic_launcher.png ({size}x{size})")

    # 2. Iconos foreground
    for folder, size in FOREGROUND_SIZES.items():
        path = os.path.join(ANDROID_RES, folder)
        os.makedirs(path, exist_ok=True)
        px = draw_foreground(size)
        png = make_png(size, size, px)
        with open(os.path.join(path, "ic_launcher_foreground.png"), "wb") as f:
            f.write(png)
        print(f"  ✓ {folder}/ic_launcher_foreground.png ({size}x{size})")

    print("\n✓ Iconos Android generados")


if __name__ == "__main__":
    main()
