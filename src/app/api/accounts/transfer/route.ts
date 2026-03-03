import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST - Transfer between accounts
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { fromAccountId, toAccountId, amount, comment } = body

    if (!fromAccountId || !toAccountId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (fromAccountId === toAccountId) {
      return NextResponse.json({ error: 'Cannot transfer to the same account' }, { status: 400 })
    }

    const transferAmount = parseFloat(amount)

    // Get accounts
    const fromAccount = await db.account.findUnique({ where: { id: fromAccountId } })
    const toAccount = await db.account.findUnique({ where: { id: toAccountId } })

    if (!fromAccount || !toAccount) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const now = new Date()

    // Update balances and record history
    const [updatedFrom, updatedTo] = await db.$transaction([
      // Update from account
      db.account.update({
        where: { id: fromAccountId },
        data: { balance: fromAccount.balance - transferAmount }
      }),
      // Update to account
      db.account.update({
        where: { id: toAccountId },
        data: { balance: toAccount.balance + transferAmount }
      }),
      // Record history for from account (outgoing)
      db.balanceHistory.create({
        data: {
          accountId: fromAccountId,
          balance: fromAccount.balance - transferAmount,
          change: -transferAmount,
          reason: 'transfer_out',
          date: now
        }
      }),
      // Record history for to account (incoming)
      db.balanceHistory.create({
        data: {
          accountId: toAccountId,
          balance: toAccount.balance + transferAmount,
          change: transferAmount,
          reason: 'transfer_in',
          date: now
        }
      })
    ])

    return NextResponse.json({
      success: true,
      fromAccount: updatedFrom,
      toAccount: updatedTo
    })
  } catch (error) {
    console.error('Error transferring:', error)
    return NextResponse.json({ error: 'Failed to transfer' }, { status: 500 })
  }
}
