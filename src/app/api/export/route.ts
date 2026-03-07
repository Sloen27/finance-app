import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Export all data as JSON for backup
export async function GET() {
  try {
    const [transactions, categories, budgets, regularPayments, settings] = await Promise.all([
      db.transaction.findMany({
        include: { category: true }
      }),
      db.category.findMany(),
      db.budget.findMany({
        include: { category: true }
      }),
      db.regularPayment.findMany({
        include: { category: true }
      }),
      db.settings.findFirst()
    ])

    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      data: {
        transactions,
        categories,
        budgets,
        regularPayments,
        settings
      }
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="finance-backup-${formatDate(new Date())}.json"`
      }
    })
  } catch (error) {
    console.error('Error exporting data:', error)
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
  }
}

// POST - Export transactions as CSV
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { month } = body

    const where: { date?: { gte: Date; lte: Date } } = {}

    if (month) {
      const [year, monthNum] = month.split('-').map(Number)
      const startDate = new Date(year, monthNum - 1, 1)
      const endDate = new Date(year, monthNum, 0, 23, 59, 59)
      where.date = { gte: startDate, lte: endDate }
    }

    const transactions = await db.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' }
    })

    // Create CSV header
    const headers = ['Дата', 'Тип', 'Сумма', 'Валюта', 'Категория', 'Комментарий']
    
    // Create CSV rows
    const rows = transactions.map(t => [
      formatDate(new Date(t.date)),
      t.type === 'income' ? 'Доход' : 'Расход',
      t.amount.toFixed(2),
      t.currency,
      t.category.name,
      t.comment || ''
    ])

    const csv = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n')

    // Add BOM for Excel compatibility with Cyrillic
    const bom = '\uFEFF'
    const csvContent = bom + csv

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment; filename="transactions${month ? `-${month}` : ''}.csv"`
      }
    })
  } catch (error) {
    console.error('Error exporting CSV:', error)
    return NextResponse.json({ error: 'Failed to export CSV' }, { status: 500 })
  }
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}
