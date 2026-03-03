import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET all budgets with optional filter by month
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // Format: YYYY-MM

    const where: { month?: string } = {}

    if (month) {
      where.month = month
    }

    const budgets = await db.budget.findMany({
      where,
      include: {
        category: true
      },
      orderBy: { category: { name: 'asc' } }
    })

    return NextResponse.json(budgets)
  } catch (error) {
    console.error('Error fetching budgets:', error)
    return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 })
  }
}

// POST create a new budget
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { categoryId, amount, currency, month } = body

    // Check if budget already exists for this category and month
    const existing = await db.budget.findFirst({
      where: { categoryId, month }
    })

    if (existing) {
      return NextResponse.json({ 
        error: 'Budget already exists for this category and month' 
      }, { status: 400 })
    }

    const budget = await db.budget.create({
      data: {
        categoryId,
        amount: parseFloat(amount),
        currency: currency || 'RUB',
        month
      },
      include: {
        category: true
      }
    })

    return NextResponse.json(budget)
  } catch (error) {
    console.error('Error creating budget:', error)
    return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 })
  }
}
