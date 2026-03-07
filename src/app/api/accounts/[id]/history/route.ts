import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { format, subMonths, eachDayOfInterval } from 'date-fns'

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

    // Get all transactions for this account
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

    // Get transactions before start date to calculate initial balance
    const transactionsBeforeStart = await db.transaction.findMany({
      where: {
        accountId: id,
        date: { lt: startDate }
      }
    })

    // Calculate initial balance (reverse from current balance)
    let balance = account.balance
    // Reverse calculate from current balance
    for (const tx of [...transactions].reverse()) {
      if (tx.type === 'income') {
        balance -= tx.amount
      } else {
        balance += tx.amount
      }
    }
    
    // Add back transactions before start date
    for (const tx of transactionsBeforeStart) {
      if (tx.type === 'income') {
        balance += tx.amount
      } else {
        balance -= tx.amount
      }
    }

    // Generate daily balance history
    const days = eachDayOfInterval({ start: startDate, end: now })
    const balanceHistory: { date: string; balance: number; income: number; expense: number }[] = []
    
    let currentBalance = balance
    let transactionIndex = 0
    
    for (const day of days) {
      const dayStr = format(day, 'yyyy-MM-dd')
      let dayIncome = 0
      let dayExpense = 0
      
      // Process all transactions for this day
      while (transactionIndex < transactions.length) {
        const tx = transactions[transactionIndex]
        const txDate = format(new Date(tx.date), 'yyyy-MM-dd')
        
        if (txDate === dayStr) {
          if (tx.type === 'income') {
            currentBalance += tx.amount
            dayIncome += tx.amount
          } else {
            currentBalance -= tx.amount
            dayExpense += tx.amount
          }
          transactionIndex++
        } else if (txDate < dayStr) {
          transactionIndex++
        } else {
          break
        }
      }
      
      balanceHistory.push({
        date: dayStr,
        balance: currentBalance,
        income: dayIncome,
        expense: dayExpense
      })
    }

    // Aggregate by month for longer periods
    let chartData = balanceHistory
    if (period === 'quarter' || period === 'year') {
      const monthlyData: { [key: string]: { balance: number; income: number; expense: number; date: string } } = {}
      
      for (const item of balanceHistory) {
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
      
      chartData = Object.values(monthlyData)
    }

    // Calculate statistics
    const stats = {
      startBalance: balanceHistory[0]?.balance || 0,
      endBalance: balanceHistory[balanceHistory.length - 1]?.balance || 0,
      totalIncome: balanceHistory.reduce((sum, d) => sum + d.income, 0),
      totalExpense: balanceHistory.reduce((sum, d) => sum + d.expense, 0),
      minBalance: Math.min(...balanceHistory.map(d => d.balance)),
      maxBalance: Math.max(...balanceHistory.map(d => d.balance)),
      change: (balanceHistory[balanceHistory.length - 1]?.balance || 0) - (balanceHistory[0]?.balance || 0)
    }

    return NextResponse.json({
      account,
      history: chartData,
      stats,
      period
    })
  } catch (error) {
    console.error('Error fetching account history:', error)
    return NextResponse.json({ error: 'Failed to fetch account history' }, { status: 500 })
  }
}
