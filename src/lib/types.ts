// Tipos compartidos para la app P2P

export type BankAccountType = 'ahorro' | 'corriente' | 'digital' | 'pago_movil'

export type TransactionType = 'compra' | 'venta'

export type TransactionStatus = 'pendiente' | 'completada' | 'cancelada'

export interface Bank {
  id: string
  name: string
  accountType: string
  accountNumber: string | null
  holderName: string | null
  currency: string
  initialBalance: number
  isActive: boolean
  color: string
  notes: string | null
  createdAt: string
  updatedAt: string
  // Calculados
  balance?: number
  totalEntradas?: number
  totalSalidas?: number
  _count?: {
    transactionsFrom: number
    transactionsTo: number
  }
}

export interface BankInput {
  name: string
  accountType: string
  accountNumber?: string | null
  holderName?: string | null
  currency: string
  initialBalance: number
  isActive?: boolean
  color: string
  notes?: string | null
}

export interface Transaction {
  id: string
  type: TransactionType
  counterparty: string
  asset: string
  amount: number
  rate: number
  total: number
  currency: string
  fromBankId: string | null
  toBankId: string | null
  fromBank?: {
    id: string
    name: string
    currency: string
    color: string
  } | null
  toBank?: {
    id: string
    name: string
    currency: string
    color: string
  } | null
  status: TransactionStatus
  reference: string | null
  fee: number
  date: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface TransactionInput {
  type: TransactionType
  counterparty: string
  asset?: string
  amount: number
  rate: number
  currency?: string
  fromBankId?: string | null
  toBankId?: string | null
  status?: TransactionStatus
  reference?: string | null
  fee?: number
  date?: string
  notes?: string | null
}

export interface Stats {
  resumen: {
    totalCompras: number
    totalVentas: number
    montoCompras: number
    montoVentas: number
    cantidadCompras: number
    cantidadVentas: number
    pendientes: number
    totalBanks: number
    feesCompras: number
    feesVentas: number
    avgRateCompra: number
    avgRateVenta: number
    activoNeto: number
    gananciaEstimada: number
  }
  topCounterpartes: Array<{
    counterparty: string
    total: number
    amount: number
    count: number
  }>
  activos: Array<{
    asset: string
    amount: number
    total: number
    count: number
  }>
  monthly: Array<{
    month: string
    compras: number
    ventas: number
  }>
}
