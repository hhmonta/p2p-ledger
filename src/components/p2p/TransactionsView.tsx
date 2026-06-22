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
  Building2,
} from 'lucide-react'
import type {
  Bank,
  Exchange,
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
  const [exchangeFilter, setExchangeFilter] = useState<string>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [deleting, setDeleting] = useState<Transaction | null>(null)

  // Cargar bancos y exchanges
  const { data: banks = [] } = useQuery<Bank[]>({
    queryKey: ['banks'],
    queryFn: () => storage.listBanks(),
  })

  const { data: exchanges = [] } = useQuery<Exchange[]>({
    queryKey: ['exchanges'],
    queryFn: () => storage.listExchanges(),
  })

  const filters = useMemo(
    () => ({
      type: mode !== 'all' ? (mode as TransactionType) : undefined,
      status: statusFilter !== 'all' ? (statusFilter as TransactionStatus) : undefined,
      bankId: bankFilter !== 'all' ? bankFilter : undefined,
      exchangeId: exchangeFilter !== 'all' ? exchangeFilter : undefined,
    }),
    [mode, statusFilter, bankFilter, exchangeFilter]
  )

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ['transactions', filters],
    queryFn: () => storage.listTransactions(filters),
  })

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

  // KPIs
  const completadas = filtered.filter((t) => t.status === 'completada')
  const totalMonto = completadas.reduce((s, t) => s + t.amount, 0)
  const totalFiat = completadas.reduce((s, t) => s + t.total, 0)
  const totalFees = completadas.reduce((s, t) => s + t.fee, 0)
  const totalNeto = completadas.reduce((s, t) => s + (t.netTotal ?? t.total - t.fee), 0)
  const tasaPromedio = totalMonto > 0 ? totalFiat / totalMonto : 0

  async function refetch() {
    await queryClient.invalidateQueries({ queryKey: ['transactions'] })
    await queryClient.invalidateQueries({ queryKey: ['banks'] })
    await queryClient.invalidateQueries({ queryKey: ['exchanges'] })
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
    <div className="space-y-2.5 sm:space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-3">
        <Card className="p-0">
          <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
            <CardDescription className="text-[9px] sm:text-xs">Operaciones</CardDescription>
            <CardTitle className="text-sm sm:text-2xl tabular-nums leading-tight">
              {filtered.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="p-0">
          <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
            <CardDescription className="text-[9px] sm:text-xs">Volumen bruto</CardDescription>
            <CardTitle className="text-sm sm:text-2xl tabular-nums leading-tight">
              {formatCurrency(totalFiat)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="p-0">
          <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
            <CardDescription className="flex items-center gap-1 text-[9px] sm:text-xs">
              <Building2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-500" /> Comisiones
            </CardDescription>
            <CardTitle className="text-sm sm:text-2xl tabular-nums text-amber-600 dark:text-amber-400 leading-tight">
              {formatCurrency(totalFees)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="p-0">
          <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
            <CardDescription className="text-[9px] sm:text-xs">Volumen neto</CardDescription>
            <CardTitle className="text-sm sm:text-2xl tabular-nums text-emerald-600 dark:text-emerald-400 leading-tight">
              {formatCurrency(totalNeto)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Header con acciones */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base sm:text-xl font-semibold flex items-center gap-2">
            {mode === 'compra' && <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />}
            {mode === 'venta' && <Tag className="h-4 w-4 sm:h-5 sm:w-5 text-rose-500" />}
            {title}
          </h2>
          <p className="text-[11px] sm:text-sm text-muted-foreground">{description}</p>
        </div>
        <Button onClick={openNew} size="sm" className="self-start">
          <Plus className="mr-1 h-4 w-4" />
          {mode === 'venta' ? 'Nueva venta' : 'Nueva compra'}
        </Button>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-2 sm:flex sm:flex-row gap-1.5 sm:gap-2">
        <div className="relative col-span-2 sm:flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contraparte, activo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36 h-9 text-sm">
            <Filter className="mr-1 h-3.5 w-3.5" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="completada">Completadas</SelectItem>
            <SelectItem value="pendiente">Pendientes</SelectItem>
            <SelectItem value="cancelada">Canceladas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={bankFilter} onValueChange={setBankFilter}>
          <SelectTrigger className="w-full sm:w-36 h-9 text-sm">
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
        <Select value={exchangeFilter} onValueChange={setExchangeFilter}>
          <SelectTrigger className="w-full sm:w-36 h-9 text-sm col-span-2 sm:col-span-1">
            <SelectValue placeholder="Exchange" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="__none__">Sin exchange</SelectItem>
            {exchanges.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabla en desktop / cards en móvil */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 sm:p-8 space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 rounded bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
              <Inbox className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50 mb-3" />
              <p className="font-medium text-sm">No hay transacciones</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-sm px-4">
                {search || statusFilter !== 'all' || bankFilter !== 'all' || exchangeFilter !== 'all'
                  ? 'No se encontraron resultados con los filtros actuales.'
                  : `Registra tu primera ${mode === 'venta' ? 'venta' : mode === 'compra' ? 'compra' : 'operación'} para empezar a llevar el control.`}
              </p>
              {!search && statusFilter === 'all' && bankFilter === 'all' && exchangeFilter === 'all' && (
                <Button onClick={openNew} size="sm" className="mt-4">
                  <Plus className="mr-1 h-4 w-4" />
                  {mode === 'venta' ? 'Registrar venta' : 'Registrar compra'}
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* MOBILE: cards verticales */}
              <div className="sm:hidden divide-y">
                {filtered.map((t) => (
                  <div key={t.id} className="p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Badge
                          variant="outline"
                          className={
                            t.type === 'compra'
                              ? 'border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300 text-[9px] px-1.5 py-0'
                              : 'border-rose-300 text-rose-700 dark:border-rose-700 dark:text-rose-300 text-[9px] px-1.5 py-0'
                          }
                        >
                          {t.type === 'compra' ? 'Compra' : 'Venta'}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatDate(t.date, true)}
                        </span>
                      </div>
                      <div className="flex gap-0.5 flex-shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => openEdit(t)}
                          title="Editar"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 hover:text-rose-600"
                          onClick={() => setDeleting(t)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">{t.counterparty}</span>
                      {t.exchange && (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] flex-shrink-0"
                          style={{ backgroundColor: `${t.exchange.color}22` }}
                          title={t.exchange.name}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: t.exchange.color }}
                          />
                          {t.exchange.shortName ?? t.exchange.name}
                        </span>
                      )}
                    </div>
                    {t.reference && (
                      <p className="text-[10px] text-muted-foreground font-mono truncate">
                        Ref: {t.reference}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="tabular-nums">
                        {formatNumber(t.amount, 2)} <span className="text-muted-foreground">{t.asset}</span>
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        @{formatNumber(t.rate, 2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Bruto</span>
                      <span className="font-medium tabular-nums">
                        {formatCurrency(t.total, t.currency)}
                      </span>
                    </div>
                    {t.fee > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Comisión</span>
                        <span className="text-amber-600 dark:text-amber-400 tabular-nums">
                          −{formatCurrency(t.fee, t.currency)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Neto</span>
                      <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(t.netTotal ?? t.total - t.fee, t.currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <div className="flex items-center gap-1 text-[10px] min-w-0">
                        {t.fromBank && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded truncate"
                            style={{ backgroundColor: `${t.fromBank.color}22` }}
                            title={`Origen: ${t.fromBank.name}`}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: t.fromBank.color }}
                            />
                            <span className="truncate">{t.fromBank.name}</span>
                          </span>
                        )}
                        {t.toBank && (
                          <>
                            <span className="text-muted-foreground flex-shrink-0">→</span>
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded truncate"
                              style={{ backgroundColor: `${t.toBank.color}22` }}
                              title={`Destino: ${t.toBank.name}`}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: t.toBank.color }}
                              />
                              <span className="truncate">{t.toBank.name}</span>
                            </span>
                          </>
                        )}
                        {!t.fromBank && !t.toBank && (
                          <span className="text-muted-foreground">Sin bancos</span>
                        )}
                      </div>
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[9px] flex-shrink-0 ${STATUS_COLORS[t.status]}`}
                      >
                        {STATUS_LABELS[t.status]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP: tabla */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Tipo</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Contraparte</TableHead>
                      <TableHead>Exchange</TableHead>
                      <TableHead className="text-right">Activo</TableHead>
                      <TableHead className="text-right">Tasa</TableHead>
                      <TableHead className="text-right">Bruto</TableHead>
                      <TableHead className="text-right">Comisión</TableHead>
                      <TableHead className="text-right">Neto</TableHead>
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
                        <TableCell>
                          {t.exchange ? (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs"
                              style={{ backgroundColor: `${t.exchange.color}22` }}
                              title={t.exchange.name}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: t.exchange.color }}
                              />
                              {t.exchange.shortName ?? t.exchange.name}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap">
                          <div className="font-medium">
                            {formatNumber(t.amount, 2)}{' '}
                            <span className="text-xs text-muted-foreground">
                              {t.asset}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {formatNumber(t.rate, 2)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium whitespace-nowrap">
                          {formatCurrency(t.total, t.currency)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-xs whitespace-nowrap">
                          {t.fee > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400">
                              −{formatCurrency(t.fee, t.currency)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium whitespace-nowrap text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(t.netTotal ?? t.total - t.fee, t.currency)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs">
                            {t.fromBank ? (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: `${t.fromBank.color}22` }}
                                title={`Origen: ${t.fromBank.name}`}
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: t.fromBank.color }}
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
                                  style={{ backgroundColor: `${t.toBank.color}22` }}
                                  title={`Destino: ${t.toBank.name}`}
                                >
                                  <span
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: t.toBank.color }}
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
            </>
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
