'use client'

import { useEffect, useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, ArrowRight, Sparkles, Lock, Unlock } from 'lucide-react'
import type {
  Bank,
  Exchange,
  Transaction,
  TransactionInput,
  TransactionType,
  TransactionStatus,
} from '@/lib/types'
import { toast } from '@/hooks/use-toast'
import { formatCurrency, formatNumber, toDateTimeInputValue } from '@/lib/format'
import * as storage from '@/lib/storage'

const txSchema = z.object({
  type: z.enum(['compra', 'venta']),
  counterparty: z.string().min(1, 'La contraparte es obligatoria'),
  asset: z.string().min(1, 'El activo es obligatorio'),
  amount: z.coerce.number().positive('Debe ser > 0'),
  rate: z.coerce.number().positive('Debe ser > 0'),
  currency: z.string().min(1),
  fromBankId: z.string().optional().nullable(),
  toBankId: z.string().optional().nullable(),
  exchangeId: z.string().optional().nullable(),
  status: z.enum(['pendiente', 'completada', 'cancelada']),
  reference: z.string().optional(),
  fee: z.coerce.number().min(0).default(0),
  date: z.string().min(1),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof txSchema>

const ASSETS = ['USDT', 'USDC', 'BTC', 'ETH', 'BNB', 'USD', 'EUR', 'COP']
const CURRENCIES = ['VES', 'USD', 'EUR', 'COP', 'ARS', 'PEN', 'MXN', 'BRL']

interface TransactionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction?: Transaction | null
  defaultType?: TransactionType
  banks: Bank[]
  onSaved: () => void
}

export function TransactionForm({
  open,
  onOpenChange,
  transaction,
  defaultType = 'compra',
  banks,
  onSaved,
}: TransactionFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [feeLocked, setFeeLocked] = useState(false) // si true, el fee NO se recalcula al cambiar inputs

  const activeBanks = useMemo(() => banks.filter((b) => b.isActive), [banks])
  const activeExchanges = useMemo(() => exchanges.filter((e) => e.isActive), [exchanges])

  // Cargar exchanges
  useEffect(() => {
    storage.listExchanges().then(setExchanges).catch(() => {})
  }, [open])

  const form = useForm<FormValues>({
    resolver: zodResolver(txSchema),
    defaultValues: {
      type: defaultType,
      counterparty: '',
      asset: 'USDT',
      amount: 0,
      rate: 0,
      currency: 'VES',
      fromBankId: null,
      toBankId: null,
      exchangeId: null,
      status: 'completada',
      reference: '',
      fee: 0,
      date: toDateTimeInputValue(new Date()),
      notes: '',
    },
  })

  useEffect(() => {
    if (open) {
      if (transaction) {
        form.reset({
          type: transaction.type,
          counterparty: transaction.counterparty,
          asset: transaction.asset,
          amount: transaction.amount,
          rate: transaction.rate,
          currency: transaction.currency,
          fromBankId: transaction.fromBankId ?? null,
          toBankId: transaction.toBankId ?? null,
          exchangeId: transaction.exchangeId ?? null,
          status: transaction.status,
          reference: transaction.reference ?? '',
          fee: transaction.fee,
          date: toDateTimeInputValue(transaction.date),
          notes: transaction.notes ?? '',
        })
        // Al editar, consideramos el fee como bloqueado (es el valor guardado)
        setFeeLocked(true)
      } else {
        form.reset({
          type: defaultType,
          counterparty: '',
          asset: 'USDT',
          amount: 0,
          rate: 0,
          currency: 'VES',
          fromBankId: null,
          toBankId: null,
          exchangeId: null,
          status: 'completada',
          reference: '',
          fee: 0,
          date: toDateTimeInputValue(new Date()),
          notes: '',
        })
        setFeeLocked(false)
      }
    }
  }, [open, transaction, defaultType, form])

  const watchedAmount = form.watch('amount')
  const watchedRate = form.watch('rate')
  const watchedCurrency = form.watch('currency')
  const watchedAsset = form.watch('asset')
  const watchedType = form.watch('type')
  const watchedExchangeId = form.watch('exchangeId')
  const watchedFee = form.watch('fee')

  const total = (Number(watchedAmount) || 0) * (Number(watchedRate) || 0)

  // Cálculo automático de comisión cuando cambia exchange, monto, tasa o tipo
  // (solo si el fee NO está bloqueado manualmente)
  useEffect(() => {
    if (feeLocked) return
    if (!watchedExchangeId || watchedExchangeId === '__none') {
      form.setValue('fee', 0)
      return
    }
    const ex = exchanges.find((e) => e.id === watchedExchangeId)
    if (!ex) return
    const calc = storage.calculateFee(ex, watchedType, total)
    form.setValue('fee', Number(calc.total.toFixed(6)))
  }, [watchedExchangeId, watchedAmount, watchedRate, watchedType, exchanges, total, feeLocked, form])

  // Al cambiar de exchange manualmente, desbloquear fee para recalcular
  function handleExchangeChange(v: string) {
    const value = v === '__none' ? null : v
    form.setValue('exchangeId', value)
    setFeeLocked(false) // si cambias exchange, se recalcula
  }

  function unlockFee() {
    setFeeLocked(false)
  }

  function lockFee() {
    setFeeLocked(true)
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      const payload: TransactionInput = {
        type: values.type,
        counterparty: values.counterparty,
        asset: values.asset,
        amount: Number(values.amount),
        rate: Number(values.rate),
        currency: values.currency,
        fromBankId: values.fromBankId || null,
        toBankId: values.toBankId || null,
        exchangeId: values.exchangeId || null,
        status: values.status,
        reference: values.reference || null,
        fee: Number(values.fee),
        date: new Date(values.date).toISOString(),
        notes: values.notes || null,
      }

      if (transaction) {
        await storage.updateTransaction(transaction.id, payload)
      } else {
        await storage.createTransaction(payload)
      }

      toast({
        title: transaction
          ? 'Transacción actualizada'
          : values.type === 'compra'
            ? 'Compra registrada'
            : 'Venta registrada',
        description: `${values.type === 'compra' ? 'Compra' : 'Venta'} de ${formatNumber(values.amount)} ${values.asset} con ${values.counterparty}.`,
      })
      onSaved()
      onOpenChange(false)
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Error desconocido',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Neto (total menos comisión)
  const fee = Number(watchedFee) || 0
  const netTotal = total - fee

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {transaction
              ? 'Editar transacción'
              : defaultType === 'compra'
                ? 'Nueva compra P2P'
                : 'Nueva venta P2P'}
          </DialogTitle>
          <DialogDescription>
            {watchedType === 'compra'
              ? 'Registra una compra: tú envías moneda fiat y recibes el activo.'
              : 'Registra una venta: tú envías el activo y recibes moneda fiat.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Tipo de operación */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de operación</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        field.onChange('compra')
                        setFeeLocked(false) // recalcular fee con nuevo tipo
                      }}
                      className={`rounded-lg border-2 p-3 text-sm font-medium transition ${
                        field.value === 'compra'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'border-border hover:border-emerald-300'
                      }`}
                    >
                      Compra
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        field.onChange('venta')
                        setFeeLocked(false)
                      }}
                      className={`rounded-lg border-2 p-3 text-sm font-medium transition ${
                        field.value === 'venta'
                          ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                          : 'border-border hover:border-rose-300'
                      }`}
                    >
                      Venta
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="counterparty"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Contraparte *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Persona o plataforma (ej: @usuario, Binance P2P, etc.)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* EXCHANGE */}
              <FormField
                control={form.control}
                name="exchangeId"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                      Exchange / Plataforma
                    </FormLabel>
                    <Select
                      onValueChange={handleExchangeChange}
                      value={field.value ?? '__none'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sin exchange específico" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none">Sin exchange (manual)</SelectItem>
                        {activeExchanges.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            <span className="flex items-center gap-2">
                              <span
                                className="inline-block w-2 h-2 rounded-full"
                                style={{ backgroundColor: e.color }}
                              />
                              {e.name}
                              <span className="text-xs text-muted-foreground ml-1">
                                {watchedType === 'compra'
                                  ? e.buyFeeType === 'percent'
                                    ? `${e.buyFeeValue}%`
                                    : `fijo ${e.buyFeeValue}`
                                  : e.sellFeeType === 'percent'
                                    ? `${e.sellFeeValue}%`
                                    : `fijo ${e.sellFeeValue}`}
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Selecciona el exchange para calcular la comisión automáticamente. Puedes
                      ajustarla después.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="asset"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Activo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ASSETS.map((a) => (
                          <SelectItem key={a} value={a}>
                            {a}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Moneda fiat</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad de {watchedAsset || 'activo'} *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.000001"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tasa ({watchedCurrency}/{watchedAsset || '...'}) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.000001"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Total calculado */}
              <div className="sm:col-span-2 rounded-lg bg-muted p-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Total bruto ({watchedCurrency})
                </span>
                <span className="font-semibold tabular-nums">
                  {formatCurrency(total, watchedCurrency)}
                </span>
              </div>

              {/* Bancos */}
              {watchedType === 'compra' ? (
                <>
                  <FormField
                    control={form.control}
                    name="fromBankId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Banco que paga (origen)</FormLabel>
                        <Select
                          onValueChange={(v) =>
                            field.onChange(v === '__none' ? null : v)
                          }
                          value={field.value ?? '__none'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sin banco" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none">
                              Sin banco
                            </SelectItem>
                            {activeBanks.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.name} ({b.currency})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Banco desde donde sale el dinero fiat.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="toBankId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Banco receptor (opcional)</FormLabel>
                        <Select
                          onValueChange={(v) =>
                            field.onChange(v === '__none' ? null : v)
                          }
                          value={field.value ?? '__none'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sin banco" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none">
                              Sin banco
                            </SelectItem>
                            {activeBanks.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.name} ({b.currency})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Donde recibes el activo (si aplica).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : (
                <>
                  <FormField
                    control={form.control}
                    name="fromBankId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Banco que envía activo (opcional)</FormLabel>
                        <Select
                          onValueChange={(v) =>
                            field.onChange(v === '__none' ? null : v)
                          }
                          value={field.value ?? '__none'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sin banco" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none">
                              Sin banco
                            </SelectItem>
                            {activeBanks.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.name} ({b.currency})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Banco desde donde sale el activo (si aplica).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="toBankId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Banco que recibe fiat</FormLabel>
                        <Select
                          onValueChange={(v) =>
                            field.onChange(v === '__none' ? null : v)
                          }
                          value={field.value ?? '__none'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sin banco" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none">
                              Sin banco
                            </SelectItem>
                            {activeBanks.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.name} ({b.currency})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Banco donde recibes el dinero fiat.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* Flujo visual */}
              {(form.watch('fromBankId') || form.watch('toBankId')) && (
                <div className="sm:col-span-2 flex items-center gap-2 text-xs text-muted-foreground rounded-lg border p-2">
                  <span className="font-medium text-foreground">
                    {activeBanks.find(
                      (b) => b.id === form.watch('fromBankId')
                    )?.name ?? '—'}
                  </span>
                  <ArrowRight className="h-3 w-3" />
                  <span>
                    {watchedType === 'compra'
                      ? `${formatNumber(Number(watchedAmount) || 0)} ${watchedAsset}`
                      : `${formatCurrency(total, watchedCurrency)}`}
                  </span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="font-medium text-foreground">
                    {activeBanks.find(
                      (b) => b.id === form.watch('toBankId')
                    )?.name ?? '—'}
                  </span>
                </div>
              )}

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="completada">Completada</SelectItem>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="cancelada">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha y hora</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referencia</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="N° de operación o ref"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Comisión con toggle de bloqueo */}
              <FormField
                control={form.control}
                name="fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between">
                      <span>Comisión ({watchedCurrency})</span>
                      <button
                        type="button"
                        onClick={feeLocked ? unlockFee : lockFee}
                        className="text-xs flex items-center gap-1 px-2 py-0.5 rounded border hover:bg-muted"
                        title={feeLocked ? 'Desbloquear para recalcular automáticamente' : 'Bloquear valor manual'}
                      >
                        {feeLocked ? (
                          <>
                            <Lock className="h-3 w-3" /> Manual
                          </>
                        ) : (
                          <>
                            <Unlock className="h-3 w-3" /> Auto
                          </>
                        )}
                      </button>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {watchedExchangeId && watchedExchangeId !== '__none'
                        ? `Calculada automáticamente según el exchange. ${feeLocked ? 'Bloqueada manualmente.' : 'Se recalcula al cambiar monto/tasa.'}`
                        : 'Ingresa la comisión manualmente o selecciona un exchange para calcularla.'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Resumen neto */}
            <div className="rounded-lg border-2 border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total bruto</span>
                <span className="tabular-nums">{formatCurrency(total, watchedCurrency)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-amber-600 dark:text-amber-400">− Comisión</span>
                <span className="tabular-nums text-amber-600 dark:text-amber-400">
                  {formatCurrency(fee, watchedCurrency)}
                </span>
              </div>
              {/* Detalle de comisión cuando hay exchange seleccionado */}
              {(() => {
                if (!watchedExchangeId || watchedExchangeId === '__none') return null
                const ex = exchanges.find((e) => e.id === watchedExchangeId)
                if (!ex) return null
                const calc = storage.calculateFee(ex, watchedType, total)
                const tiers = watchedType === 'compra' ? ex.buyTiers : ex.sellTiers
                const applicableTier = tiers && tiers.length > 0
                  ? [...tiers].sort((a, b) => b.minAmount - a.minAmount).find((t) => total >= t.minAmount)
                  : null
                return (
                  <div className="text-[11px] text-muted-foreground pl-2 border-l-2 border-amber-200 dark:border-amber-900 space-y-0.5">
                    {applicableTier ? (
                      <p>
                        Tier aplicado: ≥ {formatNumber(applicableTier.minAmount, 0)} →{' '}
                        {formatNumber(applicableTier.feeValue, 4)}
                        {applicableTier.feeType === 'percent' ? '%' : ` ${watchedCurrency}`}
                      </p>
                    ) : (
                      <p>
                        Comisión base:{' '}
                        {(watchedType === 'compra' ? ex.buyFeeType : ex.sellFeeType) === 'percent'
                          ? `${formatNumber(watchedType === 'compra' ? ex.buyFeeValue : ex.sellFeeValue, 4)}%`
                          : `${formatNumber(watchedType === 'compra' ? ex.buyFeeValue : ex.sellFeeValue, 4)} ${watchedCurrency}`}
                      </p>
                    )}
                    {calc.discount > 0 && (
                      <p className="text-violet-600 dark:text-violet-400">
                        −{formatCurrency(calc.discount, watchedCurrency)} ({ex.discountLabel ?? `${ex.discountPercent}% off`})
                      </p>
                    )}
                    {calc.fixedFee > 0 && (
                      <p>
                        +{formatCurrency(calc.fixedFee, watchedCurrency)} fija ({ex.fixedFeeCurrency})
                      </p>
                    )}
                  </div>
                )
              })()}
              <div className="flex items-center justify-between text-sm pt-1.5 border-t border-emerald-200 dark:border-emerald-900">
                <span className="font-medium">Total neto</span>
                <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(netTotal, watchedCurrency)}
                </span>
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalles adicionales..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {transaction
                  ? 'Guardar cambios'
                  : watchedType === 'compra'
                    ? 'Registrar compra'
                    : 'Registrar venta'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
