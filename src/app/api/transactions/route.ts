import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET all transactions with optional filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // Format: YYYY-MM
    const categoryId = searchParams.get('categoryId')
    const type = searchParams.get('type') // income or expense
    const currency = searchParams.get('currency')

    const where: {
      date?: { gte: Date; lte: Date }
      categoryId?: string
      type?: string
      currency?: string
    } = {}

    if (month) {
      const startDate = new Date(`${month}-01T00:00:00.000Z`)
      const endDate = new Date(startDate)
      endDate.setMonth(endDate.getMonth() + 1)
      where.date = { gte: startDate, lte: endDate }
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (type) {
      where.type = type
    }

    if (currency) {
      where.currency = currency
    }

    const transactions = await db.transaction.findMany({
      where,
      include: {
        category: true
      },
      orderBy: { date: 'desc' }
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}

// POST create a new transaction
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, amount, currency, categoryId, date, comment } = body

    const transaction = await db.transaction.create({
      data: {
        type,
        amount: parseFloat(amount),
        currency: currency || 'RUB',
        categoryId,
        date: new Date(date),
        comment: comment || null
      },
      include: {
        category: true
      }
    })

    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
}
