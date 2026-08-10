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
  Calendar,
  TrendingUp,
  TrendingDown,
  Image as ImageIcon,
  Download,
  FileText,
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

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]
  return `${monthNames[parseInt(month) - 1]} ${year}`
}

// Exportar transacciones a CSV
function exportCSV(transactions: Transaction[], filename: string) {
  const headers = ['Tipo', 'Fecha', 'Contraparte', 'Activo', 'Cantidad', 'Tasa', 'Total Bruto', 'Moneda', 'Comisión', 'Total Neto', 'Exchange', 'Banco Origen', 'Banco Destino', 'Referencia', 'Estado', 'Notas']
  const rows = transactions.map((t) => [
    t.type === 'compra' ? 'Compra' : 'Venta',
    formatDate(t.date, true),
    t.counterparty,
    t.asset,
    t.amount.toString(),
    t.rate.toString(),
    t.total.toString(),
    t.currency,
    t.fee.toString(),
    (t.netTotal ?? t.total - t.fee).toString(),
    t.exchange?.name ?? '',
    t.fromBank?.name ?? '',
    t.toBank?.name ?? '',
    t.reference ?? '',
    STATUS_LABELS[t.status],
    (t.notes ?? '').replace(/"/g, '""'),
  ])
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast({ title: 'CSV exportado', description: `${transactions.length} transacciones exportadas.` })
}

// Exportar transacciones a PDF (formato simple con texto)
function exportPDF(transactions: Transaction[], filename: string) {
  // Generar un PDF simple usando jsPDF-like approach con canvas
  const lines: string[] = []
  lines.push('P2P Ledger - Reporte de Transacciones')
  lines.push(`Generado: ${formatDate(new Date(), true)}`)
  lines.push(`Total: ${transactions.length} operaciones`)
  lines.push('─'.repeat(80))
  lines.push('')

  for (const t of transactions) {
    const tipo = t.type === 'compra' ? 'COMPRA' : 'VENTA'
    lines.push(`[${tipo}] ${formatDate(t.date, true)} | ${t.counterparty}`)
    lines.push(`  ${formatNumber(t.amount, 2)} ${t.asset} @ ${formatNumber(t.rate, 2)} = ${formatCurrency(t.total, t.currency)}`)
    if (t.fee > 0) {
      lines.push(`  Comisión: ${formatCurrency(t.fee, t.currency)} | Neto: ${formatCurrency(t.netTotal ?? t.total - t.fee, t.currency)}`)
    }
    if (t.exchange) lines.push(`  Exchange: ${t.exchange.name}`)
    if (t.reference) lines.push(`  Ref: ${t.reference}`)
    lines.push(`  Estado: ${STATUS_LABELS[t.status]}`)
    lines.push('')
  }

  const textContent = lines.join('\n')
  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.txt`
  a.click()
  URL.revokeObjectURL(url)
  toast({ title: 'Reporte exportado', description: `${transactions.length} transacciones exportadas como texto.` })
}

// Sub-componente: card mobile para una transacción
function TransactionCardMobile({
  t,
  onEdit,
  onDelete,
}: {
  t: Transaction
  onEdit: (t: Transaction) => void
  onDelete: (t: Transaction) => void
}) {
  return (
    <div className="p-2.5 space-y-1.5">
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
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(t)} title="Editar">
            <Pencil className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-rose-600" onClick={() => onDelete(t)} title="Eliminar">
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
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.exchange.color }} />
            {t.exchange.shortName ?? t.exchange.name}
          </span>
        )}
      </div>
      {t.reference && (
        <p className="text-[10px] text-muted-foreground font-mono truncate">Ref: {t.reference}</p>
      )}
      {t.captureUrl && (
        <div className="mt-1">
          <img
            src={t.captureUrl}
            alt="Comprobante"
            className="h-16 w-auto rounded border object-cover"
          />
        </div>
      )}
      <div className="flex items-center justify-between text-xs">
        <span className="tabular-nums">
          {formatNumber(t.amount, 2)} <span className="text-muted-foreground">{t.asset}</span>
        </span>
        <span className="tabular-nums text-muted-foreground">@{formatNumber(t.rate, 2)}</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Bruto</span>
        <span className="font-medium tabular-nums">{formatCurrency(t.total, t.currency)}</span>
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
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.fromBank.color }} />
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
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.toBank.color }} />
                <span className="truncate">{t.toBank.name}</span>
              </span>
            </>
          )}
          {!t.fromBank && !t.toBank && (
            <span className="text-muted-foreground">Sin bancos</span>
          )}
        </div>
        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] flex-shrink-0 ${STATUS_COLORS[t.status]}`}>
          {STATUS_LABELS[t.status]}
        </span>
      </div>
    </div>
  )
}

