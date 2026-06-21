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
import type { Bank, BankInput } from '@/lib/types'
import { toast } from '@/hooks/use-toast'
import * as storage from '@/lib/storage'

const bankSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  accountType: z.enum(['ahorro', 'corriente', 'digital', 'pago_movil']),
  accountNumber: z.string().optional(),
  holderName: z.string().optional(),
  currency: z.string().min(1, 'La moneda es obligatoria'),
  initialBalance: z.coerce.number().default(0),
  isActive: z.boolean().default(true),
  color: z.string().min(1),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof bankSchema>

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
]

const CURRENCIES = ['VES', 'USD', 'EUR', 'COP', 'ARS', 'PEN', 'MXN', 'BRL']

interface BankFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bank?: Bank | null
  onSaved: () => void
}

export function BankForm({
  open,
  onOpenChange,
  bank,
  onSaved,
}: BankFormProps) {
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(bankSchema),
    defaultValues: {
      name: '',
      accountType: 'corriente',
      accountNumber: '',
      holderName: '',
      currency: 'VES',
      initialBalance: 0,
      isActive: true,
      color: '#10b981',
      notes: '',
    },
  })

  useEffect(() => {
    if (open) {
      if (bank) {
        form.reset({
          name: bank.name,
          accountType: bank.accountType as FormValues['accountType'],
          accountNumber: bank.accountNumber ?? '',
          holderName: bank.holderName ?? '',
          currency: bank.currency,
          initialBalance: bank.initialBalance,
          isActive: bank.isActive,
          color: bank.color,
          notes: bank.notes ?? '',
        })
      } else {
        form.reset({
          name: '',
          accountType: 'corriente',
          accountNumber: '',
          holderName: '',
          currency: 'VES',
          initialBalance: 0,
          isActive: true,
          color: '#10b981',
          notes: '',
        })
      }
    }
  }, [open, bank, form])

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      const payload: BankInput = {
        name: values.name,
        accountType: values.accountType,
        accountNumber: values.accountNumber || null,
        holderName: values.holderName || null,
        currency: values.currency,
        initialBalance: values.initialBalance,
        isActive: values.isActive,
        color: values.color,
        notes: values.notes || null,
      }

      if (bank) {
        await storage.updateBank(bank.id, payload)
      } else {
        await storage.createBank(payload)
      }

      toast({
        title: bank ? 'Banco actualizado' : 'Banco creado',
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {bank ? 'Editar banco' : 'Nuevo banco'}
          </DialogTitle>
          <DialogDescription>
            Registra una cuenta bancaria para usarla como origen o destino de tus operaciones P2P.
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
                    <FormLabel>Nombre del banco *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Banesco, Mercantil, BDV..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de cuenta</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="corriente">Corriente</SelectItem>
                        <SelectItem value="ahorro">Ahorro</SelectItem>
                        <SelectItem value="digital">Digital</SelectItem>
                        <SelectItem value="pago_movil">Pago Móvil</SelectItem>
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
                    <FormLabel>Moneda</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona" />
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
                name="accountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de cuenta</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0123-4567-89-0123456789"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="holderName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titular</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nombre del titular"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="initialBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Balance inicial</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Saldo de arranque de la cuenta.
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
                      <FormLabel>Cuenta activa</FormLabel>
                      <FormDescription>
                        Inactivo oculta el banco en selects.
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
                      placeholder="Información adicional sobre esta cuenta"
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
                {bank ? 'Guardar cambios' : 'Crear banco'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
