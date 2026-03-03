import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// DELETE an investment
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const investment = await db.investment.findUnique({
      where: { id }
    })

    if (!investment) {
      return NextResponse.json({ error: 'Investment not found' }, { status: 404 })
    }

    await db.investment.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting investment:', error)
    return NextResponse.json({ error: 'Failed to delete investment' }, { status: 500 })
  }
}
