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
  Building2,
  Percent,
  DollarSign,
  ArrowLeftRight,
} from 'lucide-react'
import type { Stats } from '@/lib/types'
import { formatCurrency, formatNumber } from '@/lib/format'
import * as storage from '@/lib/storage'

const PIE_COLORS = ['#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444', '#3b82f6', '#84cc16']

// Subcomponente: tarjeta KPI
function KpiCard({
  icon: Icon,
  iconColor,
  label,
  value,
  sub,
  valueColor,
  className = '',
}: {
  icon: React.ComponentType<{ className?: string }>
  iconColor?: string
  label: string
  value: string
  sub?: string
  valueColor?: string
  className?: string
}) {
  return (
    <Card className={`p-0 ${className}`}>
      <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
        <CardDescription className="flex items-center gap-1 text-[9px] sm:text-xs">
          <Icon className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${iconColor ?? ''}`} />
          {label}
        </CardDescription>
        <CardTitle className={`text-sm sm:text-xl tabular-nums leading-tight ${valueColor ?? ''}`}>
          {value}
        </CardTitle>
        {sub && <p className="text-[9px] sm:text-xs text-muted-foreground">{sub}</p>}
      </CardHeader>
    </Card>
  )
}

export function Dashboard() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: () => storage.getStats(),
  })

  if (isLoading || !stats) {
    return (
      <div className="space-y-2.5 sm:space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-3">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="h-20 sm:h-24 animate-pulse bg-muted/40" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-3">
          {[...Array(3)].map((_, i) => (
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
    return { ...m, label: date.toLocaleString('es-VE', { month: 'short' }) }
  })

  const gananciaColor =
    r.gananciaNeta > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : r.gananciaNeta < 0
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-muted-foreground'

  const gananciaColorUSD =
    r.gananciaNetaUSD > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : r.gananciaNetaUSD < 0
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-muted-foreground'

  const spread = r.avgRateVenta - r.avgRateCompra
  const spreadColor = spread >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'

  return (
    <div className="space-y-2.5 sm:space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-base sm:text-xl font-semibold">Resumen general</h2>
        <p className="text-[11px] sm:text-sm text-muted-foreground">
          Actividad P2P separada por moneda: volumen, comisiones, tasas y ganancia neta.
        </p>
      </div>

      {/* ========== BLOQUE VES ========== */}
      <div className="space-y-1.5">
        <p className="text-[10px] sm:text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
          <Coins className="h-3 w-3" /> En VES (Bolívares)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-3">
          <KpiCard
            icon={TrendingUp}
            iconColor="text-emerald-500"
            label="Total comprado"
            value={formatCurrency(r.totalCompras)}
            sub={`${r.cantidadCompras} ops · ${formatNumber(r.montoCompras)} u.`}
          />
          <KpiCard
            icon={TrendingDown}
            iconColor="text-rose-500"
            label="Total vendido"
            value={formatCurrency(r.totalVentas)}
            sub={`${r.cantidadVentas} ops · ${formatNumber(r.montoVentas)} u.`}
          />
          <KpiCard
            icon={PiggyBank}
            label="Ganancia neta"
            value={formatCurrency(r.gananciaNeta)}
            valueColor={gananciaColor}
            sub="Spread × vol − fees"
          />
          <KpiCard
            icon={Wallet}
            label="Capital neto"
            value={formatCurrency(r.activoNeto)}
            sub="Compras − Ventas (neto)"
          />
        </div>
      </div>

      {/* ========== BLOQUE USD ========== */}
      <div className="space-y-1.5">
        <p className="text-[10px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
          <DollarSign className="h-3 w-3" /> En USD (Dólares)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-3">
          <KpiCard
            icon={TrendingUp}
            iconColor="text-emerald-500"
            label="Total comprado"
            value={formatCurrency(r.totalComprasUSD, 'USD')}
            className="border-blue-100 dark:border-blue-900/30"
          />
          <KpiCard
            icon={TrendingDown}
            iconColor="text-rose-500"
            label="Total vendido"
            value={formatCurrency(r.totalVentasUSD, 'USD')}
            className="border-blue-100 dark:border-blue-900/30"
          />
          <KpiCard
            icon={PiggyBank}
            label="Ganancia neta"
            value={formatCurrency(r.gananciaNetaUSD, 'USD')}
            valueColor={gananciaColorUSD}
            className="border-blue-100 dark:border-blue-900/30"
          />
          <KpiCard
            icon={Wallet}
            label="Capital neto"
            value={formatCurrency(r.activoNetoUSD, 'USD')}
            sub="Compras − Ventas (neto)"
            className="border-blue-100 dark:border-blue-900/30"
          />
        </div>
      </div>

      {/* ========== TASAS Y OPERACIÓN ========== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-3">
        <KpiCard
          icon={Coins}
          iconColor="text-emerald-500"
          label="Tasa compra prom."
          value={formatNumber(r.avgRateCompra, 2)}
        />
        <KpiCard
          icon={Coins}
          iconColor="text-rose-500"
          label="Tasa venta prom."
          value={formatNumber(r.avgRateVenta, 2)}
        />
        <KpiCard
          icon={ArrowLeftRight}
          iconColor={spreadColor}
          label="Spread"
          value={formatNumber(spread, 2)}
          valueColor={spreadColor}
        />
        <KpiCard
          icon={Clock}
          iconColor="text-amber-500"
          label="Pendientes"
          value={String(r.pendientes)}
          sub="Por confirmar"
        />
      </div>

      {/* ========== COMISIONES VES ========== */}
      <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/10">
        <CardContent className="p-2.5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <div className="h-7 w-7 sm:h-10 sm:w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Percent className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-[9px] sm:text-xs text-muted-foreground">Total comisiones (VES)</p>
                <p className="text-base sm:text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400 leading-tight">
                  {formatCurrency(r.feesTotal)}
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
                <p className="text-[9px] sm:text-xs text-muted-foreground">Capital neto</p>
                <p className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(r.netCompras - r.netVentas)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========== COMISIONES USD ========== */}
      <Card className="border-blue-200 dark:border-blue-900/30 bg-blue-50/20 dark:bg-blue-950/5">
        <CardContent className="p-2.5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <div className="h-7 w-7 sm:h-10 sm:w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <DollarSign className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-[9px] sm:text-xs text-muted-foreground">Total comisiones (USD)</p>
                <p className="text-base sm:text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400 leading-tight">
                  {formatCurrency(r.feesTotalUSD, 'USD')}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-4 flex-1 text-[11px] sm:text-sm">
              <div>
                <p className="text-[9px] sm:text-xs text-muted-foreground">Compras</p>
                <p className="font-medium tabular-nums">{formatCurrency(r.feesComprasUSD, 'USD')}</p>
              </div>
              <div>
                <p className="text-[9px] sm:text-xs text-muted-foreground">Ventas</p>
                <p className="font-medium tabular-nums">{formatCurrency(r.feesVentasUSD, 'USD')}</p>
              </div>
              <div>
                <p className="text-[9px] sm:text-xs text-muted-foreground">Capital neto</p>
                <p className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(r.netComprasUSD - r.netVentasUSD, 'USD')}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========== GRÁFICOS ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-3">
        {/* Evolución mensual */}
        <Card className="lg:col-span-2">
          <CardHeader className="p-2.5 sm:p-6">
            <CardTitle className="text-xs sm:text-base">
              Evolución mensual — Compras vs Ventas
            </CardTitle>
            <CardDescription className="text-[11px] sm:text-sm">
              Últimos 12 meses (montos en la moneda de cada transacción)
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

        {/* Top contrapartes */}
        <Card>
          <CardHeader className="p-2.5 sm:p-6">
            <CardTitle className="text-xs sm:text-base flex items-center gap-2">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-violet-500" />
              Top contrapartes
            </CardTitle>
            <CardDescription className="text-[11px] sm:text-sm">Mayores volúmenes operados</CardDescription>
          </CardHeader>
          <CardContent className="p-2.5 sm:p-6 pt-0">
            {stats.topCounterpartes.length === 0 ? (
              <p className="text-[11px] sm:text-sm text-muted-foreground py-4 sm:py-6 text-center">
                Aún no hay operaciones completadas
              </p>
            ) : (
              <div className="space-y-1.5 sm:space-y-3">
                {stats.topCounterpartes.map((cp, i) => {
                  const max = stats.topCounterpartes[0]?.total || 1
                  const pct = max > 0 ? (cp.total / max) * 100 : 0
                  return (
                    <div key={cp.counterparty} className="space-y-1">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="font-medium truncate min-w-0">
                          <span className="text-muted-foreground mr-1.5">{i + 1}.</span>
                          {cp.counterparty}
                        </span>
                        <span className="tabular-nums font-medium flex-shrink-0 ml-2">
                          {formatCurrency(cp.total)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-violet-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                        {cp.count} ops · {formatNumber(cp.amount)} unidades
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activos (pie chart) */}
        <Card>
          <CardHeader className="p-2.5 sm:p-6">
            <CardTitle className="text-xs sm:text-base flex items-center gap-2">
              <Coins className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />
              Activos operados
            </CardTitle>
            <CardDescription className="text-[11px] sm:text-sm">Distribución por criptoactivo</CardDescription>
          </CardHeader>
          <CardContent className="p-2.5 sm:p-6 pt-0">
            {stats.activos.length === 0 ? (
              <p className="text-[11px] sm:text-sm text-muted-foreground py-4 sm:py-6 text-center">
                Aún no hay operaciones completadas
              </p>
            ) : (
              <>
                <div className="h-32 sm:h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.activos}
                        dataKey="total"
                        nameKey="asset"
                        cx="50%"
                        cy="50%"
                        outerRadius="70%"
                        innerRadius="40%"
                        paddingAngle={2}
                        strokeWidth={0}
                      >
                        {stats.activos.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => formatCurrency(v)}
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
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  {stats.activos.map((a, i) => (
                    <div key={a.asset} className="flex items-center gap-1.5 text-[10px] sm:text-xs">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="font-medium">{a.asset}</span>
                      <span className="text-muted-foreground">{a.count} ops</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Comisiones por exchange */}
        <Card className="lg:col-span-2">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {stats.feesPorExchange.map((f) => {
                  const max = stats.feesPorExchange[0]?.totalFees || 1
                  const pct = max > 0 ? (f.totalFees / max) * 100 : 0
                  return (
                    <div key={f.exchangeId ?? 'none'} className="flex items-center gap-2 sm:gap-3">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: f.exchangeColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="font-medium truncate">{f.exchangeName}</span>
                          <span className="tabular-nums font-medium text-amber-600 dark:text-amber-400 flex-shrink-0 ml-2">
                            {formatCurrency(f.totalFees)}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: f.exchangeColor }}
                          />
                        </div>
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">
                          {f.count} ops · {f.compras}C / {f.ventas}V
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
