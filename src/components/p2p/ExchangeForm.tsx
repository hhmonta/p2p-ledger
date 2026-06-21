'use client'

import { useEffect, useState } from 'react'
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
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'
import type { Exchange, ExchangeInput, FeeType } from '@/lib/types'
import { toast } from '@/hooks/use-toast'
import * as storage from '@/lib/storage'

const exchangeSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  shortName: z.string().optional(),
  color: z.string().min(1),
  buyFeeType: z.enum(['percent', 'fixed']),
  buyFeeValue: z.coerce.number().min(0),
  sellFeeType: z.enum(['percent', 'fixed']),
  sellFeeValue: z.coerce.number().min(0),
  fixedFee: z.coerce.number().min(0).default(0),
  fixedFeeCurrency: z.string().min(1),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof exchangeSchema>

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
      sellFeeType: 'percent',
      sellFeeValue: 0,
      fixedFee: 0,
      fixedFeeCurrency: 'USDT',
      isActive: true,
      notes: '',
    },
  })

  useEffect(() => {
    if (open) {
      if (exchange) {
        form.reset({
          name: exchange.name,
          shortName: exchange.shortName ?? '',
          color: exchange.color,
          buyFeeType: exchange.buyFeeType as FeeType,
          buyFeeValue: exchange.buyFeeValue,
          sellFeeType: exchange.sellFeeType as FeeType,
          sellFeeValue: exchange.sellFeeValue,
          fixedFee: exchange.fixedFee,
          fixedFeeCurrency: exchange.fixedFeeCurrency,
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
          sellFeeType: 'percent',
          sellFeeValue: 0,
          fixedFee: 0,
          fixedFeeCurrency: 'USDT',
          isActive: true,
          notes: '',
        })
      }
    }
  }, [open, exchange, form])

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      const payload: ExchangeInput = {
        name: values.name,
        shortName: values.shortName || null,
        color: values.color,
        buyFeeType: values.buyFeeType,
        buyFeeValue: Number(values.buyFeeValue),
        sellFeeType: values.sellFeeType,
        sellFeeValue: Number(values.sellFeeValue),
        fixedFee: Number(values.fixedFee),
        fixedFeeCurrency: values.fixedFeeCurrency,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {exchange ? 'Editar exchange' : 'Nuevo exchange'}
          </DialogTitle>
          <DialogDescription>
            Configura la plataforma P2P y sus comisiones. Las comisiones se aplicarán automáticamente
            al registrar operaciones, pero puedes ajustarlas manualmente en cada transacción.
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

            {/* Comisiones de COMPRA */}
            <div className="rounded-lg border p-3 space-y-3 bg-emerald-50/30 dark:bg-emerald-950/10">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <h4 className="text-sm font-medium">Comisión al comprar</h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="buyFeeType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Tipo</FormLabel>
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
                        {buyFeeType === 'percent' ? 'Valor (%)' : 'Monto fijo'}
                      </FormLabel>
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
              </div>
              <p className="text-xs text-muted-foreground">
                {buyFeeType === 'percent'
                  ? 'Se aplicará este porcentaje sobre el total fiat de la compra.'
                  : 'Se restará este monto fijo del total fiat en cada compra.'}
              </p>
            </div>

            {/* Comisiones de VENTA */}
            <div className="rounded-lg border p-3 space-y-3 bg-rose-50/30 dark:bg-rose-950/10">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-rose-500" />
                <h4 className="text-sm font-medium">Comisión al vender</h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="sellFeeType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Tipo</FormLabel>
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
                        {sellFeeType === 'percent' ? 'Valor (%)' : 'Monto fijo'}
                      </FormLabel>
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
              </div>
              <p className="text-xs text-muted-foreground">
                {sellFeeType === 'percent'
                  ? 'Se aplicará este porcentaje sobre el total fiat de la venta.'
                  : 'Se restará este monto fijo del total fiat en cada venta.'}
              </p>
            </div>

            {/* Comisión fija adicional */}
            <div className="rounded-lg border p-3 space-y-3 bg-amber-50/30 dark:bg-amber-950/10">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <h4 className="text-sm font-medium">Comisión fija adicional (opcional)</h4>
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
                tanto a compras como a ventas.
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
