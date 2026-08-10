// Tipos compartidos para la app P2P

export type BankAccountType = 'ahorro' | 'corriente' | 'digital' | 'pago_movil'

export type TransactionType = 'compra' | 'venta'

export type TransactionStatus = 'pendiente' | 'completada' | 'cancelada'

// Tipo de comisión: porcentaje sobre el total fiat, o monto fijo en la moneda fiat
export type FeeType = 'percent' | 'fixed'

// Tier de comisión escalonada: aplica cuando el monto fiat >= minAmount
// Permite modelar comisiones como "0.5% si < $100, 0.3% si >= $100"
export interface FeeTier {
  // Monto mínimo del total fiat para que aplique este tier
  minAmount: number
  // Tipo de comisión de este tier
  feeType: FeeType
  // Valor de la comisión (porcentaje o monto fijo según feeType)
  feeValue: number
}

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

// Exchange: plataforma P2P con su esquema de comisiones.
// Puede haber comisión de compra, de venta, o ambas.
// La comisión puede ser porcentual (% del total fiat) o fija (monto directo en la moneda).
// Adicionalmente, soporta:
//   - Tiers escalonados: comisiones que varían según el monto de la operación
//   - Descuento VIP/BNB: porcentaje que se descuenta de la comisión calculada
export interface Exchange {
  id: string
  name: string
  // Identificador corto para mostrar en badges (ej: BIN, OKX)
  shortName: string | null
  // Color hexadecimal para identificación visual
  color: string
  // Comisiones para operación de COMPRA (cuando no hay tiers)
  buyFeeType: FeeType
  buyFeeValue: number // si percent: 0.5 = 0.5%, si fixed: monto en la moneda fiat
  // Tiers escalonados opcionales para compra. Si se definen, reemplazan buyFeeType/buyFeeValue
  buyTiers: FeeTier[]
  // Comisiones para operación de VENTA (cuando no hay tiers)
  sellFeeType: FeeType
  sellFeeValue: number
  // Tiers escalonados opcionales para venta
  sellTiers: FeeTier[]
  // Comisión fija adicional opcional (ej. comisión de red USDT)
  fixedFee: number
  // Moneda en la que se expresa la comisión fija
  fixedFeeCurrency: string
  // Descuento VIP/BNB (% que se resta de la comisión calculada). 0 = sin descuento. 25 = 25% off.
  discountPercent: number
  // Etiqueta opcional para el descuento (ej: "Descuento BNB", "VIP Nivel 3")
  discountLabel: string | null
  isActive: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
  // Calculados
  _count?: {
    transactions: number
  }
}

export interface ExchangeInput {
  name: string
  shortName?: string | null
  color: string
  buyFeeType: FeeType
  buyFeeValue: number
  buyTiers?: FeeTier[]
  sellFeeType: FeeType
  sellFeeValue: number
  sellTiers?: FeeTier[]
  fixedFee?: number
  fixedFeeCurrency?: string
  discountPercent?: number
  discountLabel?: string | null
  isActive?: boolean
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
  exchangeId: string | null
  exchange?: {
    id: string
    name: string
    shortName: string | null
    color: string
  } | null
  status: TransactionStatus
  reference: string | null
  // Comisión final aplicada (en la moneda fiat). Se calcula automáticamente
  // al seleccionar exchange, pero el usuario puede sobrescribirla.
  fee: number
  // Detalle desglosado de la comisión (para mostrar info)
  feeBreakdown?: {
    baseFee: number // comisión principal (variable, antes de descuento)
    discount: number // monto descontado por VIP/BNB
    fixedFee: number // comisión fija del exchange
    total: number // baseFee - discount + fixedFee
  } | null
  // Total neto después de comisiones (lo que efectivamente entra/sale)
  netTotal: number
  // URL o base64 de la captura de pantalla / comprobante
  captureUrl: string | null
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
  exchangeId?: string | null
  status?: TransactionStatus
  reference?: string | null
  fee?: number
  captureUrl?: string | null
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
    totalExchanges: number
    feesCompras: number
    feesVentas: number
    feesTotal: number
    netCompras: number // total - fee (compras)
    netVentas: number // total - fee (ventas)
    avgRateCompra: number
    avgRateVenta: number
    activoNeto: number
    gananciaEstimada: number
    gananciaNeta: number // ganancia estimada descontando comisiones
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
  // Comisiones agrupadas por exchange
  feesPorExchange: Array<{
    exchangeId: string | null
    exchangeName: string
    exchangeColor: string
    totalFees: number
    count: number
    compras: number
    ventas: number
  }>
  monthly: Array<{
    month: string
    compras: number
    ventas: number
  }>
}
