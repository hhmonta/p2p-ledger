'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Plus,
  Pencil,
  Trash2,
  Building2,
  Percent,
  Coins,
  AlertCircle,
} from 'lucide-react'
import type { Exchange } from '@/lib/types'
import { ExchangeForm } from './ExchangeForm'
import { formatNumber } from '@/lib/format'
import { toast } from '@/hooks/use-toast'
import * as storage from '@/lib/storage'

export function ExchangesView() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Exchange | null>(null)
  const [deleting, setDeleting] = useState<Exchange | null>(null)

  const { data: exchanges = [], isLoading } = useQuery<Exchange[]>({
    queryKey: ['exchanges'],
    queryFn: () => storage.listExchanges(),
  })

  async function refetch() {
    await queryClient.invalidateQueries({ queryKey: ['exchanges'] })
    await queryClient.invalidateQueries({ queryKey: ['transactions'] })
    await queryClient.invalidateQueries({ queryKey: ['stats'] })
  }

  function openNew() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(e: Exchange) {
    setEditing(e)
    setFormOpen(true)
  }

  async function confirmDelete() {
    if (!deleting) return
    try {
      await storage.deleteExchange(deleting.id)
      toast({
        title: 'Exchange eliminado',
        description: `«${deleting.name}» fue eliminado. Las transacciones asociadas se conservan sin exchange.`,
      })
      await refetch()
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Error desconocido',
        variant: 'destructive',
      })
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header con acciones */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-500" />
            Exchanges y comisiones
          </h2>
          <p className="text-sm text-muted-foreground">
            Configura cada plataforma P2P con su esquema de comisiones. Se aplicarán automáticamente
            al registrar operaciones, pero siempre podrás ajustarlas manualmente.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-1 h-4 w-4" /> Nuevo exchange
        </Button>
      </div>

      {/* Grid de exchanges */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="h-48 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : exchanges.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="font-medium">No hay exchanges registrados</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Crea tu primer exchange para empezar a registrar comisiones automáticamente en tus
              operaciones.
            </p>
            <Button onClick={openNew} className="mt-4">
              <Plus className="mr-1 h-4 w-4" /> Crear exchange
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exchanges.map((e) => {
            const txCount = e._count?.transactions ?? 0
            return (
              <Card key={e.id} className="overflow-hidden transition hover:shadow-md">
                <div className="h-1.5" style={{ backgroundColor: e.color }} />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: e.color }}
                        />
                        <span className="truncate">{e.name}</span>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {e.shortName && <span className="font-mono">{e.shortName} · </span>}
                        {txCount} {txCount === 1 ? 'operación' : 'operaciones'}
                        {!e.isActive && (
                          <span className="ml-2 text-amber-500">· Inactivo</span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => openEdit(e)}
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 hover:text-rose-600"
                        onClick={() => setDeleting(e)}
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Comisiones */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <Percent className="h-3 w-3" /> Compra
                      </span>
                      <span className="tabular-nums font-medium">
                        {e.buyFeeType === 'percent'
                          ? `${formatNumber(e.buyFeeValue, 4)}%`
                          : `${formatNumber(e.buyFeeValue, 4)} (fijo)`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                        <Percent className="h-3 w-3" /> Venta
                      </span>
                      <span className="tabular-nums font-medium">
                        {e.sellFeeType === 'percent'
                          ? `${formatNumber(e.sellFeeValue, 4)}%`
                          : `${formatNumber(e.sellFeeValue, 4)} (fijo)`}
                      </span>
                    </div>
                    {e.fixedFee > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                          <Coins className="h-3 w-3" /> Fija adicional
                        </span>
                        <span className="tabular-nums font-medium">
                          {formatNumber(e.fixedFee, 4)} {e.fixedFeeCurrency}
                        </span>
                      </div>
                    )}
                  </div>
                  {e.notes && (
                    <p className="text-xs text-muted-foreground italic border-t pt-2 line-clamp-3">
                      {e.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <ExchangeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        exchange={editing}
        onSaved={refetch}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-500" />
              Eliminar exchange
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas eliminar «{deleting?.name}»? Las transacciones asociadas se
              conservarán pero quedarán sin exchange vinculado. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
