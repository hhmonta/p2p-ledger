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
  TrendingUp,
  TrendingDown,
  Wallet,
  Coins,
  PiggyBank,
  Clock,
  ArrowLeftRight,
  BarChart3,
  DollarSign,
  Repeat,
} from 'lucide-react'
import type { Stats } from '@/lib/types'
import { formatCurrency, formatNumber } from '@/lib/format'
import * as storage from '@/lib/storage'

export function ResumenView() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: () => storage.getStats(),
  })

  if (isLoading || !stats) {
    return (
      <div className="space-y-2.5 sm:space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-20 sm:h-24 animate-pulse bg-muted/40" />
          ))}
        </div>
        <Card className="h-32 animate-pulse bg-muted/40" />
      </div>
    )
  }

  const r = stats.resumen
  const spread = r.avgRateVenta - r.avgRateCompra
  const spreadPct = r.avgRateCompra > 0 ? (spread / r.avgRateCompra) * 100 : 0
  const gananciaColor = r.gananciaNeta > 0 ? 'text-emerald-600 dark:text-emerald-400' : r.gananciaNeta < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'
  const gananciaColorUSD = r.gananciaNetaUSD > 0 ? 'text-emerald-600 dark:text-emerald-400' : r.gananciaNetaUSD < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'

  const totalOps = r.cantidadCompras + r.cantidadVentas + r.pendientes

  return (
    <div className="space-y-2.5 sm:space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-base sm:text-xl font-semibold">Resumen</h2>
        <p className="text-[11px] sm:text-sm text-muted-foreground">
          Vista general de tu actividad P2P.
        </p>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
        <Card className="p-0">
          <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2 text-center">
            <CardDescription className="text-[9px] sm:text-xs">Operaciones</CardDescription>
            <CardTitle className="text-base sm:text-2xl tabular-nums">{totalOps}</CardTitle>
            <p className="text-[9px] sm:text-xs text-muted-foreground">{r.cantidadCompras}C · {r.cantidadVentas}V · {r.pendientes}P</p>
          </CardHeader>
        </Card>
        <Card className="p-0">
          <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2 text-center">
            <CardDescription className="text-[9px] sm:text-xs">Tasa promedio</CardDescription>
            <CardTitle className="text-base sm:text-2xl tabular-nums">{formatNumber((r.avgRateCompra + r.avgRateVenta) / 2, 2)}</CardTitle>
            <p className="text-[9px] sm:text-xs text-muted-foreground">C: {formatNumber(r.avgRateCompra, 2)} · V: {formatNumber(r.avgRateVenta, 2)}</p>
          </CardHeader>
        </Card>
        <Card className="p-0">
          <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2 text-center">
            <CardDescription className="text-[9px] sm:text-xs">Spread</CardDescription>
            <CardTitle className={`text-base sm:text-2xl tabular-nums ${spread >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatNumber(spreadPct, 2)}%
            </CardTitle>
            <p className="text-[9px] sm:text-xs text-muted-foreground">{formatNumber(spread, 2)} Bs/u</p>
          </CardHeader>
        </Card>
      </div>

      {/* VES Section */}
      <div className="space-y-1.5">
        <p className="text-[10px] sm:text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
          <Coins className="h-3 w-3" /> Bolívares (VES)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-3">
          <Card className="p-0">
            <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
              <CardDescription className="flex items-center gap-1 text-[9px] sm:text-xs">
                <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-500" />
                Comprado
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
                Vendido
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
              <p className="text-[9px] sm:text-xs text-muted-foreground">Spread × vol − fees</p>
            </CardHeader>
          </Card>
          <Card className="p-0">
            <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
              <CardDescription className="flex items-center gap-1 text-[9px] sm:text-xs">
                <Wallet className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                Capital neto
              </CardDescription>
              <CardTitle className="text-sm sm:text-xl tabular-nums leading-tight">
                {formatCurrency(r.activoNeto)}
              </CardTitle>
              <p className="text-[9px] sm:text-xs text-muted-foreground">Compras − Ventas</p>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* USD Section */}
      <div className="space-y-1.5">
        <p className="text-[10px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
          <DollarSign className="h-3 w-3" /> Dólares (USD)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-3">
          <Card className="p-0 border-blue-100 dark:border-blue-900/30">
            <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
              <CardDescription className="flex items-center gap-1 text-[9px] sm:text-xs">
                <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-500" />
                Comprado
              </CardDescription>
              <CardTitle className="text-sm sm:text-xl tabular-nums leading-tight">
                {formatCurrency(r.totalComprasUSD, 'USD')}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="p-0 border-blue-100 dark:border-blue-900/30">
            <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
              <CardDescription className="flex items-center gap-1 text-[9px] sm:text-xs">
                <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-rose-500" />
                Vendido
              </CardDescription>
              <CardTitle className="text-sm sm:text-xl tabular-nums leading-tight">
                {formatCurrency(r.totalVentasUSD, 'USD')}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="p-0 border-blue-100 dark:border-blue-900/30">
            <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
              <CardDescription className="flex items-center gap-1 text-[9px] sm:text-xs">
                <PiggyBank className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                Ganancia neta
              </CardDescription>
              <CardTitle className={`text-sm sm:text-xl tabular-nums leading-tight ${gananciaColorUSD}`}>
                {formatCurrency(r.gananciaNetaUSD, 'USD')}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="p-0 border-blue-100 dark:border-blue-900/30">
            <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
              <CardDescription className="flex items-center gap-1 text-[9px] sm:text-xs">
                <Wallet className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                Capital neto
              </CardDescription>
              <CardTitle className="text-sm sm:text-xl tabular-nums leading-tight">
                {formatCurrency(r.activoNetoUSD, 'USD')}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Comisiones resumidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-3">
        <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/10">
          <CardContent className="p-2.5 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] sm:text-xs text-muted-foreground">Comisiones VES</p>
                <p className="text-base sm:text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  {formatCurrency(r.feesTotal)}
                </p>
              </div>
              <div className="text-right text-[10px] sm:text-xs text-muted-foreground space-y-0.5">
                <p>Compras: {formatCurrency(r.feesCompras)}</p>
                <p>Ventas: {formatCurrency(r.feesVentas)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 dark:border-blue-900/30 bg-blue-50/20 dark:bg-blue-950/5">
          <CardContent className="p-2.5 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] sm:text-xs text-muted-foreground">Comisiones USD</p>
                <p className="text-base sm:text-xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                  {formatCurrency(r.feesTotalUSD, 'USD')}
                </p>
              </div>
              <div className="text-right text-[10px] sm:text-xs text-muted-foreground space-y-0.5">
                <p>Compras: {formatCurrency(r.feesComprasUSD, 'USD')}</p>
                <p>Ventas: {formatCurrency(r.feesVentasUSD, 'USD')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
