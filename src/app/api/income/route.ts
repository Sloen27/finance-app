import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get income for current or specified month
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') || getCurrentMonth()

    const income = await db.monthlyIncome.findUnique({
      where: { month }
    })

    // If no income for this month, try to get the latest recurring income
    if (!income) {
      const lastRecurring = await db.monthlyIncome.findFirst({
        where: { isRecurring: true },
        orderBy: { month: 'desc' }
      })

      if (lastRecurring) {
        return NextResponse.json({
          ...lastRecurring,
          id: null, // Not saved yet for this month
          month,
          amount: lastRecurring.amount,
          isFromPrevious: true
        })
      }
    }

    return NextResponse.json(income || { amount: 0, month, isRecurring: true })
  } catch (error) {
    console.error('Error fetching income:', error)
    return NextResponse.json({ error: 'Failed to fetch income', details: error instanceof Error ? error.message : 'Unknown' }, { status: 500 })
  }
}

// POST - Create or update income for a month
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { amount, month = getCurrentMonth(), source, isRecurring = true } = body

    if (typeof amount !== 'number' || amount < 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    // Try to find existing record first
    const existing = await db.monthlyIncome.findUnique({
      where: { month }
    })

    let income
    if (existing) {
      income = await db.monthlyIncome.update({
        where: { id: existing.id },
        data: {
          amount,
          source,
          isRecurring
        }
      })
    } else {
      income = await db.monthlyIncome.create({
        data: {
          amount,
          month,
          source,
          isRecurring
        }
      })
    }

    return NextResponse.json(income)
  } catch (error) {
    console.error('Error saving income:', error)
    return NextResponse.json({ error: 'Failed to save income', details: error instanceof Error ? error.message : 'Unknown' }, { status: 500 })
  }
}

// Helper function to get current month in YYYY-MM format
function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
