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
    const accountId = searchParams.get('accountId')

    const where: {
      date?: { gte: Date; lte: Date }
      categoryId?: string
      type?: string
      currency?: string
      accountId?: string
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

    if (accountId) {
      where.accountId = accountId
    }

    const transactions = await db.transaction.findMany({
      where,
      include: {
        category: true,
        account: true
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
    const { type, amount, currency, categoryId, accountId, date, comment } = body

    const transactionAmount = parseFloat(amount)
    const transactionDate = new Date(date)

    // Create transaction
    const transaction = await db.transaction.create({
      data: {
        type,
        amount: transactionAmount,
        currency: currency || 'RUB',
        categoryId,
        accountId: accountId || null,
        date: transactionDate,
        comment: comment || null
      },
      include: {
        category: true,
        account: true
      }
    })

    // If transaction is linked to an account, update balance and record history
    if (accountId) {
      const account = await db.account.findUnique({ where: { id: accountId } })
      if (account) {
        const balanceChange = type === 'income' ? transactionAmount : -transactionAmount
        const newBalance = account.balance + balanceChange

        await db.$transaction([
          // Update account balance
          db.account.update({
            where: { id: accountId },
            data: { balance: newBalance }
          }),
          // Record balance history
          db.balanceHistory.create({
            data: {
              accountId,
              balance: newBalance,
              change: balanceChange,
              reason: 'transaction',
              referenceId: transaction.id,
              date: transactionDate
            }
          })
        ])
      }
    }

    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
}
