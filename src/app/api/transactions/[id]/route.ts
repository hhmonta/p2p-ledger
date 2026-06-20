import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/transactions/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tx = await db.transaction.findUnique({
      where: { id },
      include: {
        fromBank: true,
        toBank: true,
      },
    })
    if (!tx) {
      return NextResponse.json(
        { error: 'Transacción no encontrada' },
        { status: 404 }
      )
    }
    return NextResponse.json(tx)
  } catch (error) {
    console.error('Error al obtener transacción:', error)
    return NextResponse.json(
      { error: 'Error al obtener transacción' },
      { status: 500 }
    )
  }
}

// PUT /api/transactions/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const existing = await db.transaction.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Transacción no encontrada' },
        { status: 404 }
      )
    }

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

    // Recalcular total si amount o rate cambiaron
    const finalAmount = typeof amount === 'number' ? amount : existing.amount
    const finalRate = typeof rate === 'number' ? rate : existing.rate
    const total = finalAmount * finalRate

    const updated = await db.transaction.update({
      where: { id },
      data: {
        type: type ?? undefined,
        counterparty:
          counterparty !== undefined ? String(counterparty).trim() : undefined,
        asset: asset ?? undefined,
        amount: typeof amount === 'number' ? amount : undefined,
        rate: typeof rate === 'number' ? rate : undefined,
        total,
        currency: currency ?? undefined,
        fromBankId: fromBankId !== undefined ? fromBankId || null : undefined,
        toBankId: toBankId !== undefined ? toBankId || null : undefined,
        status: status ?? undefined,
        reference:
          reference !== undefined ? reference?.trim() || null : undefined,
        fee: typeof fee === 'number' ? fee : undefined,
        date: date ? new Date(date) : undefined,
        notes: notes !== undefined ? notes?.trim() || null : undefined,
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

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error al actualizar transacción:', error)
    return NextResponse.json(
      { error: 'Error al actualizar transacción' },
      { status: 500 }
    )
  }
}

// DELETE /api/transactions/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = await db.transaction.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Transacción no encontrada' },
        { status: 404 }
      )
    }

    await db.transaction.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar transacción:', error)
    return NextResponse.json(
      { error: 'Error al eliminar transacción' },
      { status: 500 }
    )
  }
}
