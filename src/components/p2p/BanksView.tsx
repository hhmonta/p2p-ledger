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
import { Input } from '@/components/ui/input'
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
  Search,
  Landmark,
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from 'lucide-react'
import type { Bank } from '@/lib/types'
import { BankForm } from './BankForm'
import { formatCurrency, formatNumber } from '@/lib/format'
import { toast } from '@/hooks/use-toast'
import * as storage from '@/lib/storage'

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  corriente: 'Corriente',
  ahorro: 'Ahorro',
  digital: 'Digital',
  pago_movil: 'Pago Móvil',
}

export function BanksView() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Bank | null>(null)
  const [deleting, setDeleting] = useState<Bank | null>(null)

  const { data: banks = [], isLoading } = useQuery<Bank[]>({
    queryKey: ['banks'],
    queryFn: () => storage.listBanks(),
  })

  const filtered = banks.filter((b) => {
    const q = search.toLowerCase().trim()
    if (!q) return true
    return (
      b.name.toLowerCase().includes(q) ||
      (b.accountNumber ?? '').toLowerCase().includes(q) ||
      (b.holderName ?? '').toLowerCase().includes(q)
    )
  })

  const totalBalance = banks.reduce((sum, b) => sum + (b.balance ?? 0), 0)
  const totalEntradas = banks.reduce((s, b) => s + (b.totalEntradas ?? 0), 0)
  const totalSalidas = banks.reduce((s, b) => s + (b.totalSalidas ?? 0), 0)

  async function refetch() {
    await queryClient.invalidateQueries({ queryKey: ['banks'] })
    await queryClient.invalidateQueries({ queryKey: ['transactions'] })
    await queryClient.invalidateQueries({ queryKey: ['stats'] })
  }

  function openNew() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(b: Bank) {
    setEditing(b)
    setFormOpen(true)
  }

  async function confirmDelete() {
    if (!deleting) return
    try {
      await storage.deleteBank(deleting.id)
      toast({
        title: 'Banco eliminado',
        description: `«${deleting.name}» fue eliminado. Las transacciones asociadas se conservan sin banco.`,
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
    <div className="space-y-2.5 sm:space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-3">
        <Card className="p-0">
          <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
            <CardDescription className="text-[9px] sm:text-xs">Total bancos</CardDescription>
            <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-2xl">
              <Landmark className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-emerald-500" />
              {banks.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="p-0">
          <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
            <CardDescription className="text-[9px] sm:text-xs">Balance total</CardDescription>
            <CardTitle className="text-sm sm:text-2xl tabular-nums leading-tight">
              {formatCurrency(totalBalance)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="p-0">
          <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
            <CardDescription className="flex items-center gap-1 text-[9px] sm:text-xs">
              <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-500" /> Entradas
            </CardDescription>
            <CardTitle className="text-sm sm:text-2xl tabular-nums text-emerald-600 dark:text-emerald-400 leading-tight">
              {formatCurrency(totalEntradas)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="p-0">
          <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
            <CardDescription className="flex items-center gap-1 text-[9px] sm:text-xs">
              <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-rose-500" /> Salidas
            </CardDescription>
            <CardTitle className="text-sm sm:text-2xl tabular-nums text-rose-600 dark:text-rose-400 leading-tight">
              {formatCurrency(totalSalidas)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Header con acciones */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base sm:text-xl font-semibold">Cuentas bancarias</h2>
          <p className="text-[11px] sm:text-sm text-muted-foreground">
            Registra los bancos que usas para enviar y recibir dinero en tus operaciones P2P.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-full sm:w-64"
            />
          </div>
          <Button onClick={openNew} size="sm" className="flex-shrink-0">
            <Plus className="mr-1 h-4 w-4" /> <span className="hidden sm:inline">Nuevo banco</span><span className="sm:hidden">Nuevo</span>
          </Button>
        </div>
      </div>

      {/* Grid de bancos */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="h-40 sm:h-48 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 sm:py-12 text-center">
            <Wallet className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50 mb-3" />
            <p className="font-medium text-sm">No hay bancos registrados</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-sm">
              Crea tu primer banco para empezar a registrar operaciones P2P. Cada banco
              puede tener su propia moneda y tipo de cuenta.
            </p>
            <Button onClick={openNew} size="sm" className="mt-3">
              <Plus className="mr-1 h-4 w-4" /> Crear banco
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
          {filtered.map((b) => (
            <Card
              key={b.id}
              className="overflow-hidden transition hover:shadow-md"
            >
              <div
                className="h-1"
                style={{ backgroundColor: b.color }}
              />
              <CardHeader className="p-2.5 sm:p-6 pb-2 sm:pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                      <span
                        className="inline-block w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: b.color }}
                      />
                      <span className="truncate">{b.name}</span>
                    </CardTitle>
                    <CardDescription className="mt-0.5 text-[10px] sm:text-sm">
                      {ACCOUNT_TYPE_LABELS[b.accountType] ?? b.accountType} ·{' '}
                      {b.currency}
                      {!b.isActive && (
                        <span className="ml-2 text-amber-500">· Inactivo</span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-0.5 flex-shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 sm:h-8 sm:w-8"
                      onClick={() => openEdit(b)}
                      title="Editar"
                    >
                      <Pencil className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 sm:h-8 sm:w-8 hover:text-rose-600"
                      onClick={() => setDeleting(b)}
                      title="Eliminar"
                    >
                      <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-2.5 sm:p-6 pt-0 space-y-2 sm:space-y-3">
                {b.accountNumber && (
                  <div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Cuenta</p>
                    <p className="text-xs sm:text-sm font-mono break-all">
                      {b.accountNumber}
                    </p>
                  </div>
                )}
                {b.holderName && (
                  <div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Titular</p>
                    <p className="text-xs sm:text-sm">{b.holderName}</p>
                  </div>
                )}
                <div className="pt-1.5 sm:pt-2 border-t space-y-0.5 sm:space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] sm:text-xs text-muted-foreground">
                      Balance actual
                    </span>
                    <span
                      className={`text-sm sm:text-lg font-bold tabular-nums ${
                        (b.balance ?? 0) < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : ''
                      }`}
                    >
                      {formatCurrency(b.balance ?? 0, b.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] sm:text-xs">
                    <span className="text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(b.totalEntradas ?? 0, b.currency)}
                    </span>
                    <span className="text-rose-600 dark:text-rose-400">
                      -{formatCurrency(b.totalSalidas ?? 0, b.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground">
                    <span>Inicial: {formatCurrency(b.initialBalance, b.currency)}</span>
                    <span>
                      {formatNumber((b._count?.transactionsFrom ?? 0) + (b._count?.transactionsTo ?? 0))} ops
                    </span>
                  </div>
                </div>
                {b.notes && (
                  <p className="text-[10px] sm:text-xs text-muted-foreground italic border-t pt-1.5 sm:pt-2 line-clamp-2">
                    {b.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <BankForm
        open={formOpen}
        onOpenChange={setFormOpen}
        bank={editing}
        onSaved={refetch}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-500" />
              Eliminar banco
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas eliminar «{deleting?.name}»? Las transacciones
              asociadas se conservarán pero quedarán sin banco vinculado. Esta
              acción no se puede deshacer.
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
