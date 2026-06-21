# P2P Ledger

Aplicación web y Android para llevar el registro de **compras y ventas P2P** y gestionar los **bancos** que usas en tus operaciones. Funciona 100% offline: los datos se guardan localmente en el dispositivo (localStorage en web, WebView localStorage en Android).

## Características

- **Modo oscuro** activo por defecto, con toggle para modo claro.
- **Dashboard** con KPIs en tiempo real (total comprado, vendido, ganancia estimada, tasa promedio, spread, stock neto).
- **Gestión de bancos**: alta, edición y eliminación de cuentas bancarias con tipo de cuenta, moneda, balance inicial, color identificador y notas.
- **Compras P2P**: registro de operaciones donde recibes un activo (USDT, BTC, etc.) a cambio de moneda fiat.
- **Ventas P2P**: registro de operaciones donde entregas un activo y recibes moneda fiat.
- **Historial completo** con filtros por estado, banco y búsqueda por texto.
- **Cálculo automático** de balances por banco (entradas - salidas + balance inicial).
- **Gráficos** de evolución mensual, top contrapartes y distribución por activo.
- **Tasas, comisiones, referencias y notas** configurables por operación.
- **Multi-moneda**: VES, USD, EUR, COP, ARS, PEN, MXN, BRL.
- **Multi-activo**: USDT, USDC, BTC, ETH, BNB, USD, EUR, COP.
- **PWA instalable** y **APK nativo para Android** (vía Capacitor).
- **100% offline**: todos los datos viven en el dispositivo. No hay servidor.

## Stack

- **Next.js 16** con App Router + TypeScript (static export)
- **Tailwind CSS 4** + **shadcn/ui** (New York)
- **next-themes** para modo oscuro/claro
- **TanStack Query** para estado de servidor
- **react-hook-form** + **zod** para validación
- **Recharts** para visualizaciones
- **Capacitor 8** para empaquetar como APK Android
- **Almacenamiento**: localStorage (browser / Android WebView)

## Descargar APK

El APK ya compilado está en `download/p2p-ledger.apk` (~4.5 MB). Para instalarlo en tu teléfono Android:

1. Copia el archivo `p2p-ledger.apk` a tu teléfono.
2. Habilita "Instalar aplicaciones de origen desconocido" en Ajustes → Seguridad.
3. Toca el archivo APK y confirma la instalación.
4. Abre **P2P Ledger** desde el cajón de apps.

> El APK está firmado en modo **debug** (suficiente para uso personal). Para distribución pública genera una keystore y firma el release con `./gradlew assembleRelease`.

## Puesta en marcha (desarrollo web)

```bash
bun install
cp .env.example .env      # solo si vas a usar Prisma; el APK no lo necesita
bun run dev
```

Abrir http://localhost:3000

## Construir el APK desde cero

Requisitos:
- **JDK 21** (Temurin u OpenJDK)
- **Android SDK** (command-line tools + platform-tools + platforms;android-35 + build-tools;35.0.0)
- **Node 18+** y **Bun**

Pasos:

```bash
# 1. Variables de entorno
export JAVA_HOME=/ruta/a/jdk-21
export ANDROID_HOME=/ruta/a/android-sdk
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH

# 2. Instalar deps JS
bun install

# 3. Build estático de Next.js (output en /out)
bun run build

# 4. Sincronizar assets web con el proyecto Android
npx cap sync android

# 5. Compilar APK debug
cd android
./gradlew assembleDebug --no-daemon

# 6. APK en:
#    android/app/build/outputs/apk/debug/app-debug.apk
```

Para un APK release firmado:

```bash
# Genera keystore (una sola vez)
keytool -genkey -v -keystore p2p-ledger.keystore -alias p2pledger \
  -keyalg RSA -keysize 2048 -validity 10000

# Configura android/keystore.properties con la ruta y passwords

# En android/app/build.gradle añade signingConfigs.release usando esas props

./gradlew assembleRelease
```

## Estructura

```
prisma/
  schema.prisma               # Modelos Bank y Transaction (legacy, solo referencia)
src/
  app/
    layout.tsx                # ThemeProvider (dark por defecto) + manifest
    page.tsx                  # Página principal con 5 tabs
    globals.css               # Variables CSS light + dark (esmeralda)
  components/
    p2p/
      Dashboard.tsx
      BanksView.tsx
      TransactionsView.tsx
      BankForm.tsx
      TransactionForm.tsx
    theme-provider.tsx
    theme-toggle.tsx
  lib/
    db.ts                     # Cliente Prisma (legacy, no usado en APK)
    storage.ts                # Capa localStorage (bancos, transacciones, stats)
    format.ts                 # Helpers de formato
    types.ts                  # Tipos compartidos
public/
  manifest.json               # PWA manifest
  icon-192.png, icon-512.png  # Iconos PWA
  icon.svg                    # Icono escalable
capacitor.config.ts           # Configuración Capacitor (appId, splash, status bar)
android/                      # Proyecto Android nativo
scripts/
  generate-icons.py           # Genera iconos PWA
  generate-android-icons.py   # Genera mipmap-* para Android
  github-push.sh              # Script para push inicial a GitHub
```

## Modelo de datos

### Bank
| Campo           | Tipo    | Descripción                                |
|-----------------|---------|--------------------------------------------|
| name            | string  | Nombre del banco                            |
| accountType     | enum    | corriente, ahorro, digital, pago_movil      |
| accountNumber   | string? | Número de cuenta                            |
| holderName      | string? | Titular                                     |
| currency        | string  | VES, USD, EUR, ...                          |
| initialBalance  | float   | Saldo inicial                               |
| color           | string  | Color hex para identificación visual        |
| isActive        | bool    | Si está activa para nuevas operaciones      |

### Transaction
| Campo         | Tipo    | Descripción                                    |
|---------------|---------|------------------------------------------------|
| type          | enum    | compra, venta                                   |
| counterparty  | string  | Persona o plataforma                            |
| asset         | string  | Activo negociado (USDT, BTC, ...)              |
| amount        | float   | Cantidad del activo                            |
| rate          | float   | Tasa de cambio (fiat por unidad de activo)     |
| total         | float   | Calculado: amount × rate                       |
| currency      | string  | Moneda fiat del total                          |
| fromBankId    | string? | Banco origen                                   |
| toBankId      | string? | Banco destino                                  |
| status        | enum    | pendiente, completada, cancelada               |
| reference     | string? | Número de operación                            |
| fee           | float   | Comisión                                       |
| date          | datetime| Fecha y hora de la operación                   |

## Notas

- **Privacidad**: todos los datos se guardan en `localStorage` del navegador o WebView. No se envían a ningún servidor.
- **Backup**: usa las funciones `exportData()` e `importData()` de `src/lib/storage.ts` desde la consola del navegador para exportar/importar tu historial en JSON.
- La ganancia estimada del dashboard se calcula como `(tasa_venta_prom − tasa_compra_prom) × volumen_cruzado − comisiones`.
- `prisma/` y `src/lib/db.ts` quedan como referencia del modelo original, pero la app ya no los usa — todo pasa por `src/lib/storage.ts`.
