import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/banks/[id] - obtener un banco específico
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const bank = await db.bank.findUnique({ where: { id } })

    if (!bank) {
      return NextResponse.json(
        { error: 'Banco no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(bank)
  } catch (error) {
    console.error('Error al obtener banco:', error)
    return NextResponse.json(
      { error: 'Error al obtener banco' },
      { status: 500 }
    )
  }
}

// PUT /api/banks/[id] - actualizar banco
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const {
      name,
      accountType,
      accountNumber,
      holderName,
      currency,
      initialBalance,
      isActive,
      color,
      notes,
    } = body

    const existing = await db.bank.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Banco no encontrado' },
        { status: 404 }
      )
    }

    const updated = await db.bank.update({
      where: { id },
      data: {
        name: name !== undefined ? String(name).trim() : undefined,
        accountType: accountType !== undefined ? accountType : undefined,
        accountNumber:
          accountNumber !== undefined
            ? accountNumber?.trim() || null
            : undefined,
        holderName:
          holderName !== undefined ? holderName?.trim() || null : undefined,
        currency: currency !== undefined ? currency : undefined,
        initialBalance:
          initialBalance !== undefined ? Number(initialBalance) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        color: color !== undefined ? color : undefined,
        notes: notes !== undefined ? notes?.trim() || null : undefined,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error al actualizar banco:', error)
    return NextResponse.json(
      { error: 'Error al actualizar banco' },
      { status: 500 }
    )
  }
}

// DELETE /api/banks/[id] - eliminar banco
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = await db.bank.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Banco no encontrado' },
        { status: 404 }
      )
    }

    // Al eliminar, las transacciones asociadas se quedan con fromBankId/toBankId null
    await db.bank.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar banco:', error)
    return NextResponse.json(
      { error: 'Error al eliminar banco' },
      { status: 500 }
    )
  }
}
