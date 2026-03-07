import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET all investments
export async function GET() {
  try {
    const investments = await db.investment.findMany({
      orderBy: { date: 'desc' }
    })

    // Convert dates to ISO strings for JSON serialization
    const serializedInvestments = investments.map(inv => ({
      ...inv,
      date: inv.date.toISOString()
    }))

    return NextResponse.json(serializedInvestments)
  } catch (error) {
    console.error('Error fetching investments:', error)
    return NextResponse.json({ error: 'Failed to fetch investments' }, { status: 500 })
  }
}

// POST create an investment transaction
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, amount, description, date } = body

    if (!type || amount === undefined || amount === null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const investmentAmount = parseFloat(amount)
    if (isNaN(investmentAmount)) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    // Parse date correctly - use local date to avoid timezone issues
    let investmentDate: Date
    if (date && typeof date === 'string' && date.trim() !== '') {
      // Parse YYYY-MM-DD format without timezone conversion
      const [year, month, day] = date.split('-').map(Number)
      if (year && month && day) {
        investmentDate = new Date(year, month - 1, day)
      } else {
        investmentDate = new Date()
      }
    } else {
      investmentDate = new Date()
    }

    // Create investment record
    const investment = await db.investment.create({
      data: {
        type,
        amount: investmentAmount,
        description: description || null,
        date: investmentDate
      }
    })

    // Return with serialized date
    return NextResponse.json({
      ...investment,
      date: investment.date.toISOString()
    })
  } catch (error) {
    console.error('Error creating investment:', error)
    return NextResponse.json({ error: 'Failed to create investment' }, { status: 500 })
  }
}
