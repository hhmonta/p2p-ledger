'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Coins,
  PiggyBank,
  Activity,
  Users,
  Clock,
  Trophy,
  Building2,
  Percent,
} from 'lucide-react'
import type { Stats } from '@/lib/types'
import { formatCurrency, formatNumber } from '@/lib/format'
import * as storage from '@/lib/storage'

const PIE_COLORS = ['#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444', '#3b82f6', '#84cc16']

export function Dashboard() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: () => storage.getStats(),
  })

  if (isLoading || !stats) {
    return (
      <div className="space-y-2.5 sm:space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-16 sm:h-24 animate-pulse bg-muted/40" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-3">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="h-56 sm:h-64 animate-pulse bg-muted/40" />
          ))}
        </div>
      </div>
    )
  }

  const r = stats.resumen
  const monthly = stats.monthly.map((m) => {
    const [y, mo] = m.month.split('-')
    const date = new Date(Number(y), Number(mo) - 1, 1)
    return {
      ...m,
      label: date.toLocaleString('es-VE', { month: 'short' }),
    }
  })

  const gananciaColor =
    r.gananciaNeta > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : r.gananciaNeta < 0
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-muted-foreground'

  const totalFees = r.feesCompras + r.feesVentas
  const totalNeto = r.netCompras + r.netVentas

  return (
    <div className="space-y-2.5 sm:space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-base sm:text-xl font-semibold">Resumen general</h2>
        <p className="text-[11px] sm:text-sm text-muted-foreground">
          Visión global de tu actividad P2P: volumen, comisiones, tasas y ganancia neta.
        </p>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-3">
        <Card className="p-0">
          <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
            <CardDescription className="flex items-center gap-1 text-[9px] sm:text-xs">
              <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-500" />
              Total comprado
            </CardDescription>
            <CardTitle className="text-sm sm:text-xl tabular-nums leading-tight">
              {formatCurrency(r.totalCompras)}
            </CardTitle>
            <p className="text-[9px] sm:text-xs text-muted-foreground">
              {r.cantidadCompras} ops · {formatNumber(r.montoCompras)} u.
            </p>
          </CardHeader>
        </Card>
        <Card className="p-0">
          <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
            <CardDescription className="flex items-center gap-1 text-[9px] sm:text-xs">
              <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-rose-500" />
              Total vendido
            </CardDescription>
            <CardTitle className="text-sm sm:text-xl tabular-nums leading-tight">
              {formatCurrency(r.totalVentas)}
            </CardTitle>
            <p className="text-[9px] sm:text-xs text-muted-foreground">
              {r.cantidadVentas} ops · {formatNumber(r.montoVentas)} u.
            </p>
          </CardHeader>
        </Card>
        <Card className="p-0">
          <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
            <CardDescription className="flex items-center gap-1 text-[9px] sm:text-xs">
              <PiggyBank className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              Ganancia neta
            </CardDescription>
            <CardTitle className={`text-sm sm:text-xl tabular-nums leading-tight ${gananciaColor}`}>
              {formatCurrency(r.gananciaNeta)}
            </CardTitle>
            <p className="text-[9px] sm:text-xs text-muted-foreground">
              Spread × vol − fees
            </p>
          </CardHeader>
        </Card>
        <Card className="p-0">
          <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
            <CardDescription className="flex items-center gap-1 text-[9px] sm:text-xs">
              <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-500" />
              Pendientes
            </CardDescription>
            <CardTitle className="text-sm sm:text-xl tabular-nums leading-tight">
              {r.pendientes}
            </CardTitle>
            <p className="text-[9px] sm:text-xs text-muted-foreground">
              Por confirmar
            </p>
          </CardHeader>
        </Card>
      </div>

      {/* KPIs secundarios */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-3">
        <Card className="p-0">
          <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
            <CardDescription className="flex items-center gap-1 text-[9px] sm:text-xs">
              <Coins className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              Tasa compra
            </CardDescription>
            <CardTitle className="text-xs sm:text-lg tabular-nums leading-tight">
              {formatNumber(r.avgRateCompra, 2)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="p-0">
          <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
            <CardDescription className="flex items-center gap-1 text-[9px] sm:text-xs">
              <Coins className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              Tasa venta
            </CardDescription>
            <CardTitle className="text-xs sm:text-lg tabular-nums leading-tight">
              {formatNumber(r.avgRateVenta, 2)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="p-0">
          <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
            <CardDescription className="flex items-center gap-1 text-[9px] sm:text-xs">
              <Wallet className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              Stock activo
            </CardDescription>
            <CardTitle className="text-xs sm:text-lg tabular-nums leading-tight">
              {formatNumber(r.activoNeto, 2)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="p-0">
          <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
            <CardDescription className="flex items-center gap-1 text-[9px] sm:text-xs">
              <Activity className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              Spread
            </CardDescription>
            <CardTitle
              className={`text-xs sm:text-lg tabular-nums leading-tight ${
                r.avgRateVenta - r.avgRateCompra >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatNumber(r.avgRateVenta - r.avgRateCompra, 2)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Comisiones: bloque destacado */}
      <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/10">
        <CardContent className="p-2.5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <div className="h-7 w-7 sm:h-10 sm:w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Percent className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-[9px] sm:text-xs text-muted-foreground">Total comisiones</p>
                <p className="text-base sm:text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400 leading-tight">
                  {formatCurrency(totalFees)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-4 flex-1 text-[11px] sm:text-sm">
              <div>
                <p className="text-[9px] sm:text-xs text-muted-foreground">Compras</p>
                <p className="font-medium tabular-nums">{formatCurrency(r.feesCompras)}</p>
              </div>
              <div>
                <p className="text-[9px] sm:text-xs text-muted-foreground">Ventas</p>
                <p className="font-medium tabular-nums">{formatCurrency(r.feesVentas)}</p>
              </div>
              <div>
                <p className="text-[9px] sm:text-xs text-muted-foreground">Neto</p>
                <p className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalNeto)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-3">
        {/* Evolución mensual */}
        <Card className="lg:col-span-2">
          <CardHeader className="p-2.5 sm:p-6">
            <CardTitle className="text-xs sm:text-base">
              Evolución mensual — Compras vs Ventas
            </CardTitle>
            <CardDescription className="text-[11px] sm:text-sm">
              Últimos 12 meses en moneda fiat (VES por defecto)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2.5 sm:p-6 pt-0">
            <div className="h-40 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => formatNumber(v, 0)} />
                  <Tooltip
                    formatter={(v: number) => formatCurrency(v)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="compras" name="Compras" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ventas" name="Ventas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Comisiones por exchange */}
        <Card>
          <CardHeader className="p-2.5 sm:p-6">
            <CardTitle className="text-xs sm:text-base flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
              Comisiones por exchange
            </CardTitle>
            <CardDescription className="text-[11px] sm:text-sm">Desglose de comisiones pagadas por plataforma</CardDescription>
          </CardHeader>
          <CardContent className="p-2.5 sm:p-6 pt-0">
            {stats.feesPorExchange.length === 0 ? (
              <p className="text-[11px] sm:text-sm text-muted-foreground py-4 sm:py-6 text-center">
                Aún no hay comisiones registradas
              </p>
            ) : (
              <div className="space-y-1.5 sm:space-y-3">
                {stats.feesPorExchange.map((f) => {
                  const max = stats.feesPorExchange[0]?.totalFees || 1
                  const pct = max > 0 ? (f.totalFees / max) * 100 : 0
                  return (
                    <div key={f.exchangeId ?? 'none'} className="space-y-1">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="flex items-center gap-1.5 sm:gap-2 truncate min-w-0">
                          <span
                            className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: f.exchangeColor }}
                          />
                          <span className="font-medium truncate">{f.exchangeName}</span>
                        </span>
                        <span className="tabular-nums font-medium text-amber-600 dark:text-amber-400 flex-shrink-0 ml-2">
                          {formatCurrency(f.totalFees)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: f.exchangeColor,
                          }}
                        />
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {f.count} ops · {f.compras} comp · {f.ventas} vent
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top contrapartes */}
        <Card>
          <CardHeader className="p-2.5 sm:p-6">
            <CardTitle className="text-xs sm:text-base flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
              Top contrapartes
            </CardTitle>
            <CardDescription className="text-[11px] sm:text-sm">Por volumen fiat operado</CardDescription>
          </CardHeader>
          <CardContent className="p-2.5 sm:p-6 pt-0">
            {stats.topCounterpartes.length === 0 ? (
              <p className="text-[11px] sm:text-sm text-muted-foreground py-4 sm:py-6 text-center">
                Aún no hay datos
              </p>
            ) : (
              <div className="space-y-1.5 sm:space-y-3">
                {stats.topCounterpartes.map((c, i) => {
                  const max = stats.topCounterpartes[0].total || 1
                  const pct = (c.total / max) * 100
                  return (
                    <div key={c.counterparty} className="space-y-1">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="flex items-center gap-1.5 sm:gap-2 truncate min-w-0">
                          <span className="text-[10px] sm:text-xs text-muted-foreground w-4 flex-shrink-0">
                            #{i + 1}
                          </span>
                          <span className="font-medium truncate">
                            {c.counterparty}
                          </span>
                        </span>
                        <span className="tabular-nums font-medium flex-shrink-0 ml-2">
                          {formatCurrency(c.total)}
                        </span>
                      </div>
                      <div className="h-1.5 sm:h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                          }}
                        />
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {c.count} ops · {formatNumber(c.amount)} u.
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activos negociados */}
        <Card className="lg:col-span-2">
          <CardHeader className="p-2.5 sm:p-6">
            <CardTitle className="text-xs sm:text-base flex items-center gap-2">
              <Coins className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Activos negociados
            </CardTitle>
            <CardDescription className="text-[11px] sm:text-sm">
              Distribución por volumen fiat
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2.5 sm:p-6 pt-0">
            {stats.activos.length === 0 ? (
              <p className="text-[11px] sm:text-sm text-muted-foreground py-4 sm:py-6 text-center">
                Aún no hay datos
              </p>
            ) : (
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="h-24 w-24 sm:h-48 sm:w-48 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.activos}
                        dataKey="total"
                        nameKey="asset"
                        cx="50%"
                        cy="50%"
                        outerRadius={42}
                        innerRadius={24}
                        paddingAngle={2}
                      >
                        {stats.activos.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number, _n, p: { payload?: { asset?: string } }) =>
                          `${formatCurrency(v)} (${p?.payload?.asset ?? ''})`
                        }
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1 sm:space-y-2 min-w-0">
                  {stats.activos.map((a, i) => (
                    <div
                      key={a.asset}
                      className="flex items-center justify-between text-xs sm:text-sm"
                    >
                      <span className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <span
                          className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                          }}
                        />
                        <span className="font-medium">{a.asset}</span>
                      </span>
                      <div className="text-right flex-shrink-0 ml-2">
                        <div className="tabular-nums font-medium">
                          {formatCurrency(a.total)}
                        </div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground">
                          {formatNumber(a.amount)} · {a.count} ops
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer informativo */}
      <Card>
        <CardContent className="p-2.5 sm:p-6">
          <div className="flex items-start gap-2 sm:gap-3 text-[11px] sm:text-sm">
            <Users className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-xs sm:text-base">Cómo se calcula la ganancia neta</p>
              <p className="text-muted-foreground text-[11px] sm:text-sm">
                Tomamos la diferencia entre la tasa promedio de venta y la de compra,
                multiplicada por el volumen cruzado (mínimo entre lo comprado y vendido),
                y le restamos todas las comisiones acumuladas (de compra, venta y fijas
                de cada exchange). Esto te da una estimación real de cuánto ganaste
                después de costos. Para un cálculo exacto registra cada operación con su
                exchange y tasa específica.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
