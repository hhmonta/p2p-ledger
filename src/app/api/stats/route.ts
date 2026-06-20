import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'

// GET /api/stats - estadísticas agregadas para el dashboard
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const dateFilter: Prisma.TransactionWhereInput = {}
    if (from || to) {
      dateFilter.date = {}
      if (from) dateFilter.date.gte = new Date(from)
      if (to) dateFilter.date.lte = new Date(to)
    }

    // Solo transacciones completadas se cuentan en stats
    const baseFilter = { status: 'completada', ...dateFilter }

    const [compras, ventas, pendientes, totalBanks] = await Promise.all([
      db.transaction.aggregate({
        where: { ...baseFilter, type: 'compra' },
        _sum: { total: true, amount: true, fee: true },
        _count: true,
      }),
      db.transaction.aggregate({
        where: { ...baseFilter, type: 'venta' },
        _sum: { total: true, amount: true, fee: true },
        _count: true,
      }),
      db.transaction.count({
        where: { status: 'pendiente' },
      }),
      db.bank.count(),
    ])

    const totalCompras = compras._sum.total ?? 0
    const totalVentas = ventas._sum.total ?? 0
    const montoCompras = compras._sum.amount ?? 0
    const montoVentas = ventas._sum.amount ?? 0
    const feesCompras = compras._sum.fee ?? 0
    const feesVentas = ventas._sum.fee ?? 0

    // Tasa promedio de compra y venta (asset = USDT u otro)
    const avgRateCompra =
      montoCompras > 0 ? totalCompras / montoCompras : 0
    const avgRateVenta =
      montoVentas > 0 ? totalVentas / montoVentas : 0

    // Spread potencial en VES (si compré y vendí el mismo activo)
    const activoComprado = montoCompras
    const activoVendido = montoVentas
    const activoNeto = activoComprado - activoVendido // positivo = tengo stock

    // Ganancia estimada: si vendí todo lo que compré, sería:
    // (avgRateVenta - avgRateCompra) * min(activoComprado, activoVendido)
    const volumenCruzado = Math.min(activoComprado, activoVendido)
    const gananciaEstimada =
      volumenCruzado > 0
        ? (avgRateVenta - avgRateCompra) * volumenCruzado - (feesCompras + feesVentas)
        : 0

    // Top contrapartes por volumen
    const topCounterpartesRaw = await db.transaction.groupBy({
      by: ['counterparty'],
      where: baseFilter,
      _sum: { total: true, amount: true },
      _count: true,
      orderBy: { _sum: { total: 'desc' } },
      take: 5,
    })

    // Activos negociados
    const activosRaw = await db.transaction.groupBy({
      by: ['asset'],
      where: baseFilter,
      _sum: { amount: true, total: true },
      _count: true,
      orderBy: { _sum: { total: 'desc' } },
    })

    // Evolución mensual (últimos 12 meses)
    const now = new Date()
    const twelveMonthsAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 11,
      1
    )
    const monthlyTx = await db.transaction.findMany({
      where: {
        ...baseFilter,
        date: { gte: twelveMonthsAgo },
      },
      select: {
        type: true,
        total: true,
        amount: true,
        date: true,
      },
    })

    const monthlyMap = new Map<string, { compras: number; ventas: number }>()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthlyMap.set(key, { compras: 0, ventas: 0 })
    }

    for (const t of monthlyTx) {
      const d = t.date
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const entry = monthlyMap.get(key)
      if (!entry) continue
      if (t.type === 'compra') entry.compras += t.total
      else if (t.type === 'venta') entry.ventas += t.total
    }

    const monthly = Array.from(monthlyMap.entries()).map(([key, val]) => ({
      month: key,
      compras: val.compras,
      ventas: val.ventas,
    }))

    return NextResponse.json({
      resumen: {
        totalCompras,
        totalVentas,
        montoCompras,
        montoVentas,
        cantidadCompras: compras._count,
        cantidadVentas: ventas._count,
        pendientes,
        totalBanks,
        feesCompras,
        feesVentas,
        avgRateCompra,
        avgRateVenta,
        activoNeto,
        gananciaEstimada,
      },
      topCounterpartes: topCounterpartesRaw.map((c) => ({
        counterparty: c.counterparty,
        total: c._sum.total ?? 0,
        amount: c._sum.amount ?? 0,
        count: c._count,
      })),
      activos: activosRaw.map((a) => ({
        asset: a.asset,
        amount: a._sum.amount ?? 0,
        total: a._sum.total ?? 0,
        count: a._count,
      })),
      monthly,
    })
  } catch (error) {
    console.error('Error al obtener stats:', error)
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    )
  }
}
