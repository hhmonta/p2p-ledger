---
Task ID: 1
Agent: main
Task: Arreglar header que se solapa con la barra de estado del móvil y cambiar el icono de la app

Work Log:
- Edité `src/app/page.tsx`:
  - Header: añadido `style={{ paddingTop: 'env(safe-area-inset-top)' }}` al `<header>` sticky para que el contenido baje debajo de la barra de estado cuando `viewportFit: 'cover'`.
  - Footer: añadido `style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}` al `<footer>` para evitar solapamiento con el gesto/gesture bar de Android/iOS.
- Edité `src/components/LockScreen.tsx`:
  - Añadidos `paddingTop: env(safe-area-inset-top)` y `paddingBottom: env(safe-area-inset-bottom)` al contenedor `fixed inset-0` para que el PIN pad no quede tapado por las barras del sistema.
- Rediseñé `public/icon.svg`:
  - Antes: flechas blancas bidireccionales + moneda dorada sobre fondo esmeralda-teal.
  - Ahora: libro contable abierto (páginas + tapas navy) con líneas de "texto" simuladas, listón verde de marcador, moneda dorada con "$" flotando arriba, y 4 monedas decorativas en las esquinas. Mantiene la paleta esmeralda/teal/dorada.
- Sincronicé `public/logo.svg` con el nuevo `icon.svg`.
- Generé los PNG con `scripts/generate_icons.py` (cairosvg):
  - `icon-192.png` (192x192)
  - `icon-512.png` (512x512)
  - `apple-touch-icon.png` (180x180)
  - `favicon-32.png` (32x32)
  - `favicon-16.png` (16x16)
- Verifiqué `npx next build` OK y que los PNGs se copian a `out/` (webDir de Capacitor).

Stage Summary:
- Safe-area-inset ahora respeta la barra de estado superior y la barra de gestos inferior en el APK; el header sticky ya no se solapa con la status bar.
- Icono de la app reemplazado por un diseño tipo "libro contable + moneda" más alineado con el nombre "P2P Ledger"; todos los tamaños (favicon, apple-touch, maskable 192/512, SVG) regenerados y copiados a `out/`.
- Para que el APK refleje el nuevo icono, hace falta `npx cap sync android` (y rebuild del APK) — no se ejecutó aquí porque es tarea de empaquetado, no de código.
