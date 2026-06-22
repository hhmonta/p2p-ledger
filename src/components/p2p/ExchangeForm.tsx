'use client'

import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
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
import { Switch } from '@/components/ui/switch'
import { Loader2, Plus, Trash2, Layers, Percent, Tag } from 'lucide-react'
import type { Exchange, ExchangeInput, FeeType, FeeTier } from '@/lib/types'
import { toast } from '@/hooks/use-toast'
import * as storage from '@/lib/storage'

// Schema de un tier
const tierSchema = z.object({
  minAmount: z.coerce.number().min(0),
  feeType: z.enum(['percent', 'fixed']),
  feeValue: z.coerce.number().min(0),
})

const exchangeSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  shortName: z.string().optional(),
  color: z.string().min(1),
  buyFeeType: z.enum(['percent', 'fixed']),
  buyFeeValue: z.coerce.number().min(0),
  buyTiers: z.array(tierSchema).optional(),
  sellFeeType: z.enum(['percent', 'fixed']),
  sellFeeValue: z.coerce.number().min(0),
  sellTiers: z.array(tierSchema).optional(),
  fixedFee: z.coerce.number().min(0).default(0),
  fixedFeeCurrency: z.string().min(1),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  discountLabel: z.string().optional(),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof exchangeSchema>
type TierField = { minAmount: number; feeType: 'percent' | 'fixed'; feeValue: number }

