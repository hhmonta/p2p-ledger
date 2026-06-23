#!/usr/bin/env python3
"""Genera los PNG del icono de P2P Ledger a partir de public/icon.svg.

Salidas:
  - public/icon-192.png   (192x192, maskable)
  - public/icon-512.png   (512x512, maskable)
  - public/apple-touch-icon.png  (180x180)
  - public/favicon-32.png (32x32)
  - public/favicon-16.png (16x16)
"""
import cairosvg
from pathlib import Path

PUBLIC = Path("/home/z/my-project/public")
SRC = PUBLIC / "icon.svg"

outputs = [
    ("icon-192.png", 192),
    ("icon-512.png", 512),
    ("apple-touch-icon.png", 180),
    ("favicon-32.png", 32),
    ("favicon-16.png", 16),
]

for name, size in outputs:
    dst = PUBLIC / name
    cairosvg.svg2png(
        url=str(SRC),
        write_to=str(dst),
        output_width=size,
        output_height=size,
    )
    print(f"OK -> {dst} ({size}x{size})")

print("Done.")
