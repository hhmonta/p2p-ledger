#!/bin/bash
# Script para crear repo en GitHub y commitear cambios
# NO imprime el token en ningún log

set -e

TOKEN="$1"
REPO_NAME="p2p-ledger"
REPO_DESC="App completa para llevar registro de compras y ventas P2P y gestión de bancos. Next.js 16 + Prisma + SQLite + shadcn/ui."

if [ -z "$TOKEN" ]; then
  echo "ERROR: Token no proporcionado"
  exit 1
fi

cd /home/z/my-project

# 1. Crear repo en GitHub usando la API
echo "==> Creando repo '$REPO_NAME' en GitHub..."
RESPONSE=$(curl -s -X POST https://api.github.com/user/repos \
  -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -d "{\"name\":\"$REPO_NAME\",\"description\":\"$REPO_DESC\",\"private\":false,\"auto_init\":false}")

# Extraer info del repo
CLONE_URL=$(echo "$RESPONSE" | grep -o '"clone_url":"[^"]*"' | head -1 | sed 's/"clone_url":"//;s/"//')
HTML_URL=$(echo "$RESPONSE" | grep -o '"html_url":"[^"]*"' | head -1 | sed 's/"html_url":"//;s/"//')
OWNER_LOGIN=$(echo "$RESPONSE" | grep -o '"login":"[^"]*"' | head -1 | sed 's/"login":"//;s/"//')

if [ -z "$CLONE_URL" ]; then
  echo "ERROR: No se pudo crear el repo. Respuesta de GitHub:"
  echo "$RESPONSE" | head -50
  exit 1
fi

echo "==> Repo creado: $HTML_URL"
echo "==> Owner: $OWNER_LOGIN"

# 2. Configurar remote con token embebido (no se imprime)
REMOTE_URL="https://${TOKEN}@github.com/${OWNER_LOGIN}/${REPO_NAME}.git"
git remote remove origin 2>/dev/null || true
git remote add origin "$REMOTE_URL"

# 3. Agregar archivos y commitear
echo "==> Agregando archivos..."
git add -A
echo "==> Archivos a commitear:"
git status --short

echo "==> Commiteando..."
git commit -m "feat: app completa P2P Ledger - compras, ventas y bancos

- Dashboard con KPIs (compras, ventas, ganancia estimada, tasas promedio,
  spread, stock neto) y gráficos (evolución mensual, top contrapartes,
  distribución por activo)
- Gestión de bancos (CRUD): nombre, tipo de cuenta, moneda, balance inicial,
  color identificador, titular, número de cuenta, notas
- Registro de compras P2P: contraparte, activo, cantidad, tasa, banco
  origen/destino, estado, referencia, comisión, fecha y notas
- Registro de ventas P2P con mismo formato
- Historial completo con filtros por estado, banco y búsqueda textual
- Cálculo automático de balances por banco (entradas - salidas + inicial)
- Multi-moneda (VES, USD, EUR, COP, ARS, PEN, MXN, BRL)
- Multi-activo (USDT, USDC, BTC, ETH, BNB, USD, EUR, COP)
- Diseño responsive (mobile-first) con shadcn/ui
- Datos locales en SQLite vía Prisma

Stack: Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui + Prisma + SQLite
"

# 4. Push inicial
echo "==> Haciendo push a GitHub..."
git push -u origin main

# 5. Limpiar remote URL para no dejar el token en .git/config
git remote set-url origin "https://github.com/${OWNER_LOGIN}/${REPO_NAME}.git"

echo ""
echo "==> Repo disponible en: $HTML_URL"
echo "==> Push completado exitosamente."
