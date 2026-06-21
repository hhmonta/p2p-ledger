// Capa de almacenamiento local (localStorage) para P2P Ledger.
// Funciona en navegador y dentro de un APK (Capacitor WebView).
// Sustituye a las API routes + Prisma para permitir ejecución 100% offline.

import type {
  Bank,
  BankInput,
  Transaction,
  TransactionInput,
  TransactionType,
  TransactionStatus,
  Stats,
} from './types'

const BANKS_KEY = 'p2p:banks'
const TX_KEY = 'p2p:transactions'
const VERSION_KEY = 'p2p:version'

const CURRENT_VERSION = '1'

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readJSON<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJSON(key: string, value: unknown): void {
  if (!isBrowser()) return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

// Pequeño EventBus para notificar cambios entre componentes
type Listener = () => void
const listeners = new Set<Listener>()

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify() {
  listeners.forEach((l) => l())
}

// Inicialización (solo una vez)
let initialized = false
function ensureInit() {
  if (initialized || !isBrowser()) return
  initialized = true
  const version = window.localStorage.getItem(VERSION_KEY)
  if (version !== CURRENT_VERSION) {
    // Primera instalación o upgrade — no sobrescribimos si ya hay datos
    window.localStorage.setItem(VERSION_KEY, CURRENT_VERSION)
  }
}

// =====================
// Bancos
// =====================

function loadBanks(): Bank[] {
  ensureInit()
  return readJSON<Bank[]>(BANKS_KEY, [])
}

function saveBanks(banks: Bank[]): void {
  writeJSON(BANKS_KEY, banks)
  notify()
}

function computeBankBalance(bank: Bank, transactions: Transaction[]): {
  balance: number
  totalEntradas: number
  totalSalidas: number
  countFrom: number
  countTo: number
} {
  let entrada = 0
  let salida = 0
  let countFrom = 0
  let countTo = 0
  for (const t of transactions) {
    if (t.status !== 'completada') continue
    if (t.toBankId === bank.id) {
      entrada += t.total
      countTo++
    }
    if (t.fromBankId === bank.id) {
      salida += t.total
      countFrom++
    }
  }
  return {
    balance: bank.initialBalance + entrada - salida,
    totalEntradas: entrada,
    totalSalidas: salida,
    countFrom,
    countTo,
  }
}

export async function listBanks(): Promise<Bank[]> {
  const banks = loadBanks()
  const transactions = loadTransactions()
  return banks
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((b) => {
      const computed = computeBankBalance(b, transactions)
      return {
        ...b,
        balance: computed.balance,
        totalEntradas: computed.totalEntradas,
        totalSalidas: computed.totalSalidas,
        _count: {
          transactionsFrom: computed.countFrom,
          transactionsTo: computed.countTo,
        },
      }
    })
}

export async function createBank(input: BankInput): Promise<Bank> {
  const banks = loadBanks()
  const now = new Date().toISOString()
  const bank: Bank = {
    id: uid(),
    name: input.name,
    accountType: input.accountType,
    accountNumber: input.accountNumber ?? null,
    holderName: input.holderName ?? null,
    currency: input.currency,
    initialBalance: input.initialBalance,
    isActive: input.isActive ?? true,
    color: input.color,
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
  }
  banks.push(bank)
  saveBanks(banks)
  return bank
}

export async function updateBank(id: string, input: Partial<BankInput>): Promise<Bank> {
  const banks = loadBanks()
  const idx = banks.findIndex((b) => b.id === id)
  if (idx === -1) throw new Error('Banco no encontrado')
  const updated: Bank = {
    ...banks[idx],
    ...input,
    accountNumber: input.accountNumber !== undefined ? input.accountNumber ?? null : banks[idx].accountNumber,
    holderName: input.holderName !== undefined ? input.holderName ?? null : banks[idx].holderName,
    notes: input.notes !== undefined ? input.notes ?? null : banks[idx].notes,
    updatedAt: new Date().toISOString(),
  }
  banks[idx] = updated
  saveBanks(banks)
  return updated
}

export async function deleteBank(id: string): Promise<void> {
  const banks = loadBanks()
  const filtered = banks.filter((b) => b.id !== id)
  saveBanks(filtered)
  // Desvincular transacciones
  const transactions = loadTransactions()
  let changed = false
  for (const t of transactions) {
    if (t.fromBankId === id || t.toBankId === id) {
      if (t.fromBankId === id) t.fromBankId = null
      if (t.toBankId === id) t.toBankId = null
      changed = true
    }
  }
  if (changed) saveTransactions(transactions)
}

// =====================
// Transacciones
// =====================

function loadTransactions(): Transaction[] {
  ensureInit()
  return readJSON<Transaction[]>(TX_KEY, [])
}

function saveTransactions(transactions: Transaction[]): void {
  writeJSON(TX_KEY, transactions)
  notify()
}

export interface TransactionFilters {
  type?: TransactionType
  status?: TransactionStatus
  bankId?: string
  counterparty?: string
  from?: string
  to?: string
  limit?: number
}

export async function listTransactions(filters: TransactionFilters = {}): Promise<Transaction[]> {
  const banks = loadBanks()
  const bankMap = new Map(banks.map((b) => [b.id, b]))
  let transactions = loadTransactions()

  if (filters.type) transactions = transactions.filter((t) => t.type === filters.type)
  if (filters.status) transactions = transactions.filter((t) => t.status === filters.status)
  if (filters.bankId)
    transactions = transactions.filter(
      (t) => t.fromBankId === filters.bankId || t.toBankId === filters.bankId
    )
  if (filters.counterparty) {
    const q = filters.counterparty.toLowerCase()
    transactions = transactions.filter(
      (t) =>
        t.counterparty.toLowerCase().includes(q) ||
        t.asset.toLowerCase().includes(q) ||
        (t.reference ?? '').toLowerCase().includes(q) ||
        (t.notes ?? '').toLowerCase().includes(q)
    )
  }
  if (filters.from) {
    const d = new Date(filters.from)
    transactions = transactions.filter((t) => new Date(t.date) >= d)
  }
  if (filters.to) {
    const d = new Date(filters.to)
    transactions = transactions.filter((t) => new Date(t.date) <= d)
  }

  transactions = transactions.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  if (filters.limit) transactions = transactions.slice(0, filters.limit)

  // Adjuntar info de bancos
  return transactions.map((t) => ({
    ...t,
    fromBank: t.fromBankId
      ? bankMap.has(t.fromBankId)
        ? {
            id: bankMap.get(t.fromBankId)!.id,
            name: bankMap.get(t.fromBankId)!.name,
            currency: bankMap.get(t.fromBankId)!.currency,
            color: bankMap.get(t.fromBankId)!.color,
          }
        : null
      : null,
    toBank: t.toBankId
      ? bankMap.has(t.toBankId)
        ? {
            id: bankMap.get(t.toBankId)!.id,
            name: bankMap.get(t.toBankId)!.name,
            currency: bankMap.get(t.toBankId)!.currency,
            color: bankMap.get(t.toBankId)!.color,
          }
        : null
      : null,
  }))
}

export async function createTransaction(input: TransactionInput): Promise<Transaction> {
  const transactions = loadTransactions()
  const now = new Date().toISOString()
  const total = input.amount * input.rate
  const tx: Transaction = {
    id: uid(),
    type: input.type,
    counterparty: input.counterparty,
    asset: input.asset ?? 'USDT',
    amount: input.amount,
    rate: input.rate,
    total,
    currency: input.currency ?? 'VES',
    fromBankId: input.fromBankId ?? null,
    toBankId: input.toBankId ?? null,
    status: input.status ?? 'completada',
    reference: input.reference ?? null,
    fee: input.fee ?? 0,
    date: input.date ?? now,
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
  }
  transactions.push(tx)
  saveTransactions(transactions)
  return tx
}

export async function updateTransaction(
  id: string,
  input: Partial<TransactionInput>
): Promise<Transaction> {
  const transactions = loadTransactions()
  const idx = transactions.findIndex((t) => t.id === id)
  if (idx === -1) throw new Error('Transacción no encontrada')
  const existing = transactions[idx]
  const finalAmount = input.amount ?? existing.amount
  const finalRate = input.rate ?? existing.rate
  const updated: Transaction = {
    ...existing,
    type: input.type ?? existing.type,
    counterparty: input.counterparty ?? existing.counterparty,
    asset: input.asset ?? existing.asset,
    amount: finalAmount,
    rate: finalRate,
    total: finalAmount * finalRate,
    currency: input.currency ?? existing.currency,
    fromBankId: input.fromBankId !== undefined ? input.fromBankId ?? null : existing.fromBankId,
    toBankId: input.toBankId !== undefined ? input.toBankId ?? null : existing.toBankId,
    status: input.status ?? existing.status,
    reference: input.reference !== undefined ? input.reference ?? null : existing.reference,
    fee: input.fee ?? existing.fee,
    date: input.date ?? existing.date,
    notes: input.notes !== undefined ? input.notes ?? null : existing.notes,
    updatedAt: new Date().toISOString(),
  }
  transactions[idx] = updated
  saveTransactions(transactions)
  return updated
}

export async function deleteTransaction(id: string): Promise<void> {
  const transactions = loadTransactions()
  saveTransactions(transactions.filter((t) => t.id !== id))
}

// =====================
// Stats
// =====================

export async function getStats(): Promise<Stats> {
  const transactions = loadTransactions()
  const completadas = transactions.filter((t) => t.status === 'completada')
  const banks = loadBanks()

  const compras = completadas.filter((t) => t.type === 'compra')
  const ventas = completadas.filter((t) => t.type === 'venta')
  const pendientes = transactions.filter((t) => t.status === 'pendiente').length

  const totalCompras = compras.reduce((s, t) => s + t.total, 0)
  const totalVentas = ventas.reduce((s, t) => s + t.total, 0)
  const montoCompras = compras.reduce((s, t) => s + t.amount, 0)
  const montoVentas = ventas.reduce((s, t) => s + t.amount, 0)
  const feesCompras = compras.reduce((s, t) => s + t.fee, 0)
  const feesVentas = ventas.reduce((s, t) => s + t.fee, 0)

  const avgRateCompra = montoCompras > 0 ? totalCompras / montoCompras : 0
  const avgRateVenta = montoVentas > 0 ? totalVentas / montoVentas : 0
  const activoNeto = montoCompras - montoVentas
  const volumenCruzado = Math.min(montoCompras, montoVentas)
  const gananciaEstimada =
    volumenCruzado > 0
      ? (avgRateVenta - avgRateCompra) * volumenCruzado - (feesCompras + feesVentas)
      : 0

  // Top contrapartes
  const cpMap = new Map<string, { total: number; amount: number; count: number }>()
  for (const t of completadas) {
    const e = cpMap.get(t.counterparty) ?? { total: 0, amount: 0, count: 0 }
    e.total += t.total
    e.amount += t.amount
    e.count++
    cpMap.set(t.counterparty, e)
  }
  const topCounterpartes = Array.from(cpMap.entries())
    .map(([counterparty, v]) => ({ counterparty, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  // Activos
  const assetMap = new Map<string, { amount: number; total: number; count: number }>()
  for (const t of completadas) {
    const e = assetMap.get(t.asset) ?? { amount: 0, total: 0, count: 0 }
    e.amount += t.amount
    e.total += t.total
    e.count++
    assetMap.set(t.asset, e)
  }
  const activos = Array.from(assetMap.entries())
    .map(([asset, v]) => ({ asset, ...v }))
    .sort((a, b) => b.total - a.total)

  // Evolución mensual (12 meses)
  const now = new Date()
  const monthlyMap = new Map<string, { compras: number; ventas: number }>()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyMap.set(key, { compras: 0, ventas: 0 })
  }
  for (const t of completadas) {
    const d = new Date(t.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const entry = monthlyMap.get(key)
    if (!entry) continue
    if (t.type === 'compra') entry.compras += t.total
    else if (t.type === 'venta') entry.ventas += t.total
  }
  const monthly = Array.from(monthlyMap.entries()).map(([month, val]) => ({
    month,
    ...val,
  }))

  return {
    resumen: {
      totalCompras,
      totalVentas,
      montoCompras,
      montoVentas,
      cantidadCompras: compras.length,
      cantidadVentas: ventas.length,
      pendientes,
      totalBanks: banks.length,
      feesCompras,
      feesVentas,
      avgRateCompra,
      avgRateVenta,
      activoNeto,
      gananciaEstimada,
    },
    topCounterpartes,
    activos,
    monthly,
  }
}

// =====================
// Import/Export (útil para backups)
// =====================

export interface BackupData {
  version: string
  exportedAt: string
  banks: Bank[]
  transactions: Transaction[]
}

export function exportData(): BackupData {
  return {
    version: CURRENT_VERSION,
    exportedAt: new Date().toISOString(),
    banks: loadBanks(),
    transactions: loadTransactions(),
  }
}

export function importData(data: BackupData, mode: 'replace' | 'merge' = 'replace'): void {
  if (mode === 'replace') {
    saveBanks(data.banks)
    saveTransactions(data.transactions)
  } else {
    const existingBanks = loadBanks()
    const existingTx = loadTransactions()
    const existingBankIds = new Set(existingBanks.map((b) => b.id))
    const existingTxIds = new Set(existingTx.map((t) => t.id))
    const newBanks = data.banks.filter((b) => !existingBankIds.has(b.id))
    const newTx = data.transactions.filter((t) => !existingTxIds.has(t.id))
    saveBanks([...existingBanks, ...newBanks])
    saveTransactions([...existingTx, ...newTx])
  }
}

export function clearAllData(): void {
  if (!isBrowser()) return
  window.localStorage.removeItem(BANKS_KEY)
  window.localStorage.removeItem(TX_KEY)
  notify()
}
