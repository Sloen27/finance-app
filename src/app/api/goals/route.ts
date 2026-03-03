import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET all financial goals
export async function GET() {
  try {
    const goals = await db.financialGoal.findMany({
      include: {
        account: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(goals)
  } catch (error) {
    console.error('Error fetching goals:', error)
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
  }
}

// POST create a new financial goal
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, targetAmount, currentAmount, currency, deadline, accountId } = body

    const goal = await db.financialGoal.create({
      data: {
        name,
        targetAmount: parseFloat(targetAmount),
        currentAmount: parseFloat(currentAmount) || 0,
        currency: currency || 'RUB',
        deadline: deadline ? new Date(deadline) : null,
        accountId: accountId || null
      },
      include: {
        account: true
      }
    })

    return NextResponse.json(goal)
  } catch (error) {
    console.error('Error creating goal:', error)
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 })
  }
}
