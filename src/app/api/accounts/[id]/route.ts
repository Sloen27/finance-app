import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET a single account
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const account = await db.account.findUnique({
      where: { id },
      include: {
        transactions: {
          include: { category: true },
          orderBy: { date: 'desc' },
          take: 50
        }
      }
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    return NextResponse.json(account)
  } catch (error) {
    console.error('Error fetching account:', error)
    return NextResponse.json({ error: 'Failed to fetch account' }, { status: 500 })
  }
}

// PUT update an account
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, type, currency, balance, color, icon, isActive, changeDate } = body

    // Get current account to check balance change
    const currentAccount = await db.account.findUnique({
      where: { id }
    })

    if (!currentAccount) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const newBalance = balance !== undefined ? parseFloat(balance) : currentAccount.balance
    const balanceChange = newBalance - currentAccount.balance

    // Update account
    const account = await db.account.update({
      where: { id },
      data: {
        name,
        type,
        currency,
        balance: newBalance,
        color: color || null,
        icon: icon || null,
        isActive: isActive !== undefined ? isActive : undefined
      }
    })

    // Record balance history if balance changed
    if (balanceChange !== 0) {
      await db.balanceHistory.create({
        data: {
          accountId: id,
          balance: newBalance,
          change: balanceChange,
          reason: 'manual_update',
          date: changeDate ? new Date(changeDate) : new Date()
        }
      })
    }

    return NextResponse.json(account)
  } catch (error) {
    console.error('Error updating account:', error)
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 })
  }
}

// DELETE an account
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if account has transactions
    const transactions = await db.transaction.findFirst({
      where: { accountId: id }
    })

    if (transactions) {
      // Soft delete - just mark as inactive
      const account = await db.account.update({
        where: { id },
        data: { isActive: false }
      })
      return NextResponse.json({ message: 'Account deactivated', account })
    }

    await db.account.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting account:', error)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
