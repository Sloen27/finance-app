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
    const { name, type, currency, balance, color, icon, isActive } = body

    const account = await db.account.update({
      where: { id },
      data: {
        name,
        type,
        currency,
        balance: balance !== undefined ? parseFloat(balance) : undefined,
        color: color || null,
        icon: icon || null,
        isActive: isActive !== undefined ? isActive : undefined
      }
    })

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
