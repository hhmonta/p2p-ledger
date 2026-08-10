'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  Percent,
  Coins,
  Wallet,
  ArrowRight,
  RotateCcw,
} from 'lucide-react'
import type { Stats } from '@/lib/types'
import { formatCurrency, formatNumber } from '@/lib/format'
import * as storage from '@/lib/storage'

export function ProfitCalculator() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: () => storage.getStats(),
  })

  // Inputs del usuario
  const [buyRate, setBuyRate] = useState<string>('')
  const [sellRate, setSellRate] = useState<string>('')
  const [volume, setVolume] = useState<string>('')
  const [buyFeePercent, setBuyFeePercent] = useState<string>('0')
  const [sellFeePercent, setSellFeePercent] = useState<string>('0')
  const [fixedFee, setFixedFee] = useState<string>('0')
  const [currency, setCurrency] = useState<string>('VES')

  const CURRENCIES = ['VES', 'USD', 'EUR', 'COP', 'ARS', 'PEN', 'MXN', 'BRL']

  // Cálculos
  const calc = useMemo(() => {
    const bRate = Number(buyRate) || 0
    const sRate = Number(sellRate) || 0
    const vol = Number(volume) || 0
    const bFee = Number(buyFeePercent) || 0
    const sFee = Number(sellFeePercent) || 0
    const fFee = Number(fixedFee) || 0

    const buyTotal = vol * bRate
    const sellTotal = vol * sRate
    const buyFeeAmount = buyTotal * (bFee / 100)
    const sellFeeAmount = sellTotal * (sFee / 100)
    const totalFees = buyFeeAmount + sellFeeAmount + fFee
    const grossProfit = sellTotal - buyTotal
    const netProfit = grossProfit - totalFees
    const spread = sRate - bRate
    const spreadPercent = bRate > 0 ? (spread / bRate) * 100 : 0
    const roi = buyTotal > 0 ? (netProfit / buyTotal) * 100 : 0

    return {
      buyTotal,
      sellTotal,
      buyFeeAmount,
      sellFeeAmount,
      totalFees,
      grossProfit,
      netProfit,
      spread,
      spreadPercent,
      roi,
    }
  }, [buyRate, sellRate, volume, buyFeePercent, sellFeePercent, fixedFee])

  // Pre-llenar con datos del dashboard si existen
  function useLiveRates() {
    if (stats) {
      const r = stats.resumen
      if (r.avgRateCompra > 0) setBuyRate(String(r.avgRateCompra))
      if (r.avgRateVenta > 0) setSellRate(String(r.avgRateVenta))
    }
  }

  function resetAll() {
    setBuyRate('')
    setSellRate('')
    setVolume('')
    setBuyFeePercent('0')
    setSellFeePercent('0')
    setFixedFee('0')
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-24 animate-pulse bg-muted/40" />
          ))}
        </div>
        <Card className="h-64 animate-pulse bg-muted/40" />
      </div>
    )
  }

  const profitColor = calc.netProfit > 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : calc.netProfit < 0
      ? 'text-rose-600 dark:text-rose-400'
      : 'text-muted-foreground'

  return (
    <div className="space-y-2.5 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-xl font-semibold flex items-center gap-2">
            <Calculator className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
            Calculadora de Rentabilidad
          </h2>
          <p className="text-[11px] sm:text-sm text-muted-foreground">
            Simula la ganancia de una operación P2P considerando tasas, volumen y comisiones.
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={useLiveRates} title="Usar tasas promedio del dashboard">
            <TrendingUp className="mr-1 h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tasas live</span>
            <span className="sm:hidden">Live</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={resetAll} title="Reiniciar">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Inputs */}
      <Card>
        <CardHeader className="p-2.5 sm:p-4 pb-2 sm:pb-2">
          <CardTitle className="text-xs sm:text-sm">Parámetros de la operación</CardTitle>
          <CardDescription className="text-[11px] sm:text-xs">
            Ingresa las tasas de compra y venta, el volumen a operar y las comisiones.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2.5 sm:p-4 pt-0 space-y-3">
          {/* Tasas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-emerald-500" />
                Tasa de compra ({currency}/USDT)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="Ej: 55.00"
                value={buyRate}
                onChange={(e) => setBuyRate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-rose-500" />
                Tasa de venta ({currency}/USDT)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="Ej: 56.50"
                value={sellRate}
                onChange={(e) => setSellRate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                <Coins className="h-3 w-3" />
                Volumen (USDT)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="Ej: 100"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
              />
            </div>
          </div>

          {/* Moneda */}
          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-medium">Moneda fiat</label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Comisiones */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                <Percent className="h-3 w-3 text-amber-500" />
                Fee compra (%)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="0"
                value={buyFeePercent}
                onChange={(e) => setBuyFeePercent(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                <Percent className="h-3 w-3 text-amber-500" />
                Fee venta (%)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="0"
                value={sellFeePercent}
                onChange={(e) => setSellFeePercent(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                <Wallet className="h-3 w-3 text-amber-500" />
                Fee fija ({currency})
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="0"
                value={fixedFee}
                onChange={(e) => setFixedFee(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-3">
        <Card className="p-0">
          <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
            <CardDescription className="text-[9px] sm:text-xs">Spread</CardDescription>
            <CardTitle className={`text-sm sm:text-xl tabular-nums leading-tight ${calc.spread >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatNumber(calc.spread, 2)}
            </CardTitle>
            <p className="text-[9px] sm:text-xs text-muted-foreground">
              {formatNumber(calc.spreadPercent, 2)}%
            </p>
          </CardHeader>
        </Card>
        <Card className="p-0">
          <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
            <CardDescription className="text-[9px] sm:text-xs">Ganancia bruta</CardDescription>
            <CardTitle className={`text-sm sm:text-xl tabular-nums leading-tight ${calc.grossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatCurrency(calc.grossProfit, currency)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="p-0">
          <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
            <CardDescription className="text-[9px] sm:text-xs">Comisiones totales</CardDescription>
            <CardTitle className="text-sm sm:text-xl tabular-nums leading-tight text-amber-600 dark:text-amber-400">
              {formatCurrency(calc.totalFees, currency)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="p-0">
          <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
            <CardDescription className="text-[9px] sm:text-xs">Ganancia neta</CardDescription>
            <CardTitle className={`text-sm sm:text-xl tabular-nums leading-tight ${profitColor}`}>
              {formatCurrency(calc.netProfit, currency)}
            </CardTitle>
            <p className="text-[9px] sm:text-xs text-muted-foreground">
              ROI: {formatNumber(calc.roi, 2)}%
            </p>
          </CardHeader>
        </Card>
      </div>

      {/* Desglose detallado */}
      <Card>
        <CardHeader className="p-2.5 sm:p-4 pb-2 sm:pb-2">
          <CardTitle className="text-xs sm:text-sm">Desglose paso a paso</CardTitle>
        </CardHeader>
        <CardContent className="p-2.5 sm:p-4 pt-0">
          <div className="space-y-2 text-xs sm:text-sm">
            {/* Compra */}
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/10 p-2.5 sm:p-3">
              <p className="font-medium text-emerald-700 dark:text-emerald-300 mb-1.5">Compra</p>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{formatNumber(Number(volume) || 0, 2)} USDT × {formatNumber(Number(buyRate) || 0, 2)} {currency}</span>
                <ArrowRight className="h-3 w-3 mx-1.5 text-muted-foreground" />
                <span className="font-medium tabular-nums">{formatCurrency(calc.buyTotal, currency)}</span>
              </div>
              {calc.buyFeeAmount > 0 && (
                <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mt-1">
                  <span>− Comisión compra ({Number(buyFeePercent) || 0}%)</span>
                  <span className="tabular-nums">−{formatCurrency(calc.buyFeeAmount, currency)}</span>
                </div>
              )}
            </div>

            {/* Venta */}
            <div className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/10 p-2.5 sm:p-3">
              <p className="font-medium text-rose-700 dark:text-rose-300 mb-1.5">Venta</p>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{formatNumber(Number(volume) || 0, 2)} USDT × {formatNumber(Number(sellRate) || 0, 2)} {currency}</span>
                <ArrowRight className="h-3 w-3 mx-1.5 text-muted-foreground" />
                <span className="font-medium tabular-nums">{formatCurrency(calc.sellTotal, currency)}</span>
              </div>
              {calc.sellFeeAmount > 0 && (
                <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mt-1">
                  <span>− Comisión venta ({Number(sellFeePercent) || 0}%)</span>
                  <span className="tabular-nums">−{formatCurrency(calc.sellFeeAmount, currency)}</span>
                </div>
              )}
            </div>

            {/* Fee fija */}
            {calc.totalFees > 0 && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/10 p-2.5 sm:p-3">
                <p className="font-medium text-amber-700 dark:text-amber-300 mb-1.5">Comisiones</p>
                {calc.buyFeeAmount > 0 && (
                  <div className="flex items-center justify-between">
                    <span>Fee compra</span>
                    <span className="tabular-nums">−{formatCurrency(calc.buyFeeAmount, currency)}</span>
                  </div>
                )}
                {calc.sellFeeAmount > 0 && (
                  <div className="flex items-center justify-between mt-0.5">
                    <span>Fee venta</span>
                    <span className="tabular-nums">−{formatCurrency(calc.sellFeeAmount, currency)}</span>
                  </div>
                )}
                {Number(fixedFee) > 0 && (
                  <div className="flex items-center justify-between mt-0.5">
                    <span>Fee fija</span>
                    <span className="tabular-nums">−{formatCurrency(Number(fixedFee), currency)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Resultado final */}
            <div className="rounded-lg border-2 border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 p-2.5 sm:p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Ganancia neta</span>
                <span className={`font-bold tabular-nums text-base sm:text-lg ${profitColor}`}>
                  {formatCurrency(calc.netProfit, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1 text-muted-foreground">
                <span>ROI sobre inversión</span>
                <span className={`tabular-nums font-medium ${profitColor}`}>
                  {formatNumber(calc.roi, 2)}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de escenarios */}
      <Card>
        <CardHeader className="p-2.5 sm:p-4 pb-2 sm:pb-2">
          <CardTitle className="text-xs sm:text-sm">Escenarios por volumen</CardTitle>
          <CardDescription className="text-[11px] sm:text-xs">
            Ganancia neta para diferentes volúmenes con las mismas tasas y comisiones.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2.5 sm:p-4 pt-0">
          {Number(buyRate) > 0 && Number(sellRate) > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-1.5 pr-3 text-left font-medium text-muted-foreground">Volumen</th>
                    <th className="py-1.5 pr-3 text-right font-medium text-muted-foreground">Inversión</th>
                    <th className="py-1.5 pr-3 text-right font-medium text-muted-foreground">Retorno</th>
                    <th className="py-1.5 pr-3 text-right font-medium text-muted-foreground">Fees</th>
                    <th className="py-1.5 text-right font-medium text-muted-foreground">Ganancia</th>
                  </tr>
                </thead>
                <tbody>
                  {[50, 100, 200, 500, 1000, 2000, 5000].map((vol) => {
                    const bTotal = vol * (Number(buyRate) || 0)
                    const sTotal = vol * (Number(sellRate) || 0)
                    const bFeeAmt = bTotal * ((Number(buyFeePercent) || 0) / 100)
                    const sFeeAmt = sTotal * ((Number(sellFeePercent) || 0) / 100)
                    const fees = bFeeAmt + sFeeAmt + (Number(fixedFee) || 0)
                    const profit = (sTotal - bTotal) - fees
                    const pColor = profit > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : profit < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-muted-foreground'
                    return (
                      <tr key={vol} className="border-b last:border-0">
                        <td className="py-1.5 pr-3 font-medium">{formatNumber(vol, 0)} USDT</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{formatCurrency(bTotal, currency)}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{formatCurrency(sTotal, currency)}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums text-amber-600 dark:text-amber-400">{formatCurrency(fees, currency)}</td>
                        <td className={`py-1.5 text-right tabular-nums font-medium ${pColor}`}>{formatCurrency(profit, currency)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-[11px] sm:text-sm text-muted-foreground text-center py-6">
              Ingresa tasas de compra y venta para ver los escenarios.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
