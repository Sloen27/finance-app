import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { format, subMonths, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns'

// GET account balance history
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month' // month, quarter, year

    // Get account info
    const account = await db.account.findUnique({
      where: { id }
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Calculate date range
    const now = new Date()
    let startDate: Date
    
    switch (period) {
      case 'quarter':
        startDate = subMonths(now, 3)
        break
      case 'year':
        startDate = subMonths(now, 12)
        break
      default:
        startDate = subMonths(now, 1)
    }

    // Get balance history from the new table
    const balanceHistory = await db.balanceHistory.findMany({
      where: {
        accountId: id,
        date: {
          gte: startOfDay(startDate),
          lte: endOfDay(now)
        }
      },
      orderBy: { date: 'asc' }
    })

    // Get all transactions for this account (for income/expense calculation)
    const transactions = await db.transaction.findMany({
      where: {
        accountId: id,
        date: {
          gte: startDate,
          lte: now
        }
      },
      orderBy: { date: 'asc' },
      include: { category: true }
    })

    // Get the earliest balance history record to determine starting balance
    const earliestHistory = await db.balanceHistory.findFirst({
      where: { accountId: id },
      orderBy: { date: 'asc' }
    })

    // Generate daily balance history
    const days = eachDayOfInterval({ start: startDate, end: now })
    const chartData: { date: string; balance: number; income: number; expense: number }[] = []
    
    // Create a map of history by date for quick lookup
    const historyByDate = new Map<string, typeof balanceHistory[0]>()
    for (const h of balanceHistory) {
      const dateKey = format(new Date(h.date), 'yyyy-MM-dd')
      // Keep the last entry for each date
      historyByDate.set(dateKey, h)
    }

    // Create a map of transactions by date
    const transactionsByDate = new Map<string, { income: number; expense: number }>()
    for (const tx of transactions) {
      const dateKey = format(new Date(tx.date), 'yyyy-MM-dd')
      if (!transactionsByDate.has(dateKey)) {
        transactionsByDate.set(dateKey, { income: 0, expense: 0 })
      }
      const dayTx = transactionsByDate.get(dateKey)!
      if (tx.type === 'income') {
        dayTx.income += tx.amount
      } else {
        dayTx.expense += tx.amount
      }
    }

    // Calculate starting balance if no history exists
    let lastKnownBalance = account.balance
    let lastKnownDate = now
    
    // If we have history, find the most recent balance before start date
    if (balanceHistory.length > 0) {
      const firstHistoryEntry = balanceHistory[0]
      lastKnownBalance = firstHistoryEntry.balance - firstHistoryEntry.change
    }

    // Build chart data
    let currentBalance = lastKnownBalance
    for (const day of days) {
      const dayStr = format(day, 'yyyy-MM-dd')
      const dayTx = transactionsByDate.get(dayStr) || { income: 0, expense: 0 }
      
      // Check if we have a history entry for this date
      const historyEntry = historyByDate.get(dayStr)
      if (historyEntry) {
        currentBalance = historyEntry.balance
      }

      chartData.push({
        date: dayStr,
        balance: currentBalance,
        income: dayTx.income,
        expense: dayTx.expense
      })
    }

    // Aggregate by month for longer periods
    let finalChartData = chartData
    if (period === 'quarter' || period === 'year') {
      const monthlyData: { [key: string]: { balance: number; income: number; expense: number; date: string } } = {}
      
      for (const item of chartData) {
        const monthKey = item.date.substring(0, 7) // YYYY-MM
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            date: monthKey,
            balance: item.balance,
            income: 0,
            expense: 0
          }
        }
        monthlyData[monthKey].balance = item.balance
        monthlyData[monthKey].income += item.income
        monthlyData[monthKey].expense += item.expense
      }
      
      finalChartData = Object.values(monthlyData)
    }

    // Calculate statistics
    const stats = {
      startBalance: chartData[0]?.balance || account.balance,
      endBalance: chartData[chartData.length - 1]?.balance || account.balance,
      totalIncome: chartData.reduce((sum, d) => sum + d.income, 0),
      totalExpense: chartData.reduce((sum, d) => sum + d.expense, 0),
      minBalance: Math.min(...chartData.map(d => d.balance)),
      maxBalance: Math.max(...chartData.map(d => d.balance)),
      change: (chartData[chartData.length - 1]?.balance || 0) - (chartData[0]?.balance || 0),
      historyRecordsCount: balanceHistory.length
    }

    return NextResponse.json({
      account,
      history: finalChartData,
      stats,
      period,
      hasHistory: balanceHistory.length > 0
    })
  } catch (error) {
    console.error('Error fetching account history:', error)
    return NextResponse.json({ error: 'Failed to fetch account history' }, { status: 500 })
  }
}
