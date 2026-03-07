import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

// SQL to create tables if they don't exist (PostgreSQL)
const CREATE_TABLES_SQL = `
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

CREATE TABLE IF NOT EXISTS "MonthlyBudgetStats" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "plannedIncome" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mandatoryBudgetTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mandatorySpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mandatoryOverspent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualRemaining" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MonthlyBudgetStats_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MonthlyBudgetStats_month_key" ON "MonthlyBudgetStats"("month");
CREATE INDEX IF NOT EXISTS "MonthlyBudgetStats_month_idx" ON "MonthlyBudgetStats"("month");
`

// Ensure tables exist
async function ensureTables() {
  try {
    await db.$executeRawUnsafe(CREATE_TABLES_SQL)
  } catch (error) {
    console.log('Tables creation skipped (may already exist):', error)
  }
}

// GET - Get budget stats for current or specified month
export async function GET(request: Request) {
  try {
    await ensureTables()

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') || getCurrentMonth()

    // Get or create budget stats for the month
    let budgetStats = await db.monthlyBudgetStats.findUnique({
      where: { month }
    })

    // Calculate stats from scratch
    const calculatedStats = await calculateBudgetStats(month)

    // Upsert the calculated stats
    budgetStats = await db.monthlyBudgetStats.upsert({
      where: { month },
      update: calculatedStats,
      create: {
        month,
        ...calculatedStats
      }
    })

    // Get mandatory categories with their budgets
    const mandatoryCategories = await db.category.findMany({
      where: {
        type: 'expense',
        expenseType: 'mandatory'
      },
      include: {
        budgets: {
          where: { month }
        }
      }
    })

    // Calculate per-category spending
    const [year, monthNum] = month.split('-').map(Number)
    const monthStart = startOfMonth(new Date(year, monthNum - 1))
    const monthEnd = endOfMonth(new Date(year, monthNum - 1))

    const categoryStats = await Promise.all(
      mandatoryCategories.map(async (cat) => {
        const spent = await db.transaction.aggregate({
          where: {
            categoryId: cat.id,
            type: 'expense',
            date: {
              gte: monthStart,
              lte: monthEnd
            }
          },
          _sum: { amount: true }
        })

        const budget = cat.budgets[0]?.amount || 0
        const spentAmount = spent._sum.amount || 0
        const overspent = Math.max(0, spentAmount - budget)

        return {
          id: cat.id,
          name: cat.name,
          color: cat.color,
          budget,
          spent: spentAmount,
          overspent,
          remaining: Math.max(0, budget - spentAmount)
        }
      })
    )

    // Get average mandatory expenses for last 3 months (for cushion calculation)
    const avgMandatoryExpenses = await calculateAverageMandatoryExpenses(3)

    return NextResponse.json({
      ...budgetStats,
      categoryStats,
      avgMandatoryExpenses,
      mandatoryCategoriesTotal: categoryStats.reduce((sum, c) => sum + c.budget, 0),
      mandatorySpentTotal: categoryStats.reduce((sum, c) => sum + c.spent, 0),
      mandatoryOverspentTotal: categoryStats.reduce((sum, c) => sum + c.overspent, 0)
    })
  } catch (error) {
    console.error('Error fetching budget stats:', error)
    return NextResponse.json({ error: 'Failed to fetch budget stats' }, { status: 500 })
  }
}

async function calculateBudgetStats(month: string) {
  const [year, monthNum] = month.split('-').map(Number)
  const monthStart = startOfMonth(new Date(year, monthNum - 1))
  const monthEnd = endOfMonth(new Date(year, monthNum - 1))

  // Get monthly income
  let income = await db.monthlyIncome.findUnique({
    where: { month }
  })

  // If no income for this month, get the latest recurring
  if (!income) {
    const lastRecurring = await db.monthlyIncome.findFirst({
      where: { isRecurring: true },
      orderBy: { month: 'desc' }
    })
    income = lastRecurring ? { ...lastRecurring, month } as any : null
  }

  const plannedIncome = income?.amount || 0

  // Get mandatory categories
  const mandatoryCategories = await db.category.findMany({
    where: {
      type: 'expense',
      expenseType: 'mandatory'
    },
    include: {
      budgets: {
        where: { month }
      }
    }
  })

  // Calculate total mandatory budget
  const mandatoryBudgetTotal = mandatoryCategories.reduce(
    (sum, cat) => sum + (cat.budgets[0]?.amount || 0),
    0
  )

  // Get transactions for the month
  const transactions = await db.transaction.findMany({
    where: {
      date: {
        gte: monthStart,
        lte: monthEnd
      }
    },
    include: {
      category: true
    }
  })

  // Calculate mandatory spent
  const mandatorySpent = transactions
    .filter(t => t.type === 'expense' && t.category?.expenseType === 'mandatory')
    .reduce((sum, t) => sum + t.amount, 0)

  // Calculate mandatory overspent (amount over budget)
  const mandatoryOverspent = Math.max(0, mandatorySpent - mandatoryBudgetTotal)

  // Calculate other expenses (non-mandatory)
  const otherExpenses = transactions
    .filter(t => t.type === 'expense' && t.category?.expenseType !== 'mandatory')
    .reduce((sum, t) => sum + t.amount, 0)

  // Calculate actual remaining
  // Income - mandatory budget (planned) - overspent on mandatory - other expenses
  const remainingBudget = plannedIncome - mandatoryBudgetTotal
  const actualRemaining = remainingBudget - mandatoryOverspent - otherExpenses

  return {
    plannedIncome,
    mandatoryBudgetTotal,
    mandatorySpent,
    mandatoryOverspent,
    otherExpenses,
    remainingBudget,
    actualRemaining
  }
}

async function calculateAverageMandatoryExpenses(months: number): Promise<number> {
  const results: number[] = []

  for (let i = 0; i < months; i++) {
    const date = subMonths(new Date(), i)
    const monthStr = format(date, 'yyyy-MM')
    const [year, monthNum] = monthStr.split('-').map(Number)
    const monthStart = startOfMonth(new Date(year, monthNum - 1))
    const monthEnd = endOfMonth(new Date(year, monthNum - 1))

    const spent = await db.transaction.aggregate({
      where: {
        type: 'expense',
        category: {
          expenseType: 'mandatory'
        },
        date: {
          gte: monthStart,
          lte: monthEnd
        }
      },
      _sum: { amount: true }
    })

    results.push(spent._sum.amount || 0)
  }

  const total = results.reduce((sum, val) => sum + val, 0)
  return total / months
}

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
