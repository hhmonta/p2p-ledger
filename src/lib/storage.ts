// Capa de almacenamiento local (localStorage) para P2P Ledger.
// Funciona en navegador y dentro de un APK (Capacitor WebView).
// Sustituye a las API routes + Prisma para permitir ejecución 100% offline.
//
// Soporta cifrado transparente AES-GCM cuando hay una DEK activa
// (provista por auth-context cuando el usuario desbloquea la app).

import type {
  Bank,
  BankInput,
  Exchange,
  ExchangeInput,
  FeeTier,
  Transaction,
  TransactionInput,
  TransactionType,
  TransactionStatus,
  FeeType,
  Stats,
} from './types'
import { encryptJson, decryptJson } from './security'

const BANKS_KEY = 'p2p:banks'
const TX_KEY = 'p2p:transactions'
const EXCHANGES_KEY = 'p2p:exchanges'
const VERSION_KEY = 'p2p:version'

const CURRENT_VERSION = '5'

// Claves cuyos valores se cifran cuando hay DEK activa
const ENCRYPTED_KEYS = new Set<string>([BANKS_KEY, TX_KEY, EXCHANGES_KEY])

// Prefijo para detectar entradas cifradas
const ENC_PREFIX = 'enc:v1:'

// DEK en memoria (inyectada por auth-context cuando el usuario desbloquea)
let activeDek: CryptoKey | null = null

/** Inyecta la DEK para que storage cifre/descifre automáticamente. */
export function setActiveDek(dek: CryptoKey | null) {
  activeDek = dek
}

/** Indica si la capa de cifrado está activa (hay DEK cargada). */
export function isEncryptionActive(): boolean {
  return activeDek !== null
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readJSONSync<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  if (!isBrowser()) return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    // Si la entrada está cifrada y tenemos DEK, descifrar
    if (raw.startsWith(ENC_PREFIX)) {
      if (!activeDek) {
        // App bloqueada o sin DEK: no podemos descifrar
        return fallback
      }
      const payload = raw.slice(ENC_PREFIX.length)
      return decryptJson<T>(payload, activeDek)
    }
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJSON(key: string, value: unknown): void {
  if (!isBrowser()) return
  if (ENCRYPTED_KEYS.has(key) && activeDek) {
    // Cifrar antes de guardar
    encryptJson(value, activeDek)
      .then((payload) => {
        window.localStorage.setItem(key, ENC_PREFIX + payload)
      })
      .catch(() => {
        // Si falla el cifrado, no escribir (mejor perder el dato que guardarlo en claro)
      })
    return
  }
  window.localStorage.setItem(key, JSON.stringify(value))
}

/**
 * Migra entradas en claro a cifradas cuando se activa el PIN.
 * Lee todas las claves sensibles y las re-escribe cifradas.
 */
export async function encryptAllStorage(dek: CryptoKey) {
  if (!isBrowser()) return
  for (const key of ENCRYPTED_KEYS) {
    const raw = window.localStorage.getItem(key)
    if (!raw) continue
    if (raw.startsWith(ENC_PREFIX)) continue // ya cifrada
    try {
      const parsed = JSON.parse(raw)
      const payload = await encryptJson(parsed, dek)
      window.localStorage.setItem(key, ENC_PREFIX + payload)
    } catch {
      // ignorar entradas inválidas
    }
  }
}

/**
 * Migra entradas cifradas a claro cuando se desactiva el PIN.
 * Requiere DEK para descifrar antes de quitarla.
 */
export async function decryptAllStorage(dek: CryptoKey) {
  if (!isBrowser()) return
  for (const key of ENCRYPTED_KEYS) {
    const raw = window.localStorage.getItem(key)
    if (!raw) continue
    if (!raw.startsWith(ENC_PREFIX)) continue // ya en claro
    try {
      const payload = raw.slice(ENC_PREFIX.length)
      const parsed = await decryptJson<unknown>(payload, dek)
      window.localStorage.setItem(key, JSON.stringify(parsed))
    } catch {
      // ignorar
    }
  }
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
    // Si vienen de una versión anterior, migrar exchanges existentes
    // v3 → v4: añadimos Bybit, KuCoin y Paxful si no existen
    if (version === '3') {
      const existing = readJSONSync<Exchange[]>(EXCHANGES_KEY, [])
      const migrated = existing.map(migrateExchange)
      const existingNames = new Set(migrated.map((e) => e.name.toLowerCase()))
      const additions = defaultExchanges().filter(
        (e) => !existingNames.has(e.name.toLowerCase())
      )
      // Solo añadimos los nuevos (Bybit, KuCoin, Paxful) - no duplicamos los antiguos
      const newOnes = additions.filter((e) =>
        ['Bybit P2P', 'KuCoin P2P', 'Paxful', 'Bybit Spot', 'KuCoin Spot'].includes(e.name)
      )
      writeJSON(EXCHANGES_KEY, [...migrated, ...newOnes])
    }
    // v4 → v5: añadimos P2p.me si no existe
    if (version === '4') {
      const existing = readJSONSync<Exchange[]>(EXCHANGES_KEY, []).map(migrateExchange)
      const existingNames = new Set(existing.map((e) => e.name.toLowerCase()))
      const p2pme = defaultExchanges().find((e) => e.name === 'P2p.me')!
      if (!existingNames.has('p2p.me')) {
        writeJSON(EXCHANGES_KEY, [...existing, p2pme])
      }
    }
    // Si es primera instalación (sin versión), sembrar exchanges por defecto
    if (!version) {
      const defaults = defaultExchanges()
      writeJSON(EXCHANGES_KEY, defaults)
    }
    window.localStorage.setItem(VERSION_KEY, CURRENT_VERSION)
  }
}

