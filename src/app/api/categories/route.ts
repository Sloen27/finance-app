import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET all categories
export async function GET() {
  try {
    const categories = await db.category.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }]
    })
    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

// POST create a new category
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, icon, color, isDefault, type, expenseType } = body

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Название категории обязательно' }, { status: 400 })
    }

    // Create category with proper data
    const category = await db.category.create({
      data: {
        name: name.trim(),
        icon: icon || null,
        color: color || null,
        isDefault: isDefault === true,
        type: type || 'expense',
        expenseType: expenseType || 'variable'
      }
    })

    return NextResponse.json(category)
  } catch (error: unknown) {
    console.error('Error creating category:', error)
    
    // Check for unique constraint violation or other specific errors
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json({ error: 'Категория с таким названием уже существует' }, { status: 400 })
      }
      return NextResponse.json({ error: `Ошибка базы данных: ${error.message}` }, { status: 500 })
    }
    
    return NextResponse.json({ error: 'Неизвестная ошибка при создании категории' }, { status: 500 })
  }
}
