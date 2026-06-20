import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'

// GET /api/transactions - listar transacciones con filtros opcionales
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') // "compra" | "venta"
    const status = searchParams.get('status')
    const bankId = searchParams.get('bankId')
    const counterparty = searchParams.get('counterparty')
    const limit = searchParams.get('limit')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const where: Prisma.TransactionWhereInput = {}
    if (type) where.type = type
    if (status) where.status = status
    if (counterparty) {
      where.counterparty = { contains: counterparty, mode: 'insensitive' }
    }
    if (bankId) {
      where.OR = [{ fromBankId: bankId }, { toBankId: bankId }]
    }
    if (from || to) {
      where.date = {}
      if (from) where.date.gte = new Date(from)
      if (to) where.date.lte = new Date(to)
    }

    const transactions = await db.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit ? Number(limit) : undefined,
      include: {
        fromBank: {
          select: { id: true, name: true, currency: true, color: true },
        },
        toBank: {
          select: { id: true, name: true, currency: true, color: true },
        },
      },
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Error al listar transacciones:', error)
    return NextResponse.json(
      { error: 'Error al obtener transacciones' },
      { status: 500 }
    )
  }
}

// POST /api/transactions - crear transacción
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      type,
      counterparty,
      asset,
      amount,
      rate,
      currency,
      fromBankId,
      toBankId,
      status,
      reference,
      fee,
      date,
      notes,
    } = body

    // Validaciones
    if (!type || !['compra', 'venta'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipo inválido. Debe ser "compra" o "venta"' },
        { status: 400 }
      )
    }
    if (!counterparty || String(counterparty).trim() === '') {
      return NextResponse.json(
        { error: 'La contraparte es obligatoria' },
        { status: 400 }
      )
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'La cantidad debe ser un número positivo' },
        { status: 400 }
      )
    }
    if (typeof rate !== 'number' || rate <= 0) {
      return NextResponse.json(
        { error: 'La tasa debe ser un número positivo' },
        { status: 400 }
      )
    }

    const total = amount * rate

    const transaction = await db.transaction.create({
      data: {
        type,
        counterparty: String(counterparty).trim(),
        asset: asset ?? 'USDT',
        amount,
        rate,
        total,
        currency: currency ?? 'VES',
        fromBankId: fromBankId || null,
        toBankId: toBankId || null,
        status: status ?? 'completada',
        reference: reference?.trim() || null,
        fee: typeof fee === 'number' ? fee : 0,
        date: date ? new Date(date) : new Date(),
        notes: notes?.trim() || null,
      },
      include: {
        fromBank: {
          select: { id: true, name: true, currency: true, color: true },
        },
        toBank: {
          select: { id: true, name: true, currency: true, color: true },
        },
      },
    })

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error('Error al crear transacción:', error)
    return NextResponse.json(
      { error: 'Error al crear transacción' },
      { status: 500 }
    )
  }
}
