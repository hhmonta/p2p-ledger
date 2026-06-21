'use client'

import { useState, useMemo } from 'react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  ShoppingCart,
  Tag,
  AlertCircle,
  Filter,
  Inbox,
} from 'lucide-react'
import type {
  Bank,
  Transaction,
  TransactionType,
  TransactionStatus,
} from '@/lib/types'
import { TransactionForm } from './TransactionForm'
import { formatCurrency, formatNumber, formatDate } from '@/lib/format'
import { toast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import * as storage from '@/lib/storage'

const STATUS_LABELS: Record<TransactionStatus, string> = {
  completada: 'Completada',
  pendiente: 'Pendiente',
  cancelada: 'Cancelada',
}

const STATUS_COLORS: Record<TransactionStatus, string> = {
  completada: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  pendiente: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  cancelada: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
}

interface TransactionsViewProps {
  mode: 'compra' | 'venta' | 'all'
}

export function TransactionsView({ mode }: TransactionsViewProps) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [bankFilter, setBankFilter] = useState<string>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [deleting, setDeleting] = useState<Transaction | null>(null)

  // Cargar bancos para el filtro y el form
  const { data: banks = [] } = useQuery<Bank[]>({
    queryKey: ['banks'],
    queryFn: () => storage.listBanks(),
  })

  // Construir filtros
  const filters = useMemo(
    () => ({
      type: mode !== 'all' ? (mode as TransactionType) : undefined,
      status: statusFilter !== 'all' ? (statusFilter as TransactionStatus) : undefined,
      bankId: bankFilter !== 'all' ? bankFilter : undefined,
    }),
    [mode, statusFilter, bankFilter]
  )

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ['transactions', filters],
    queryFn: () => storage.listTransactions(filters),
  })

  // Filtro por texto (contraparte, referencia, asset) en cliente
  const filtered = transactions.filter((t) => {
    const q = search.toLowerCase().trim()
    if (!q) return true
    return (
      t.counterparty.toLowerCase().includes(q) ||
      t.asset.toLowerCase().includes(q) ||
      (t.reference ?? '').toLowerCase().includes(q) ||
      (t.notes ?? '').toLowerCase().includes(q)
    )
  })

  // KPIs del conjunto filtrado (sin importar status filter opcional)
  const completadas = filtered.filter((t) => t.status === 'completada')
  const totalMonto = completadas.reduce((s, t) => s + t.amount, 0)
  const totalFiat = completadas.reduce((s, t) => s + t.total, 0)
  const totalFees = completadas.reduce((s, t) => s + t.fee, 0)
  const tasaPromedio = totalMonto > 0 ? totalFiat / totalMonto : 0

  async function refetch() {
    await queryClient.invalidateQueries({ queryKey: ['transactions'] })
    await queryClient.invalidateQueries({ queryKey: ['banks'] })
    await queryClient.invalidateQueries({ queryKey: ['stats'] })
  }

  function openNew() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(t: Transaction) {
    setEditing(t)
    setFormOpen(true)
  }

  async function confirmDelete() {
    if (!deleting) return
    try {
      await storage.deleteTransaction(deleting.id)
      toast({
        title: 'Transacción eliminada',
        description: `Operación con ${deleting.counterparty} fue eliminada.`,
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

  const title =
    mode === 'compra'
      ? 'Compras P2P'
      : mode === 'venta'
        ? 'Ventas P2P'
        : 'Todas las transacciones'

  const description =
    mode === 'compra'
      ? 'Operaciones donde recibiste un activo a cambio de moneda fiat.'
      : mode === 'venta'
        ? 'Operaciones donde entregaste un activo a cambio de moneda fiat.'
        : 'Historial completo de compras y ventas P2P.'

  const defaultType: TransactionType =
    mode === 'venta' ? 'venta' : 'compra'

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Operaciones</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {filtered.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Volumen activo</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatNumber(totalMonto, 2)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Volumen fiat</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatCurrency(totalFiat)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tasa promedio</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatNumber(tasaPromedio, 2)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Header con acciones */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            {mode === 'compra' && <ShoppingCart className="h-5 w-5 text-emerald-500" />}
            {mode === 'venta' && <Tag className="h-5 w-5 text-rose-500" />}
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-1 h-4 w-4" />
          {mode === 'venta' ? 'Nueva venta' : 'Nueva compra'}
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contraparte, activo, referencia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <Filter className="mr-1 h-3.5 w-3.5" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="completada">Completadas</SelectItem>
            <SelectItem value="pendiente">Pendientes</SelectItem>
            <SelectItem value="cancelada">Canceladas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={bankFilter} onValueChange={setBankFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Banco" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los bancos</SelectItem>
            {banks.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {totalFees > 0 && (
        <p className="text-xs text-muted-foreground">
          Comisiones acumuladas (completadas): {formatCurrency(totalFees)}
        </p>
      )}

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 rounded bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="font-medium">No hay transacciones</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {search || statusFilter !== 'all' || bankFilter !== 'all'
                  ? 'No se encontraron resultados con los filtros actuales.'
                  : `Registra tu primera ${mode === 'venta' ? 'venta' : mode === 'compra' ? 'compra' : 'operación'} para empezar a llevar el control.`}
              </p>
              {!search && statusFilter === 'all' && bankFilter === 'all' && (
                <Button onClick={openNew} className="mt-4">
                  <Plus className="mr-1 h-4 w-4" />
                  {mode === 'venta' ? 'Registrar venta' : 'Registrar compra'}
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Tipo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Contraparte</TableHead>
                    <TableHead className="text-right">Activo</TableHead>
                    <TableHead className="text-right">Tasa</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Bancos</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => (
                    <TableRow key={t.id} className="hover:bg-muted/40">
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            t.type === 'compra'
                              ? 'border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300'
                              : 'border-rose-300 text-rose-700 dark:border-rose-700 dark:text-rose-300'
                          }
                        >
                          {t.type === 'compra' ? 'Compra' : 'Venta'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatDate(t.date, true)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium truncate max-w-[180px]">
                          {t.counterparty}
                        </div>
                        {t.reference && (
                          <div className="text-xs text-muted-foreground font-mono">
                            Ref: {t.reference}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums whitespace-nowrap">
                        <div className="font-medium">
                          {formatNumber(t.amount, 2)}{' '}
                          <span className="text-xs text-muted-foreground">
                            {t.asset}
                          </span>
                        </div>
                        {t.fee > 0 && (
                          <div className="text-xs text-amber-600">
                            +{formatCurrency(t.fee, t.currency)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {formatNumber(t.rate, 2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium whitespace-nowrap">
                        {formatCurrency(t.total, t.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs">
                          {t.fromBank ? (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: `${t.fromBank.color}22`,
                              }}
                              title={`Origen: ${t.fromBank.name}`}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{
                                  backgroundColor: t.fromBank.color,
                                }}
                              />
                              {t.fromBank.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                          {t.toBank && (
                            <>
                              <span className="text-muted-foreground">→</span>
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded"
                                style={{
                                  backgroundColor: `${t.toBank.color}22`,
                                }}
                                title={`Destino: ${t.toBank.name}`}
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{
                                    backgroundColor: t.toBank.color,
                                  }}
                                />
                                {t.toBank.name}
                              </span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs ${STATUS_COLORS[t.status]}`}
                        >
                          {STATUS_LABELS[t.status]}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-0.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => openEdit(t)}
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 hover:text-rose-600"
                            onClick={() => setDeleting(t)}
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        transaction={editing}
        defaultType={defaultType}
        banks={banks}
        onSaved={refetch}
      />

      <AlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-500" />
              Eliminar transacción
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar la {deleting?.type === 'compra' ? 'compra' : 'venta'} de{' '}
              {formatNumber(deleting?.amount ?? 0)} {deleting?.asset} con{' '}
              {deleting?.counterparty}? Esta acción no se puede deshacer.
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
