import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET a single category
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const category = await db.category.findUnique({
      where: { id }
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error fetching category:', error)
    return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 })
  }
}

// PUT update a category
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, icon, color, type, expenseType } = body

    // Get existing category to preserve isDefault
    const existingCategory = await db.category.findUnique({ where: { id } })

    const category = await db.category.update({
      where: { id },
      data: {
        name,
        icon: icon || null,
        color: color || null,
        type: type || existingCategory?.type || 'expense',
        expenseType: expenseType || 'variable',
        isDefault: existingCategory?.isDefault ?? false
      }
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

// DELETE a category
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if category has transactions
    const transactions = await db.transaction.findFirst({
      where: { categoryId: id }
    })

    if (transactions) {
      return NextResponse.json({ 
        error: 'Cannot delete category with transactions. Please reassign transactions first.' 
      }, { status: 400 })
    }

    // Check if category has budgets
    const budgets = await db.budget.findFirst({
      where: { categoryId: id }
    })

    if (budgets) {
      return NextResponse.json({ 
        error: 'Cannot delete category with budgets. Please delete budgets first.' 
      }, { status: 400 })
    }

    await db.category.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
