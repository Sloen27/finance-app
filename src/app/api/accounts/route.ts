import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET all accounts
export async function GET() {
  try {
    const accounts = await db.account.findMany({
      where: { isActive: true },
      orderBy: [
        { type: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(accounts)
  } catch (error) {
    console.error('Error fetching accounts:', error)
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  }
}

// POST create a new account
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, type, currency, balance, color, icon } = body

    const account = await db.account.create({
      data: {
        name,
        type: type || 'savings',
        currency: currency || 'RUB',
        balance: parseFloat(balance) || 0,
        color: color || null,
        icon: icon || null,
        isActive: true
      }
    })

    return NextResponse.json(account)
  } catch (error) {
    console.error('Error creating account:', error)
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}
