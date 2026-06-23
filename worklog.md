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

---
Task ID: 2
Agent: main
Task: Generar el APK de Android con los cambios recientes (safe-area + nuevo icono)

Work Log:
- Verifiqué que Android SDK y un JDK con `javac` NO estaban instalados.
- Instalé Android command-line tools (r11076708) en `/home/z/android-sdk/cmdline-tools/latest`.
- Acepté todas las licencias con `yes | sdkmanager --licenses`.
- Instalé: `platform-tools`, `platforms;android-36`, `build-tools;36.0.0`.
- Descargué y extraje Temurin JDK 21 (`/home/z/jdk21`) — el JRE del sistema no tenía `javac`.
- Creé `android/local.properties` con `sdk.dir=/home/z/android-sdk`.
- Generé los mipmap Android con `scripts/generate_android_icons.py` (cairosvg + Pillow):
  - `mipmap-mdpi` 48x48, `mipmap-hdpi` 72x72, `mipmap-xhdpi` 96x96, `mipmap-xxhdpi` 144x144, `mipmap-xxxhdpi` 192x192.
  - Para cada densidad: `ic_launcher.png` (cuadrado), `ic_launcher_round.png` (máscara circular con fondo esmeralda), `ic_launcher_foreground.png` (adaptive, safe-zone 66/108).
- Ejecuté `npx cap sync android` — copió `out/` a `android/app/src/main/assets/public` y generó `capacitor.config.json`.
- Ejecuté `./gradlew assembleRelease --no-daemon` con JAVA_HOME=/home/z/jdk21 y ANDROID_HOME=/home/z/android-sdk.
  - BUILD SUCCESSFUL en 1m 6s.
  - R8 activado (minify + shrinkResources).
  - Firmado con el keystore `android/keystore/p2p-ledger.keystore` (alias `p2p-ledger`).
- Copié el APK a `/home/z/my-project/download/P2P-Ledger-v1.0.apk` (≈2.6 MB).
- Verifiqué con `aapt dump badging`:
  - package: com.p2pledger.app, versionCode=1, versionName=1.0
  - sdkVersion=24, targetSdkVersion=36, compileSdk=36
  - application-label: P2P Ledger

Stage Summary:
- APK release firmado y listo en `/home/z/my-project/download/P2P-Ledger-v1.0.apk` (2.6 MB).
- Incluye los cambios de safe-area (header/footer) y el nuevo icono "libro contable + moneda" en todas las densidades Android.
- Requisitos de instalación: Android 7.0+ (API 24).
- El APK está firmado con clave de depuración propia (keystore incluido en el repo). Para Play Store haría falta re-firmar con una clave de release oficial.
