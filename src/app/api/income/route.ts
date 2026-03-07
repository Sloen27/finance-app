import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// SQL to create MonthlyIncome table if it doesn't exist (PostgreSQL)
const CREATE_MONTHLY_INCOME_TABLE = `
CREATE TABLE IF NOT EXISTS "MonthlyIncome" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "month" TEXT NOT NULL,
    "source" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MonthlyIncome_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MonthlyIncome_month_key" ON "MonthlyIncome"("month");
CREATE INDEX IF NOT EXISTS "MonthlyIncome_month_idx" ON "MonthlyIncome"("month");
`

// Ensure table exists
async function ensureTable() {
  try {
    await db.$executeRawUnsafe(CREATE_MONTHLY_INCOME_TABLE)
  } catch (error) {
    // Table might already exist, ignore error
    console.log('Table creation skipped (may already exist):', error)
  }
}

// GET - Get income for current or specified month
export async function GET(request: Request) {
  try {
    await ensureTable()

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
    return NextResponse.json({ error: 'Failed to fetch income' }, { status: 500 })
  }
}

// POST - Create or update income for a month
export async function POST(request: Request) {
  try {
    await ensureTable()

    const body = await request.json()
    const { amount, month = getCurrentMonth(), source, isRecurring = true } = body

    if (typeof amount !== 'number' || amount < 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const income = await db.monthlyIncome.upsert({
      where: { month },
      update: {
        amount,
        source,
        isRecurring
      },
      create: {
        amount,
        month,
        source,
        isRecurring
      }
    })

    return NextResponse.json(income)
  } catch (error) {
    console.error('Error saving income:', error)
    return NextResponse.json({ error: 'Failed to save income' }, { status: 500 })
  }
}

// Helper function to get current month in YYYY-MM format
function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