// Migra un Exchange de esquemas anteriores al actual (añade tiers vacíos y discountPercent=0)
function migrateExchange(e: Partial<Exchange>): Exchange {
  return {
    id: e.id ?? '',
    name: e.name ?? '',
    shortName: e.shortName ?? null,
    color: e.color ?? '#3b82f6',
    buyFeeType: (e.buyFeeType as FeeType) ?? 'percent',
    buyFeeValue: e.buyFeeValue ?? 0,
    buyTiers: e.buyTiers ?? [],
    sellFeeType: (e.sellFeeType as FeeType) ?? 'percent',
    sellFeeValue: e.sellFeeValue ?? 0,
    sellTiers: e.sellTiers ?? [],
    fixedFee: e.fixedFee ?? 0,
    fixedFeeCurrency: e.fixedFeeCurrency ?? 'USDT',
    discountPercent: e.discountPercent ?? 0,
    discountLabel: e.discountLabel ?? null,
    isActive: e.isActive ?? true,
    notes: e.notes ?? null,
    createdAt: e.createdAt ?? new Date().toISOString(),
    updatedAt: e.updatedAt ?? new Date().toISOString(),
  }
}

// Exchanges preconfigurados con comisiones típicas del mercado P2P
function defaultExchanges(): Exchange[] {
  const now = new Date().toISOString()
  return [
    {
      id: uid(),
      name: 'Binance P2P',
      shortName: 'BIN',
      color: '#f0b90b',
      buyFeeType: 'percent' as FeeType,
      buyFeeValue: 0,
      buyTiers: [],
      sellFeeType: 'percent' as FeeType,
      sellFeeValue: 0,
      sellTiers: [],
      fixedFee: 0,
      fixedFeeCurrency: 'USDT',
      discountPercent: 0,
      discountLabel: null,
      isActive: true,
      notes: 'Binance P2P no cobra comisión de taker directamente en la operación P2P. Aplican comisiones de retiro del activo.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uid(),
      name: 'OKX P2P',
      shortName: 'OKX',
      color: '#000000',
      buyFeeType: 'percent' as FeeType,
      buyFeeValue: 0,
      buyTiers: [],
      sellFeeType: 'percent' as FeeType,
      sellFeeValue: 0,
      sellTiers: [],
      fixedFee: 0,
      fixedFeeCurrency: 'USDT',
      discountPercent: 0,
      discountLabel: null,
      isActive: true,
      notes: 'OKX P2P tampoco cobra comisión directa al usuario en operaciones P2P.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uid(),
      name: 'Mercado Libre',
      shortName: 'ML',
      color: '#ffe600',
      buyFeeType: 'percent' as FeeType,
      buyFeeValue: 0,
      buyTiers: [],
      sellFeeType: 'percent' as FeeType,
      sellFeeValue: 8,
      sellTiers: [],
      fixedFee: 0,
      fixedFeeCurrency: 'VES',
      discountPercent: 0,
      discountLabel: null,
      isActive: true,
      notes: 'Mercado Libre cobra comisión al vendedor (~8% en VE). El comprador no paga.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uid(),
      name: 'PayPal',
      shortName: 'PP',
      color: '#0070ba',
      buyFeeType: 'percent' as FeeType,
      buyFeeValue: 0,
      buyTiers: [],
      sellFeeType: 'percent' as FeeType,
      sellFeeValue: 4.4,
      sellTiers: [],
      fixedFee: 0.3,
      fixedFeeCurrency: 'USD',
      discountPercent: 0,
      discountLabel: null,
      isActive: true,
      notes: 'PayPal cobra comisión al receptor (4.4% + $0.30 fijo en transacciones comerciales internacionales).',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uid(),
      name: 'Binance Spot',
      shortName: 'BIN-S',
      color: '#fbbf24',
      buyFeeType: 'percent' as FeeType,
      buyFeeValue: 0.1,
      buyTiers: [
        // Tiers escalonados: mayor volumen = menor comisión
        { minAmount: 0, feeType: 'percent' as FeeType, feeValue: 0.1 },
        { minAmount: 50000, feeType: 'percent' as FeeType, feeValue: 0.08 },
        { minAmount: 250000, feeType: 'percent' as FeeType, feeValue: 0.06 },
      ],
      sellFeeType: 'percent' as FeeType,
      sellFeeValue: 0.1,
      sellTiers: [
        { minAmount: 0, feeType: 'percent' as FeeType, feeValue: 0.1 },
        { minAmount: 50000, feeType: 'percent' as FeeType, feeValue: 0.08 },
        { minAmount: 250000, feeType: 'percent' as FeeType, feeValue: 0.06 },
      ],
      fixedFee: 0,
      fixedFeeCurrency: 'USDT',
      // Descuento BNB del 25% sobre la comisión (típico de Binance)
      discountPercent: 25,
      discountLabel: 'Descuento BNB (25%)',
      isActive: true,
      notes: 'Comisiones de spot trading (VIP/tier según volumen 30d). Con BNB descuento del 25% sobre la comisión.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uid(),
      name: 'Bybit P2P',
      shortName: 'BYB',
      color: '#f7a600',
      buyFeeType: 'percent' as FeeType,
      buyFeeValue: 0,
      buyTiers: [],
      sellFeeType: 'percent' as FeeType,
      sellFeeValue: 0,
      sellTiers: [],
      fixedFee: 0,
      fixedFeeCurrency: 'USDT',
      discountPercent: 0,
      discountLabel: null,
      isActive: true,
      notes: 'Bybit P2P no cobra comisión de taker al usuario en operaciones P2P. Aplican comisiones de retiro del activo según la red.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uid(),
      name: 'Bybit Spot',
      shortName: 'BYB-S',
      color: '#ff9f1a',
      buyFeeType: 'percent' as FeeType,
      buyFeeValue: 0.1,
      buyTiers: [
        // Tiers VIP de Bybit: 0.1% base, baja con volumen 30d
        { minAmount: 0, feeType: 'percent' as FeeType, feeValue: 0.1 },
        { minAmount: 50000, feeType: 'percent' as FeeType, feeValue: 0.08 },
        { minAmount: 250000, feeType: 'percent' as FeeType, feeValue: 0.06 },
      ],
      sellFeeType: 'percent' as FeeType,
      sellFeeValue: 0.1,
      sellTiers: [
        { minAmount: 0, feeType: 'percent' as FeeType, feeValue: 0.1 },
        { minAmount: 50000, feeType: 'percent' as FeeType, feeValue: 0.08 },
        { minAmount: 250000, feeType: 'percent' as FeeType, feeValue: 0.06 },
      ],
      fixedFee: 0,
      fixedFeeCurrency: 'USDT',
      discountPercent: 0,
      discountLabel: null,
      isActive: true,
      notes: 'Bybit Spot: comisión maker/taker base 0.1%. Baja según VIP level (volumen 30d). Sin descuento BNB como en Binance.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uid(),
      name: 'KuCoin P2P',
      shortName: 'KC',
      color: '#24d39a',
      buyFeeType: 'percent' as FeeType,
      buyFeeValue: 0,
      buyTiers: [],
      sellFeeType: 'percent' as FeeType,
      sellFeeValue: 0,
      sellTiers: [],
      fixedFee: 0,
      fixedFeeCurrency: 'USDT',
      discountPercent: 0,
      discountLabel: null,
      isActive: true,
      notes: 'KuCoin P2P no cobra comisión al usuario final en operaciones P2P. Aplican comisiones de retiro del activo.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uid(),
      name: 'KuCoin Spot',
      shortName: 'KC-S',
      color: '#1ed692',
      buyFeeType: 'percent' as FeeType,
      buyFeeValue: 0.1,
      buyTiers: [
        // KuCoin VIP tiers: 0.1% base, baja a 0.06% en VIP1+
        { minAmount: 0, feeType: 'percent' as FeeType, feeValue: 0.1 },
        { minAmount: 50000, feeType: 'percent' as FeeType, feeValue: 0.08 },
        { minAmount: 250000, feeType: 'percent' as FeeType, feeValue: 0.06 },
      ],
      sellFeeType: 'percent' as FeeType,
      sellFeeValue: 0.1,
      sellTiers: [
        { minAmount: 0, feeType: 'percent' as FeeType, feeValue: 0.1 },
        { minAmount: 50000, feeType: 'percent' as FeeType, feeValue: 0.08 },
        { minAmount: 250000, feeType: 'percent' as FeeType, feeValue: 0.06 },
      ],
      fixedFee: 0,
      fixedFeeCurrency: 'USDT',
      // KuCoin ofrece descuento del 20% si pagas comisión con KCS
      discountPercent: 20,
      discountLabel: 'Descuento KCS (20%)',
      isActive: true,
      notes: 'KuCoin Spot: comisión base 0.1% maker/taker. Con KCS descuento del 20% sobre la comisión. VIP levels por volumen 30d.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uid(),
      name: 'Paxful',
      shortName: 'PAX',
      color: '#8dc351',
      buyFeeType: 'percent' as FeeType,
      buyFeeValue: 0,
      buyTiers: [],
      // Paxful cobra comisión al vendedor, no al comprador. Varía según método de pago
      // (gift cards: 1-5%, transferencia bancaria: 0.5-1%, etc.)
      sellFeeType: 'percent' as FeeType,
      sellFeeValue: 1,
      sellTiers: [
        // Tiers típicos según método de pago (aproximado)
        { minAmount: 0, feeType: 'percent' as FeeType, feeValue: 1 },
        { minAmount: 1000, feeType: 'percent' as FeeType, feeValue: 0.5 },
      ],
      fixedFee: 0,
      fixedFeeCurrency: 'USD',
      discountPercent: 0,
      discountLabel: null,
      isActive: true,
      notes: 'Paxful cobra comisión al vendedor (varía por método de pago: gift cards 1-5%, banca 0.5-1%). Comprador no paga comisión a Paxful.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uid(),
      name: 'P2p.me',
      shortName: 'P2P',
      color: '#6c5ce7',
      buyFeeType: 'percent' as FeeType,
      buyFeeValue: 0,
      buyTiers: [],
      sellFeeType: 'percent' as FeeType,
      sellFeeValue: 0,
      sellTiers: [],
      fixedFee: 0,
      fixedFeeCurrency: 'USDT',
      discountPercent: 0,
      discountLabel: null,
      isActive: true,
      notes: 'P2p.me es un marketplace P2P para compra y venta de criptomonedas. No cobra comisión directa al usuario en operaciones P2P.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uid(),
      name: 'SkipShift',
      shortName: 'SKIP',
      color: '#ff6b6b',
      buyFeeType: 'percent' as FeeType,
      buyFeeValue: 0,
      buyTiers: [],
      sellFeeType: 'percent' as FeeType,
      sellFeeValue: 0,
      sellTiers: [],
      fixedFee: 0,
      fixedFeeCurrency: 'USDT',
      discountPercent: 0,
      discountLabel: null,
      isActive: true,
      notes: 'SkipShift es una plataforma P2P para compra y venta de criptomonedas. Sin comisión directa en operaciones P2P.',
      createdAt: now,
      updatedAt: now,
    },
  ]
}

