# P2P Ledger

Aplicación web completa para llevar el registro de **compras y ventas P2P** y gestionar los **bancos** que usas en tus operaciones.

## Características

- **Dashboard** con KPIs en tiempo real (total comprado, vendido, ganancia estimada, tasa promedio, spread, stock neto).
- **Gestión de bancos**: alta, edición y eliminación de cuentas bancarias con tipo de cuenta, moneda, balance inicial, color identificador y notas.
- **Compras P2P**: registro de operaciones donde recibes un activo (USDT, BTC, etc.) a cambio de moneda fiat.
- **Ventas P2P**: registro de operaciones donde entregas un activo y recibes moneda fiat.
- **Historial completo** con filtros por estado, banco y búsqueda por texto.
- **Cálculo automático** de balances por banco (entradas - salidas + balance inicial).
- **Gráficos** de evolución mensual, top contrapartes y distribución por activo.
- **Tasas, comisiones, referencias y notas** configurables por operación.
- **Multi-moneda**: VES, USD, EUR, COP, ARS, PEN, MXN, BRL.

## Stack

- **Next.js 16** con App Router + TypeScript
- **Prisma ORM** con SQLite (base de datos local)
- **Tailwind CSS 4** + **shadcn/ui** (New York)
- **TanStack Query** para estado de servidor
- **react-hook-form** + **zod** para validación
- **Recharts** para visualizaciones

## Estructura

```
prisma/
  schema.prisma           # Modelos Bank y Transaction
src/
  app/
    api/
      banks/              # CRUD de bancos
      transactions/       # CRUD de transacciones
      stats/              # Estadísticas para dashboard
    page.tsx              # Página principal con tabs
  components/
    p2p/
      Dashboard.tsx
      BanksView.tsx
      TransactionsView.tsx
      BankForm.tsx
      TransactionForm.tsx
  lib/
    db.ts                 # Cliente Prisma
    format.ts             # Helpers de formato
    types.ts              # Tipos compartidos
```

## Puesta en marcha

```bash
# 1. Instalar dependencias
bun install

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Crear la base de datos y aplicar el schema
bun run db:push

# 4. Iniciar el servidor de desarrollo
bun run dev
```

Abrir http://localhost:3000 en el navegador.

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

- Los datos se guardan localmente en `db/custom.db` (SQLite).
- Para reiniciar la base de datos: elimina `db/custom.db` y ejecuta `bun run db:push`.
- La ganancia estimada del dashboard se calcula como `(tasa_venta_prom − tasa_compra_prom) × volumen_cruzado − comisiones`.
