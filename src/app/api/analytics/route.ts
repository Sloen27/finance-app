import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET analytics data
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // Format: YYYY-MM
    const compareWithPrevious = searchParams.get('compare') === 'true'

    // Parse month or use current month
    const targetMonth = month || formatMonth(new Date())
    const [year, monthNum] = targetMonth.split('-').map(Number)

    // Calculate date ranges
    const startDate = new Date(year, monthNum - 1, 1)
    const endDate = new Date(year, monthNum, 0, 23, 59, 59)

    // Get transactions for the month
    const transactions = await db.transaction.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        category: true
      }
    })

    // Calculate totals
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    // Group expenses by category
    const expensesByCategory = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        const categoryId = t.categoryId
        if (!acc[categoryId]) {
          acc[categoryId] = {
            category: t.category,
            amount: 0
          }
        }
        acc[categoryId].amount += t.amount
        return acc
      }, {} as Record<string, { category: { id: string; name: string; color: string | null; icon: string | null }; amount: number }>)

    // Group by day for bar chart
    const expensesByDay = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        const day = new Date(t.date).getDate()
        if (!acc[day]) {
          acc[day] = 0
        }
        acc[day] += t.amount
        return acc
      }, {} as Record<number, number>)

    // Previous month comparison
    let previousMonthData: { month: string; totalIncome: number; totalExpense: number } | null = null
    if (compareWithPrevious) {
      const prevMonth = monthNum === 1 ? 12 : monthNum - 1
      const prevYear = monthNum === 1 ? year - 1 : year
      const prevStartDate = new Date(prevYear, prevMonth - 1, 1)
      const prevEndDate = new Date(prevYear, prevMonth, 0, 23, 59, 59)

      const prevTransactions = await db.transaction.findMany({
        where: {
          date: {
            gte: prevStartDate,
            lte: prevEndDate
          }
        }
      })

      const prevTotalIncome = prevTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0)

      const prevTotalExpense = prevTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)

      previousMonthData = {
        month: `${prevYear}-${String(prevMonth).padStart(2, '0')}`,
        totalIncome: prevTotalIncome,
        totalExpense: prevTotalExpense
      }
    }

    return NextResponse.json({
      month: targetMonth,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      expensesByCategory: Object.values(expensesByCategory),
      expensesByDay: Object.entries(expensesByDay).map(([day, amount]) => ({
        day: parseInt(day),
        amount
      })),
      previousMonth: previousMonthData
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}

function formatMonth(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}
