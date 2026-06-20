import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/banks - listar todos los bancos
export async function GET() {
  try {
    const banks = await db.bank.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            transactionsFrom: true,
            transactionsTo: true,
          },
        },
      },
    })

    // Calcular balances actuales según transacciones completadas
    const banksWithBalances = await Promise.all(
      banks.map(async (bank) => {
        const fromTx = await db.transaction.aggregate({
          where: {
            fromBankId: bank.id,
            status: 'completada',
          },
          _sum: { total: true },
        })
        const toTx = await db.transaction.aggregate({
          where: {
            toBankId: bank.id,
            status: 'completada',
          },
          _sum: { total: true },
        })

        const salida = fromTx._sum.total ?? 0
        const entrada = toTx._sum.total ?? 0
        const balance = bank.initialBalance + entrada - salida

        return {
          ...bank,
          balance,
          totalEntradas: entrada,
          totalSalidas: salida,
        }
      })
    )

    return NextResponse.json(banksWithBalances)
  } catch (error) {
    console.error('Error al listar bancos:', error)
    return NextResponse.json(
      { error: 'Error al obtener bancos' },
      { status: 500 }
    )
  }
}

// POST /api/banks - crear banco
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name,
      accountType,
      accountNumber,
      holderName,
      currency,
      initialBalance,
      color,
      notes,
    } = body

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre del banco es obligatorio' },
        { status: 400 }
      )
    }

    const bank = await db.bank.create({
      data: {
        name: name.trim(),
        accountType: accountType ?? 'corriente',
        accountNumber: accountNumber?.trim() || null,
        holderName: holderName?.trim() || null,
        currency: currency ?? 'VES',
        initialBalance: typeof initialBalance === 'number' ? initialBalance : 0,
        color: color ?? '#10b981',
        notes: notes?.trim() || null,
      },
    })

    return NextResponse.json(bank, { status: 201 })
  } catch (error) {
    console.error('Error al crear banco:', error)
    return NextResponse.json(
      { error: 'Error al crear banco' },
      { status: 500 }
    )
  }
}