// =====================
// Bancos
// =====================

async function loadBanks(): Promise<Bank[]> {
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
    // Para el cálculo del balance del banco usamos el neto (después de comisiones)
    // porque la comisión es un costo que se descuenta del monto que efectivamente entra/sale.
    const neto = t.netTotal ?? t.total
    if (t.toBankId === bank.id) {
      entrada += neto
      countTo++
    }
    if (t.fromBankId === bank.id) {
      salida += neto
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
  const banks = await loadBanks()
  const transactions = await loadTransactions()
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
  const banks = await loadBanks()
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
  const banks = await loadBanks()
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
  const banks = await loadBanks()
  saveBanks(banks.filter((b) => b.id !== id))
  // Desvincular transacciones
  const transactions = await loadTransactions()
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
// Exchanges
// =====================

async function loadExchanges(): Promise<Exchange[]> {
  ensureInit()
  const list = await readJSON<Exchange[]>(EXCHANGES_KEY, [])
  return list.map(migrateExchange)
}

function saveExchanges(exchanges: Exchange[]): void {
  writeJSON(EXCHANGES_KEY, exchanges)
  notify()
}

export async function listExchanges(): Promise<Exchange[]> {
  const exchanges = await loadExchanges()
  const transactions = await loadTransactions()
  return exchanges
    .sort((a, b) => {
      // Activos primero, luego por nombre
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    .map((e) => ({
      ...e,
      _count: {
        transactions: transactions.filter((t) => t.exchangeId === e.id).length,
      },
    }))
}

export async function createExchange(input: ExchangeInput): Promise<Exchange> {
  const exchanges = await loadExchanges()
  const now = new Date().toISOString()
  const exchange: Exchange = {
    id: uid(),
    name: input.name,
    shortName: input.shortName ?? null,
    color: input.color,
    buyFeeType: input.buyFeeType,
    buyFeeValue: input.buyFeeValue,
    buyTiers: input.buyTiers ?? [],
    sellFeeType: input.sellFeeType,
    sellFeeValue: input.sellFeeValue,
    sellTiers: input.sellTiers ?? [],
    fixedFee: input.fixedFee ?? 0,
    fixedFeeCurrency: input.fixedFeeCurrency ?? 'USDT',
    discountPercent: input.discountPercent ?? 0,
    discountLabel: input.discountLabel ?? null,
    isActive: input.isActive ?? true,
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
  }
  exchanges.push(exchange)
  saveExchanges(exchanges)
  return exchange
}

export async function updateExchange(id: string, input: Partial<ExchangeInput>): Promise<Exchange> {
  const exchanges = await loadExchanges()
  const idx = exchanges.findIndex((e) => e.id === id)
  if (idx === -1) throw new Error('Exchange no encontrado')
  const updated: Exchange = {
    ...exchanges[idx],
    ...input,
    shortName: input.shortName !== undefined ? input.shortName ?? null : exchanges[idx].shortName,
    buyTiers: input.buyTiers !== undefined ? input.buyTiers ?? [] : exchanges[idx].buyTiers ?? [],
    sellTiers: input.sellTiers !== undefined ? input.sellTiers ?? [] : exchanges[idx].sellTiers ?? [],
    discountLabel: input.discountLabel !== undefined ? input.discountLabel ?? null : exchanges[idx].discountLabel,
    notes: input.notes !== undefined ? input.notes ?? null : exchanges[idx].notes,
    updatedAt: new Date().toISOString(),
  }
  exchanges[idx] = updated
  saveExchanges(exchanges)
  return updated
}

export async function deleteExchange(id: string): Promise<void> {
  const exchanges = await loadExchanges()
  saveExchanges(exchanges.filter((e) => e.id !== id))
  // Desvincular transacciones (conservando fee aplicado)
  const transactions = await loadTransactions()
  let changed = false
  for (const t of transactions) {
    if (t.exchangeId === id) {
      t.exchangeId = null
      changed = true
    }
  }
  if (changed) saveTransactions(transactions)
}

/**
 * Selecciona el tier aplicable para un monto dado.
 * Si no hay tiers definidos, retorna null (usar feeType/feeValue base).
 * Si hay tiers, retorna el de mayor minAmount <= totalFiat.
 */
function pickTier(tiers: FeeTier[], totalFiat: number): FeeTier | null {
  if (!tiers || tiers.length === 0) return null
  // Ordenar de mayor a menor minAmount y elegir el primero que aplique
  const sorted = [...tiers].sort((a, b) => b.minAmount - a.minAmount)
  for (const tier of sorted) {
    if (totalFiat >= tier.minAmount) return tier
  }
  // Fallback al tier de menor minAmount (debería ser 0 normalmente)
  return sorted[sorted.length - 1]
}

/**
 * Calcula la comisión que aplicaría un exchange a una operación dada.
 * Soporta:
 *   - Tiers escalonados (si están definidos, reemplazan el fee base)
 *   - Descuento VIP/BNB (porcentaje descontado de la comisión variable, NO de la fija)
 *   - Comisión fija adicional
 * Retorna desglose y total.
 */
export function calculateFee(
  exchange: Exchange | null | undefined,
  type: TransactionType,
  totalFiat: number
): { baseFee: number; discount: number; fixedFee: number; total: number } {
  if (!exchange) return { baseFee: 0, discount: 0, fixedFee: 0, total: 0 }

  const tiers = type === 'compra' ? exchange.buyTiers : exchange.sellTiers
  const fallbackType = type === 'compra' ? exchange.buyFeeType : exchange.sellFeeType
  const fallbackValue = type === 'compra' ? exchange.buyFeeValue : exchange.sellFeeValue

  let baseFee: number
  const tier = pickTier(tiers, totalFiat)
  if (tier) {
    baseFee = tier.feeType === 'percent'
      ? (totalFiat * tier.feeValue) / 100
      : tier.feeValue
  } else {
    baseFee = fallbackType === 'percent'
      ? (totalFiat * fallbackValue) / 100
      : fallbackValue
  }

  // Descuento VIP/BNB se aplica SOLO sobre la comisión variable (no sobre la fija)
  const discountPercent = exchange.discountPercent || 0
  const discount = (baseFee * discountPercent) / 100
  const baseFeeAfterDiscount = baseFee - discount

  const fixedFee = exchange.fixedFee || 0
  const total = baseFeeAfterDiscount + fixedFee

  return {
    baseFee,
    discount,
    fixedFee,
    total,
  }
}

// =====================
// Transacciones
// =====================

async function loadTransactions(): Promise<Transaction[]> {
  ensureInit()
  return readJSON<Transaction[]>(TX_KEY, [])
}

function saveTransactions(transactions: Transaction[]): void {
  writeJSON(TX_KEY, transactions)
  notify()
}

// Migra transacciones antiguas (sin netTotal ni exchangeId) al esquema nuevo
function migrateTx(t: Transaction): Transaction {
  if (t.netTotal === undefined) {
    t.netTotal = t.total - (t.fee || 0)
  }
  if (t.exchangeId === undefined) {
    t.exchangeId = null
  }
  if (t.captureUrl === undefined) {
    t.captureUrl = null
  }
  return t
}

export interface TransactionFilters {
  type?: TransactionType
  status?: TransactionStatus
  bankId?: string
  exchangeId?: string
  counterparty?: string
  from?: string
  to?: string
  limit?: number
}

export async function listTransactions(filters: TransactionFilters = {}): Promise<Transaction[]> {
  const banks = await loadBanks()
  const bankMap = new Map(banks.map((b) => [b.id, b]))
  const exchanges = await loadExchanges()
  const exMap = new Map(exchanges.map((e) => [e.id, e]))
  let transactions = (await loadTransactions()).map(migrateTx)

  if (filters.type) transactions = transactions.filter((t) => t.type === filters.type)
  if (filters.status) transactions = transactions.filter((t) => t.status === filters.status)
  if (filters.bankId)
    transactions = transactions.filter(
      (t) => t.fromBankId === filters.bankId || t.toBankId === filters.bankId
    )
  if (filters.exchangeId) {
    if (filters.exchangeId === '__none__') {
      transactions = transactions.filter((t) => !t.exchangeId)
    } else {
      transactions = transactions.filter((t) => t.exchangeId === filters.exchangeId)
    }
  }
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

  // Adjuntar info de bancos y exchange
  return transactions.map((t) => ({
    ...t,
    fromBank: t.fromBankId && bankMap.has(t.fromBankId)
      ? {
          id: bankMap.get(t.fromBankId)!.id,
          name: bankMap.get(t.fromBankId)!.name,
          currency: bankMap.get(t.fromBankId)!.currency,
          color: bankMap.get(t.fromBankId)!.color,
        }
      : null,
    toBank: t.toBankId && bankMap.has(t.toBankId)
      ? {
          id: bankMap.get(t.toBankId)!.id,
          name: bankMap.get(t.toBankId)!.name,
          currency: bankMap.get(t.toBankId)!.currency,
          color: bankMap.get(t.toBankId)!.color,
        }
      : null,
    exchange: t.exchangeId && exMap.has(t.exchangeId)
      ? {
          id: exMap.get(t.exchangeId)!.id,
          name: exMap.get(t.exchangeId)!.name,
          shortName: exMap.get(t.exchangeId)!.shortName,
          color: exMap.get(t.exchangeId)!.color,
        }
      : null,
  }))
}

export async function createTransaction(input: TransactionInput): Promise<Transaction> {
  const transactions = await loadTransactions()
  const now = new Date().toISOString()
  const total = input.amount * input.rate
  const exchanges = await loadExchanges()
  const exchange = input.exchangeId ? exchanges.find((e) => e.id === input.exchangeId) : null

  let fee = input.fee ?? 0
  let feeBreakdown: Transaction['feeBreakdown'] = null
  // Si no se pasó fee explícito pero hay exchange, calcularlo
  if (input.fee === undefined && exchange) {
    const calc = calculateFee(exchange, input.type, total)
    fee = calc.total
    feeBreakdown = {
      baseFee: calc.baseFee,
      discount: calc.discount,
      fixedFee: calc.fixedFee,
      total: calc.total,
    }
  } else if (exchange) {
    // Si el usuario pasó fee manual y hay exchange, reconstruir breakdown aproximado
    const calc = calculateFee(exchange, input.type, total)
    const baseAfterDiscount = fee - calc.fixedFee
    feeBreakdown = {
      baseFee: calc.baseFee,
      discount: Math.max(0, calc.baseFee - baseAfterDiscount),
      fixedFee: calc.fixedFee,
      total: fee,
    }
  }

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
    exchangeId: input.exchangeId ?? null,
    status: input.status ?? 'completada',
    reference: input.reference ?? null,
    fee,
    feeBreakdown,
    netTotal: total - fee,
    captureUrl: input.captureUrl ?? null,
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
  const transactions = await loadTransactions()
  const idx = transactions.findIndex((t) => t.id === id)
  if (idx === -1) throw new Error('Transacción no encontrada')
  const existing = migrateTx(transactions[idx])
  const finalAmount = input.amount ?? existing.amount
  const finalRate = input.rate ?? existing.rate
  const total = finalAmount * finalRate
  const exchanges = await loadExchanges()
  const exchangeId = input.exchangeId !== undefined ? input.exchangeId ?? null : existing.exchangeId
  const exchange = exchangeId ? exchanges.find((e) => e.id === exchangeId) : null
  const type = input.type ?? existing.type

  let fee: number
  let feeBreakdown: Transaction['feeBreakdown'] = existing.feeBreakdown ?? null

  if (input.fee !== undefined) {
    // Usuario envió fee explícito
    fee = input.fee
    if (exchange) {
      const calc = calculateFee(exchange, type, total)
      const baseAfterDiscount = fee - calc.fixedFee
      feeBreakdown = {
        baseFee: calc.baseFee,
        discount: Math.max(0, calc.baseFee - baseAfterDiscount),
        fixedFee: calc.fixedFee,
        total: fee,
      }
    } else {
      feeBreakdown = { baseFee: fee, discount: 0, fixedFee: 0, total: fee }
    }
  } else if (input.exchangeId !== undefined || input.amount !== undefined || input.rate !== undefined || input.type !== undefined) {
    // Cambió algo que afecta el cálculo — recalcular si hay exchange
    if (exchange) {
      const calc = calculateFee(exchange, type, total)
      fee = calc.total
      feeBreakdown = {
        baseFee: calc.baseFee,
        discount: calc.discount,
        fixedFee: calc.fixedFee,
        total: calc.total,
      }
    } else {
      fee = existing.fee
      feeBreakdown = null
    }
  } else {
    fee = existing.fee
  }

  const updated: Transaction = {
    ...existing,
    type,
    counterparty: input.counterparty ?? existing.counterparty,
    asset: input.asset ?? existing.asset,
    amount: finalAmount,
    rate: finalRate,
    total,
    currency: input.currency ?? existing.currency,
    fromBankId: input.fromBankId !== undefined ? input.fromBankId ?? null : existing.fromBankId,
    toBankId: input.toBankId !== undefined ? input.toBankId ?? null : existing.toBankId,
    exchangeId,
    status: input.status ?? existing.status,
    reference: input.reference !== undefined ? input.reference ?? null : existing.reference,
    fee,
    feeBreakdown,
    netTotal: total - fee,
    captureUrl: input.captureUrl !== undefined ? input.captureUrl ?? null : existing.captureUrl,
    date: input.date ?? existing.date,
    notes: input.notes !== undefined ? input.notes ?? null : existing.notes,
    updatedAt: new Date().toISOString(),
  }
  transactions[idx] = updated
  saveTransactions(transactions)
  return updated
}

export async function deleteTransaction(id: string): Promise<void> {
  const transactions = await loadTransactions()
  saveTransactions(transactions.filter((t) => t.id !== id))
}

// =====================
// Stats
// =====================

export async function getStats(): Promise<Stats> {
  const transactions = (await loadTransactions()).map(migrateTx)
  const completadas = transactions.filter((t) => t.status === 'completada')
  const banks = await loadBanks()
  const exchanges = await loadExchanges()

  const compras = completadas.filter((t) => t.type === 'compra')
  const ventas = completadas.filter((t) => t.type === 'venta')
  const pendientes = transactions.filter((t) => t.status === 'pendiente').length

  // === Separar por moneda desde el origen ===
  const comprasVES = compras.filter((t) => t.currency === 'VES')
  const ventasVES = ventas.filter((t) => t.type === 'venta' && t.currency === 'VES')
  const comprasUSD = compras.filter((t) => t.currency === 'USD')
  const ventasUSD = ventas.filter((t) => t.type === 'venta' && t.currency === 'USD')

  // VES
  const totalCompras = comprasVES.reduce((s, t) => s + t.total, 0)
  const totalVentas = ventasVES.reduce((s, t) => s + t.total, 0)
  const montoCompras = comprasVES.reduce((s, t) => s + t.amount, 0)
  const montoVentas = ventasVES.reduce((s, t) => s + t.amount, 0)
  const feesCompras = comprasVES.reduce((s, t) => s + (t.fee || 0), 0)
  const feesVentas = ventasVES.reduce((s, t) => s + (t.fee || 0), 0)
  const feesTotal = feesCompras + feesVentas
  const netCompras = totalCompras - feesCompras
  const netVentas = totalVentas - feesVentas

  // USD (transacciones realmente en USD)
  const totalComprasUSD = comprasUSD.reduce((s, t) => s + t.total, 0)
  const totalVentasUSD = ventasUSD.reduce((s, t) => s + t.total, 0)
  const feesComprasUSD = comprasUSD.reduce((s, t) => s + (t.fee || 0), 0)
  const feesVentasUSD = ventasUSD.reduce((s, t) => s + (t.fee || 0), 0)
  const feesTotalUSD = feesComprasUSD + feesVentasUSD
  const netComprasUSD = totalComprasUSD - feesComprasUSD
  const netVentasUSD = totalVentasUSD - feesVentasUSD

  // Tasas promedio (todas las monedas para referencia)
  const totalAmountCompras = compras.reduce((s, t) => s + t.amount, 0)
  const totalAmountVentas = ventas.reduce((s, t) => s + t.amount, 0)
  const totalFiatCompras = compras.reduce((s, t) => s + t.total, 0)
  const totalFiatVentas = ventas.reduce((s, t) => s + t.total, 0)
  const avgRateCompra = totalAmountCompras > 0 ? totalFiatCompras / totalAmountCompras : 0
  const avgRateVenta = totalAmountVentas > 0 ? totalFiatVentas / totalAmountVentas : 0

  // Stock activo = capital en VES neto (comprado - vendido en VES)
  const activoNeto = netCompras - netVentas
  // Stock activo USD = capital en USD neto
  const activoNetoUSD = netComprasUSD - netVentasUSD

  // Ganancia: spread × volumen cruzado − comisiones (solo VES)
  const volumenCruzado = Math.min(montoCompras, montoVentas)
  const gananciaBruta =
    volumenCruzado > 0 ? (avgRateVenta - avgRateCompra) * volumenCruzado : 0
  const gananciaEstimada = gananciaBruta
  const gananciaNeta = gananciaBruta - feesTotal

  // Ganancia neta USD (transacciones reales en USD)
  const volumenCruzadoUSD = Math.min(
    comprasUSD.reduce((s, t) => s + t.amount, 0),
    ventasUSD.reduce((s, t) => s + t.amount, 0),
  )
  const avgRateCompraUSD = comprasUSD.reduce((s, t) => s + t.amount, 0) > 0
    ? totalComprasUSD / comprasUSD.reduce((s, t) => s + t.amount, 0) : 0
  const avgRateVentaUSD = ventasUSD.reduce((s, t) => s + t.amount, 0) > 0
    ? totalVentasUSD / ventasUSD.reduce((s, t) => s + t.amount, 0) : 0
  const gananciaNetaUSD = volumenCruzadoUSD > 0
    ? (avgRateVentaUSD - avgRateCompraUSD) * volumenCruzadoUSD - feesTotalUSD
    : -feesTotalUSD

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

  // Comisiones por exchange
  const exMap = new Map<string, {
    exchangeId: string | null
    exchangeName: string
    exchangeColor: string
    totalFees: number
    count: number
    compras: number
    ventas: number
  }>()
  const exInfoMap = new Map(exchanges.map((e) => [e.id, e]))
  for (const t of completadas) {
    const key = t.exchangeId ?? '__none__'
    const ex = t.exchangeId ? exInfoMap.get(t.exchangeId) : null
    const entry = exMap.get(key) ?? {
      exchangeId: t.exchangeId ?? null,
      exchangeName: ex?.name ?? 'Sin exchange',
      exchangeColor: ex?.color ?? '#64748b',
      totalFees: 0,
      count: 0,
      compras: 0,
      ventas: 0,
    }
    entry.totalFees += t.fee || 0
    entry.count++
    if (t.type === 'compra') entry.compras++
    else entry.ventas++
    exMap.set(key, entry)
  }
  const feesPorExchange = Array.from(exMap.values()).sort((a, b) => b.totalFees - a.totalFees)

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
      cantidadCompras: comprasVES.length,
      cantidadVentas: ventasVES.length,
      pendientes,
      totalBanks: banks.length,
      totalExchanges: exchanges.filter((e) => e.isActive).length,
      feesCompras,
      feesVentas,
      feesTotal,
      netCompras,
      netVentas,
      avgRateCompra,
      avgRateVenta,
      activoNeto,
      gananciaEstimada,
      gananciaNeta,
      totalComprasUSD,
      totalVentasUSD,
      feesComprasUSD,
      feesVentasUSD,
      feesTotalUSD,
      netComprasUSD,
      netVentasUSD,
      gananciaNetaUSD,
      activoNetoUSD,
    },
    topCounterpartes,
    activos,
    feesPorExchange,
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
  exchanges: Exchange[]
}

export async function exportData(): Promise<BackupData> {
  return {
    version: CURRENT_VERSION,
    exportedAt: new Date().toISOString(),
    banks: await loadBanks(),
    transactions: (await loadTransactions()).map(migrateTx),
    exchanges: await loadExchanges(),
  }
}

export async function importData(data: BackupData, mode: 'replace' | 'merge' = 'replace'): Promise<void> {
  if (mode === 'replace') {
    if (data.banks) saveBanks(data.banks)
    if (data.transactions) saveTransactions(data.transactions.map(migrateTx))
    if (data.exchanges) saveExchanges(data.exchanges)
  } else {
    const existingBanks = await loadBanks()
    const existingTx = (await loadTransactions()).map(migrateTx)
    const existingEx = await loadExchanges()
    const existingBankIds = new Set(existingBanks.map((b) => b.id))
    const existingTxIds = new Set(existingTx.map((t) => t.id))
    const existingExIds = new Set(existingEx.map((e) => e.id))
    const newBanks = (data.banks ?? []).filter((b) => !existingBankIds.has(b.id))
    const newTx = (data.transactions ?? []).map(migrateTx).filter((t) => !existingTxIds.has(t.id))
    const newEx = (data.exchanges ?? []).filter((e) => !existingExIds.has(e.id))
    saveBanks([...existingBanks, ...newBanks])
    saveTransactions([...existingTx, ...newTx])
    saveExchanges([...existingEx, ...newEx])
  }
}

export function clearAllData(): void {
  if (!isBrowser()) return
  window.localStorage.removeItem(BANKS_KEY)
  window.localStorage.removeItem(TX_KEY)
  window.localStorage.removeItem(EXCHANGES_KEY)
  notify()
}
