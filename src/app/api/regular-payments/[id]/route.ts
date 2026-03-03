import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET a single regular payment
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const regularPayment = await db.regularPayment.findUnique({
      where: { id },
      include: {
        category: true
      }
    })

    if (!regularPayment) {
      return NextResponse.json({ error: 'Regular payment not found' }, { status: 404 })
    }

    return NextResponse.json(regularPayment)
  } catch (error) {
    console.error('Error fetching regular payment:', error)
    return NextResponse.json({ error: 'Failed to fetch regular payment' }, { status: 500 })
  }
}

// PUT update a regular payment
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, amount, currency, categoryId, period, dueDate, isActive } = body

    const regularPayment = await db.regularPayment.update({
      where: { id },
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
    console.error('Error updating regular payment:', error)
    return NextResponse.json({ error: 'Failed to update regular payment' }, { status: 500 })
  }
}

// DELETE a regular payment
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await db.regularPayment.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting regular payment:', error)
    return NextResponse.json({ error: 'Failed to delete regular payment' }, { status: 500 })
  }
}