const COLORS = [
  { name: 'Esmeralda', value: '#10b981' },
  { name: 'Ámbar', value: '#f59e0b' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Violeta', value: '#8b5cf6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Rojo', value: '#ef4444' },
  { name: 'Lima', value: '#84cc16' },
  { name: 'Naranja', value: '#f97316' },
  { name: 'Slate', value: '#64748b' },
  { name: 'Turquesa', value: '#14b8a6' },
  { name: 'Amarillo', value: '#facc15' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Negro', value: '#0a0a0a' },
  { name: 'Fucsia', value: '#d946ef' },
]

const CURRENCIES = ['USDT', 'USDC', 'BTC', 'ETH', 'USD', 'EUR', 'VES', 'COP', 'ARS', 'MXN', 'BRL']

interface ExchangeFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  exchange?: Exchange | null
  onSaved: () => void
}

export function ExchangeForm({
  open,
  onOpenChange,
  exchange,
  onSaved,
}: ExchangeFormProps) {
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(exchangeSchema),
    defaultValues: {
      name: '',
      shortName: '',
      color: '#3b82f6',
      buyFeeType: 'percent',
      buyFeeValue: 0,
      buyTiers: [],
      sellFeeType: 'percent',
      sellFeeValue: 0,
      sellTiers: [],
      fixedFee: 0,
      fixedFeeCurrency: 'USDT',
      discountPercent: 0,
      discountLabel: '',
      isActive: true,
      notes: '',
    },
  })

  // Field arrays para tiers dinámicos
  const buyTiersField = useFieldArray({ control: form.control, name: 'buyTiers' })
  const sellTiersField = useFieldArray({ control: form.control, name: 'sellTiers' })

  useEffect(() => {
    if (open) {
      if (exchange) {
        form.reset({
          name: exchange.name,
          shortName: exchange.shortName ?? '',
          color: exchange.color,
          buyFeeType: exchange.buyFeeType as FeeType,
          buyFeeValue: exchange.buyFeeValue,
          buyTiers: (exchange.buyTiers ?? []).map((t) => ({
            minAmount: t.minAmount,
            feeType: t.feeType,
            feeValue: t.feeValue,
          })),
          sellFeeType: exchange.sellFeeType as FeeType,
          sellFeeValue: exchange.sellFeeValue,
          sellTiers: (exchange.sellTiers ?? []).map((t) => ({
            minAmount: t.minAmount,
            feeType: t.feeType,
            feeValue: t.feeValue,
          })),
          fixedFee: exchange.fixedFee,
          fixedFeeCurrency: exchange.fixedFeeCurrency,
          discountPercent: exchange.discountPercent,
          discountLabel: exchange.discountLabel ?? '',
          isActive: exchange.isActive,
          notes: exchange.notes ?? '',
        })
      } else {
        form.reset({
          name: '',
          shortName: '',
          color: '#3b82f6',
          buyFeeType: 'percent',
          buyFeeValue: 0,
          buyTiers: [],
          sellFeeType: 'percent',
          sellFeeValue: 0,
          sellTiers: [],
          fixedFee: 0,
          fixedFeeCurrency: 'USDT',
          discountPercent: 0,
          discountLabel: '',
          isActive: true,
          notes: '',
        })
      }
    }
  }, [open, exchange, form])

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      // Sanitizar tiers: ordenar por minAmount asc y filtrar vacíos
      const cleanTiers = (tiers: TierField[] | undefined): FeeTier[] => {
        if (!tiers || tiers.length === 0) return []
        return [...tiers]
          .filter((t) => t.minAmount !== undefined && t.feeValue !== undefined)
          .map((t) => ({
            minAmount: Number(t.minAmount),
            feeType: t.feeType as FeeType,
            feeValue: Number(t.feeValue),
          }))
          .sort((a, b) => a.minAmount - b.minAmount)
      }

      const payload: ExchangeInput = {
        name: values.name,
        shortName: values.shortName || null,
        color: values.color,
        buyFeeType: values.buyFeeType,
        buyFeeValue: Number(values.buyFeeValue),
        buyTiers: cleanTiers(values.buyTiers as TierField[] | undefined),
        sellFeeType: values.sellFeeType,
        sellFeeValue: Number(values.sellFeeValue),
        sellTiers: cleanTiers(values.sellTiers as TierField[] | undefined),
        fixedFee: Number(values.fixedFee),
        fixedFeeCurrency: values.fixedFeeCurrency,
        discountPercent: Number(values.discountPercent),
        discountLabel: values.discountLabel || null,
        isActive: values.isActive,
        notes: values.notes || null,
      }

      if (exchange) {
        await storage.updateExchange(exchange.id, payload)
      } else {
        await storage.createExchange(payload)
      }

      toast({
        title: exchange ? 'Exchange actualizado' : 'Exchange creado',
        description: `«${values.name}» se guardó correctamente.`,
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

  const buyFeeType = form.watch('buyFeeType')
  const sellFeeType = form.watch('sellFeeType')
  const buyTiers = form.watch('buyTiers') ?? []
  const sellTiers = form.watch('sellTiers') ?? []
  const discountPercent = form.watch('discountPercent')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[94vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {exchange ? 'Editar exchange' : 'Nuevo exchange'}
          </DialogTitle>
          <DialogDescription>
            Configura la plataforma P2P y sus comisiones. Puedes definir comisiones escalonadas
            por monto y descuentos VIP/BNB que se aplican automáticamente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Nombre del exchange *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Binance P2P, OKX, Mercado Libre..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shortName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre corto (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: BIN, OKX, ML"
                        maxLength={6}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Etiqueta corta para badges.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 h-[60px]">
                    <div className="space-y-0.5">
                      <FormLabel>Activo</FormLabel>
                      <FormDescription>
                        Inactivo oculta el exchange en selects.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* =========== COMISIONES DE COMPRA =========== */}
            <div className="rounded-lg border p-3 space-y-3 bg-emerald-50/30 dark:bg-emerald-950/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <h4 className="text-sm font-medium">Comisión al comprar</h4>
                </div>
                {buyTiers.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                    {buyTiers.length} {buyTiers.length === 1 ? 'tier' : 'tiers'} activos
                  </span>
                )}
              </div>

              {/* Comisión base (se usa si no hay tiers) */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="buyFeeType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Tipo base</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="percent">Porcentual (%)</SelectItem>
                          <SelectItem value="fixed">Fijo (monto)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="buyFeeValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        {buyFeeType === 'percent' ? 'Valor (%) base' : 'Monto base'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.0001"
                          placeholder="0"
                          disabled={buyTiers.length > 0}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Tiers escalonados de compra */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-xs flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    Tiers escalonados (opcional)
                  </FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      buyTiersField.append({
                        minAmount: buyTiers.length > 0 ? Math.max(...buyTiers.map((t) => Number(t.minAmount))) + 1000 : 0,
                        feeType: 'percent',
                        feeValue: 0.1,
                      })
                    }
                  >
                    <Plus className="h-3 w-3 mr-1" /> Añadir tier
                  </Button>
                </div>
                {buyTiers.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    Sin tiers. Se usará la comisión base para cualquier monto.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {buyTiersField.fields.map((t, i) => (
                      <div
                        key={t.id}
                        className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center p-2 rounded border bg-background"
                      >
                        <div>
                          <label className="text-[10px] text-muted-foreground">Monto mín.</label>
                          <Input
                            type="number"
                            step="0.01"
                            className="h-8 text-xs"
                            {...form.register(`buyTiers.${i}.minAmount` as const)}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground">Tipo</label>
                          <Select
                            onValueChange={(v) =>
                              form.setValue(`buyTiers.${i}.feeType` as const, v as 'percent' | 'fixed')
                            }
                            value={form.watch(`buyTiers.${i}.feeType` as const)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percent">%</SelectItem>
                              <SelectItem value="fixed">Fijo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground">Valor</label>
                          <Input
                            type="number"
                            step="0.0001"
                            className="h-8 text-xs"
                            {...form.register(`buyTiers.${i}.feeValue` as const)}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-rose-600"
                          onClick={() => buyTiersField.remove(i)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    <p className="text-[10px] text-muted-foreground">
                      Se aplicará el tier con el mayor monto mínimo que sea ≤ al total de la operación.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* =========== COMISIONES DE VENTA =========== */}
            <div className="rounded-lg border p-3 space-y-3 bg-rose-50/30 dark:bg-rose-950/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-rose-500" />
                  <h4 className="text-sm font-medium">Comisión al vender</h4>
                </div>
                {sellTiers.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300">
                    {sellTiers.length} {sellTiers.length === 1 ? 'tier' : 'tiers'} activos
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="sellFeeType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Tipo base</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="percent">Porcentual (%)</SelectItem>
                          <SelectItem value="fixed">Fijo (monto)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sellFeeValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        {sellFeeType === 'percent' ? 'Valor (%) base' : 'Monto base'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.0001"
                          placeholder="0"
                          disabled={sellTiers.length > 0}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-xs flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    Tiers escalonados (opcional)
                  </FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      sellTiersField.append({
                        minAmount: sellTiers.length > 0 ? Math.max(...sellTiers.map((t) => Number(t.minAmount))) + 1000 : 0,
                        feeType: 'percent',
                        feeValue: 0.1,
                      })
                    }
                  >
                    <Plus className="h-3 w-3 mr-1" /> Añadir tier
                  </Button>
                </div>
                {sellTiers.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    Sin tiers. Se usará la comisión base para cualquier monto.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {sellTiersField.fields.map((t, i) => (
                      <div
                        key={t.id}
                        className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center p-2 rounded border bg-background"
                      >
                        <div>
                          <label className="text-[10px] text-muted-foreground">Monto mín.</label>
                          <Input
                            type="number"
                            step="0.01"
                            className="h-8 text-xs"
                            {...form.register(`sellTiers.${i}.minAmount` as const)}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground">Tipo</label>
                          <Select
                            onValueChange={(v) =>
                              form.setValue(`sellTiers.${i}.feeType` as const, v as 'percent' | 'fixed')
                            }
                            value={form.watch(`sellTiers.${i}.feeType` as const)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percent">%</SelectItem>
                              <SelectItem value="fixed">Fijo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground">Valor</label>
                          <Input
                            type="number"
                            step="0.0001"
                            className="h-8 text-xs"
                            {...form.register(`sellTiers.${i}.feeValue` as const)}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-rose-600"
                          onClick={() => sellTiersField.remove(i)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    <p className="text-[10px] text-muted-foreground">
                      Se aplicará el tier con el mayor monto mínimo que sea ≤ al total de la operación.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* =========== DESCUENTO VIP / BNB =========== */}
            <div className="rounded-lg border p-3 space-y-3 bg-violet-50/30 dark:bg-violet-950/10">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-violet-500" />
                <h4 className="text-sm font-medium flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5" />
                  Descuento VIP / BNB (opcional)
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="discountPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Descuento (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-[10px]">
                        Se aplica sobre la comisión variable (no sobre la fija).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="discountLabel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Etiqueta (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: Descuento BNB, VIP Nivel 3..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {discountPercent > 0 && (
                <p className="text-xs text-violet-700 dark:text-violet-300">
                  ✓ {discountPercent}% de descuento se aplicará sobre la comisión calculada en cada operación.
                </p>
              )}
            </div>

            {/* =========== COMISIÓN FIJA ADICIONAL =========== */}
            <div className="rounded-lg border p-3 space-y-3 bg-amber-50/30 dark:bg-amber-950/10">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <h4 className="text-sm font-medium flex items-center gap-1">
                  <Percent className="h-3.5 w-3.5" />
                  Comisión fija adicional (opcional)
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="fixedFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Monto</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.0001"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fixedFeeCurrency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Moneda</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9">
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
              </div>
              <p className="text-xs text-muted-foreground">
                Comisión adicional fija que se suma (ej. comisión de red USDT, fee bancario). Se aplica
                tanto a compras como a ventas. No recibe descuento VIP/BNB.
              </p>
            </div>

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color identificador</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        title={c.name}
                        onClick={() => field.onChange(c.value)}
                        className={`w-8 h-8 rounded-full border-2 transition ${
                          field.value === c.value
                            ? 'border-foreground scale-110'
                            : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c.value }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalles del esquema de comisiones, descuentos por VIP, etc."
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
                {exchange ? 'Guardar cambios' : 'Crear exchange'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
