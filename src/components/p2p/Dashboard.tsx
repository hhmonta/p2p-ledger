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
  LineChart,
  Line,
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
} from 'lucide-react'
import type { Stats } from '@/lib/types'
import { formatCurrency, formatNumber } from '@/lib/format'

const PIE_COLORS = ['#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444']

export function Dashboard() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await fetch('/api/stats')
      if (!res.ok) throw new Error('Error al cargar stats')
      return res.json()
    },
  })

  if (isLoading || !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-28 animate-pulse bg-muted/40" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="h-80 animate-pulse bg-muted/40" />
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
    r.gananciaEstimada > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : r.gananciaEstimada < 0
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-muted-foreground'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Resumen general</h2>
        <p className="text-sm text-muted-foreground">
          Visión global de tu actividad P2P: volumen, tasas y ganancia estimada.
        </p>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              Total comprado
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl tabular-nums">
              {formatCurrency(r.totalCompras)}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {r.cantidadCompras} operaciones · {formatNumber(r.montoCompras)}{' '}
              unidades
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-rose-500" />
              Total vendido
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl tabular-nums">
              {formatCurrency(r.totalVentas)}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {r.cantidadVentas} operaciones · {formatNumber(r.montoVentas)}{' '}
              unidades
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <PiggyBank className="h-3 w-3" />
              Ganancia estimada
            </CardDescription>
            <CardTitle className={`text-xl sm:text-2xl tabular-nums ${gananciaColor}`}>
              {formatCurrency(r.gananciaEstimada)}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Spread × volumen cruzado − comisiones
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-amber-500" />
              Pendientes
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl tabular-nums">
              {r.pendientes}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Operaciones por confirmar
            </p>
          </CardHeader>
        </Card>
      </div>

      {/* KPIs secundarios */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Coins className="h-3 w-3" />
              Tasa prom. compra
            </CardDescription>
            <CardTitle className="text-lg tabular-nums">
              {formatNumber(r.avgRateCompra, 2)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Coins className="h-3 w-3" />
              Tasa prom. venta
            </CardDescription>
            <CardTitle className="text-lg tabular-nums">
              {formatNumber(r.avgRateVenta, 2)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Wallet className="h-3 w-3" />
              Stock neto activo
            </CardDescription>
            <CardTitle className="text-lg tabular-nums">
              {formatNumber(r.activoNeto, 2)}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Comprado − vendido
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Spread
            </CardDescription>
            <CardTitle
              className={`text-lg tabular-nums ${
                r.avgRateVenta - r.avgRateCompra >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatNumber(r.avgRateVenta - r.avgRateCompra, 2)}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Venta − compra
            </p>
          </CardHeader>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Evolución mensual */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Evolución mensual — Compras vs Ventas
            </CardTitle>
            <CardDescription>
              Últimos 12 meses en moneda fiat (VES por defecto)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
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

        {/* Top contrapartes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Top contrapartes
            </CardTitle>
            <CardDescription>Por volumen fiat operado</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.topCounterpartes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Aún no hay datos
              </p>
            ) : (
              <div className="space-y-3">
                {stats.topCounterpartes.map((c, i) => {
                  const max = stats.topCounterpartes[0].total || 1
                  const pct = (c.total / max) * 100
                  return (
                    <div key={c.counterparty} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 truncate">
                          <span className="text-xs text-muted-foreground w-4">
                            #{i + 1}
                          </span>
                          <span className="font-medium truncate">
                            {c.counterparty}
                          </span>
                        </span>
                        <span className="tabular-nums font-medium">
                          {formatCurrency(c.total)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {c.count} ops · {formatNumber(c.amount)} unidades
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activos negociados */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Activos negociados
            </CardTitle>
            <CardDescription>
              Distribución por volumen fiat
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.activos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Aún no hay datos
              </p>
            ) : (
              <div className="flex items-center gap-4">
                <div className="h-48 w-48 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.activos}
                        dataKey="total"
                        nameKey="asset"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        innerRadius={40}
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
                <div className="flex-1 space-y-2">
                  {stats.activos.map((a, i) => (
                    <div
                      key={a.asset}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{
                            backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                          }}
                        />
                        <span className="font-medium">{a.asset}</span>
                      </span>
                      <div className="text-right">
                        <div className="tabular-nums font-medium">
                          {formatCurrency(a.total)}
                        </div>
                        <div className="text-xs text-muted-foreground">
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
        <CardContent className="pt-6">
          <div className="flex items-start gap-3 text-sm">
            <Users className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium">Cómo se calcula la ganancia estimada</p>
              <p className="text-muted-foreground">
                Tomamos la diferencia entre la tasa promedio de venta y la de
                compra, multiplicada por el volumen cruzado (mínimo entre lo
                comprado y lo vendido), menos las comisiones acumuladas. Es una
                estimación: para un cálculo exacto registra cada operación con su
                banco y tasa específica.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