// Sub-componente: fila desktop para una transacción
function TransactionRowDesktop({
  t,
  onEdit,
  onDelete,
}: {
  t: Transaction
  onEdit: (t: Transaction) => void
  onDelete: (t: Transaction) => void
}) {
  return (
    <TableRow className="hover:bg-muted/40">
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
      <TableCell className="text-xs whitespace-nowrap">{formatDate(t.date, true)}</TableCell>
      <TableCell>
        <div className="font-medium truncate max-w-[180px]">{t.counterparty}</div>
        {t.reference && (
          <div className="text-xs text-muted-foreground font-mono">Ref: {t.reference}</div>
        )}
      </TableCell>
      <TableCell>
        {t.exchange ? (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs"
            style={{ backgroundColor: `${t.exchange.color}22` }}
            title={t.exchange.name}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.exchange.color }} />
            {t.exchange.shortName ?? t.exchange.name}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums whitespace-nowrap">
        <div className="font-medium">
          {formatNumber(t.amount, 2)}{' '}
          <span className="text-xs text-muted-foreground">{t.asset}</span>
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums text-sm">{formatNumber(t.rate, 2)}</TableCell>
      <TableCell className="text-right tabular-nums font-medium whitespace-nowrap">
        {formatCurrency(t.total, t.currency)}
      </TableCell>
      <TableCell className="text-right tabular-nums text-xs whitespace-nowrap">
        {t.fee > 0 ? (
          <span className="text-amber-600 dark:text-amber-400">−{formatCurrency(t.fee, t.currency)}</span>
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
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.fromBank.color }} />
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
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.toBank.color }} />
                {t.toBank.name}
              </span>
            </>
          )}
          {t.captureUrl && (
            <span className="text-blue-500" title="Tiene comprobante adjunto">
              <ImageIcon className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <span className={`inline-block px-2 py-0.5 rounded text-xs ${STATUS_COLORS[t.status]}`}>
          {STATUS_LABELS[t.status]}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex gap-0.5">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(t)} title="Editar">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-rose-600" onClick={() => onDelete(t)} title="Eliminar">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

// Tabla desktop compartida
function TransactionTable({
  transactions,
  onEdit,
  onDelete,
  footerRow,
}: {
  transactions: Transaction[]
  onEdit: (t: Transaction) => void
  onDelete: (t: Transaction) => void
  footerRow?: React.ReactNode
}) {
  return (
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
          {transactions.map((t) => (
            <TransactionRowDesktop key={t.id} t={t} onEdit={onEdit} onDelete={onDelete} />
          ))}
          {footerRow}
        </TableBody>
      </Table>
    </div>
  )
}

interface TransactionsViewProps {
  mode: 'compra' | 'venta' | 'all'
}

interface MonthGroup {
  month: string
  label: string
  transactions: Transaction[]
  totalCompras: number
  totalVentas: number
  totalFees: number
  totalNeto: number
  tasaPromCompras: number
  tasaPromVentas: number
  countCompras: number
  countVentas: number
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

  // KPIs globales
  const completadas = filtered.filter((t) => t.status === 'completada')
  const totalMonto = completadas.reduce((s, t) => s + t.amount, 0)
  const totalFiat = completadas.reduce((s, t) => s + t.total, 0)
  const totalFees = completadas.reduce((s, t) => s + t.fee, 0)
  const totalNeto = completadas.reduce((s, t) => s + (t.netTotal ?? t.total - t.fee), 0)
  const tasaPromedio = totalMonto > 0 ? totalFiat / totalMonto : 0

  // Agrupar transacciones por mes (solo en modo "all" / Historial)
  const groupedByMonth = useMemo((): MonthGroup[] | null => {
    if (mode !== 'all') return null
    const groups: Record<string, Transaction[]> = {}
    for (const t of filtered) {
      const d = new Date(t.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!groups[key]) groups[key] = []
      groups[key].push(t)
    }
    const sorted = Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
    return sorted.map(([month, txs]) => {
      const completadasMes = txs.filter((t) => t.status === 'completada')
      const compras = completadasMes.filter((t) => t.type === 'compra')
      const ventas = completadasMes.filter((t) => t.type === 'venta')
      const totalCompras = compras.reduce((s, t) => s + t.total, 0)
      const totalVentas = ventas.reduce((s, t) => s + t.total, 0)
      const totalFeesMes = completadasMes.reduce((s, t) => s + t.fee, 0)
      const totalNetoMes = completadasMes.reduce((s, t) => s + (t.netTotal ?? t.total - t.fee), 0)
      const montoCompras = compras.reduce((s, t) => s + t.amount, 0)
      const montoVentas = ventas.reduce((s, t) => s + t.amount, 0)
      return {
        month,
        label: formatMonthLabel(month),
        transactions: txs,
        totalCompras,
        totalVentas,
        totalFees: totalFeesMes,
        totalNeto: totalNetoMes,
        tasaPromCompras: montoCompras > 0 ? totalCompras / montoCompras : 0,
        tasaPromVentas: montoVentas > 0 ? totalVentas / montoVentas : 0,
        countCompras: compras.length,
        countVentas: ventas.length,
      }
    })
  }, [filtered, mode])

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
        : 'Historial por mes'

  const description =
    mode === 'compra'
      ? 'Operaciones donde recibiste un activo a cambio de moneda fiat.'
      : mode === 'venta'
        ? 'Operaciones donde entregaste un activo a cambio de moneda fiat.'
        : 'Historial completo agrupado por mes con resumen de movimientos.'

  const defaultType: TransactionType = mode === 'venta' ? 'venta' : 'compra'

  const isEmptyState = !isLoading && filtered.length === 0
  const emptyMessage =
    search || statusFilter !== 'all' || bankFilter !== 'all' || exchangeFilter !== 'all'
      ? 'No se encontraron resultados con los filtros actuales.'
      : mode === 'venta'
        ? 'Registra tu primera venta para empezar a llevar el control.'
        : mode === 'compra'
          ? 'Registra tu primera compra para empezar a llevar el control.'
          : 'Registra tu primera operación para empezar a llevar el control.'
  const emptyButtonLabel =
    mode === 'venta' ? 'Registrar venta' : mode === 'compra' ? 'Registrar compra' : 'Registrar operación'
  const noFilters = !search && statusFilter === 'all' && bankFilter === 'all' && exchangeFilter === 'all'

  return (
    <div className="space-y-2.5 sm:space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-3">
        <Card className="p-0">
          <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
            <CardDescription className="text-[9px] sm:text-xs">Operaciones</CardDescription>
            <CardTitle className="text-sm sm:text-2xl tabular-nums leading-tight">{filtered.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="p-0">
          <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
            <CardDescription className="text-[9px] sm:text-xs">Volumen bruto</CardDescription>
            <CardTitle className="text-sm sm:text-2xl tabular-nums leading-tight">{formatCurrency(totalFiat)}</CardTitle>
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
        {filtered.length > 0 && (
          <div className="flex gap-1.5 self-start">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCSV(filtered, `p2p-ledger-${mode}-${new Date().toISOString().slice(0, 10)}`)}
              title="Exportar CSV"
            >
              <Download className="mr-1 h-3.5 w-3.5" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportPDF(filtered, `p2p-ledger-${mode}-${new Date().toISOString().slice(0, 10)}`)}
              title="Exportar reporte de texto"
            >
              <FileText className="mr-1 h-3.5 w-3.5" />
              Reporte
            </Button>
          </div>
        )}
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
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
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
              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contenido principal */}
      {mode === 'all' && groupedByMonth ? (
        /* ===== HISTORIAL AGRUPADO POR MES ===== */
        isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-10 bg-muted/40 rounded-t-lg" />
                <div className="p-4 space-y-2">
                  <div className="h-8 bg-muted/30 rounded" />
                  <div className="h-8 bg-muted/30 rounded" />
                </div>
              </Card>
            ))}
          </div>
        ) : isEmptyState ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
              <Inbox className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50 mb-3" />
              <p className="font-medium text-sm">No hay transacciones</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-sm px-4">{emptyMessage}</p>
              {noFilters && (
                <Button onClick={openNew} size="sm" className="mt-4">
                  <Plus className="mr-1 h-4 w-4" />
                  {emptyButtonLabel}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {groupedByMonth.map((group) => (
              <Card key={group.month} className="overflow-hidden">
                {/* Encabezado del mes */}
                <div className="bg-muted/50 border-b px-3 py-2 sm:px-4 sm:py-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <h3 className="font-semibold text-sm sm:text-base">{group.label}</h3>
                      <span className="text-xs text-muted-foreground">
                        ({group.countCompras + group.countVentas} {group.countCompras + group.countVentas === 1 ? 'op.' : 'ops.'})
                      </span>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm flex-wrap">
                      {group.countCompras > 0 && (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <TrendingDown className="h-3 w-3" />
                          {formatCurrency(group.totalCompras)}
                        </span>
                      )}
                      {group.countVentas > 0 && (
                        <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                          <TrendingUp className="h-3 w-3" />
                          {formatCurrency(group.totalVentas)}
                        </span>
                      )}
                      {group.totalFees > 0 && (
                        <span className="text-amber-600 dark:text-amber-400">
                          Fee: {formatCurrency(group.totalFees)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <CardContent className="p-0">
                  {/* MOBILE */}
                  <div className="sm:hidden divide-y">
                    {group.transactions.map((t) => (
                      <TransactionCardMobile key={t.id} t={t} onEdit={openEdit} onDelete={setDeleting} />
                    ))}
                  </div>
                  {/* DESKTOP */}
                  <TransactionTable
                    transactions={group.transactions}
                    onEdit={openEdit}
                    onDelete={setDeleting}
                    footerRow={
                      <TableRow className="bg-muted/30 border-t-2 border-border font-medium">
                        <TableCell colSpan={2} className="text-xs text-muted-foreground">
                          Subtotal {group.label}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {group.countCompras + group.countVentas} ops.
                        </TableCell>
                        <TableCell />
                        <TableCell />
                        <TableCell />
                        <TableCell className="text-right tabular-nums whitespace-nowrap">
                          <div className="flex flex-col items-end gap-0.5">
                            {group.countCompras > 0 && (
                              <span className="text-emerald-600 dark:text-emerald-400 text-xs">
                                C: {formatCurrency(group.totalCompras)}
                              </span>
                            )}
                            {group.countVentas > 0 && (
                              <span className="text-rose-600 dark:text-rose-400 text-xs">
                                V: {formatCurrency(group.totalVentas)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-xs whitespace-nowrap">
                          {group.totalFees > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400">
                              −{formatCurrency(group.totalFees)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(group.totalNeto)}
                        </TableCell>
                        <TableCell colSpan={3} />
                      </TableRow>
                    }
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        /* ===== MODO COMPRA / VENTA (lista plana) ===== */
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 sm:p-8 space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 rounded bg-muted/40 animate-pulse" />
                ))}
              </div>
            ) : isEmptyState ? (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
                <Inbox className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50 mb-3" />
                <p className="font-medium text-sm">No hay transacciones</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-sm px-4">{emptyMessage}</p>
                {noFilters && (
                  <Button onClick={openNew} size="sm" className="mt-4">
                    <Plus className="mr-1 h-4 w-4" />
                    {emptyButtonLabel}
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* MOBILE */}
                <div className="sm:hidden divide-y">
                  {filtered.map((t) => (
                    <TransactionCardMobile key={t.id} t={t} onEdit={openEdit} onDelete={setDeleting} />
                  ))}
                </div>
                {/* DESKTOP */}
                <TransactionTable
                  transactions={filtered}
                  onEdit={openEdit}
                  onDelete={setDeleting}
                />
              </>
            )}
          </CardContent>
        </Card>
      )}

      <TransactionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        transaction={editing}
        defaultType={defaultType}
        banks={banks}
        onSaved={refetch}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
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
            <AlertDialogAction onClick={confirmDelete} className="bg-rose-600 hover:bg-rose-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
