import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET all regular payments
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') === 'true'

    const where: { isActive?: boolean } = {}

    if (activeOnly) {
      where.isActive = true
    }

    const regularPayments = await db.regularPayment.findMany({
      where,
      include: {
        category: true
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(regularPayments)
  } catch (error) {
    console.error('Error fetching regular payments:', error)
    return NextResponse.json({ error: 'Failed to fetch regular payments' }, { status: 500 })
  }
}

// POST create a new regular payment
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, amount, currency, categoryId, period, dueDate, isActive } = body

    const regularPayment = await db.regularPayment.create({
      data: {
        name,
        amount: parseFloat(amount),
        currency: currency || 'RUB',
        categoryId,
        period,
        dueDate: dueDate ? parseInt(dueDate) : null,
        isActive: isActive !== undefined ? isActive : true
      },
      include: {
        category: true
      }
    })

    return NextResponse.json(regularPayment)
  } catch (error) {
    console.error('Error creating regular payment:', error)
    return NextResponse.json({ error: 'Failed to create regular payment' }, { status: 500 })
  }
}
