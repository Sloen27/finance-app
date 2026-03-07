import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSession, verifyPassword } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { password } = await request.json()

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Введите пароль' }, { status: 400 })
    }

    // Get stored password hash from settings
    const settings = await db.settings.findFirst()

    if (!settings || !settings.passwordHash) {
      return NextResponse.json({ error: 'Пароль не настроен. Выполните начальную настройку.' }, { status: 400 })
    }

    // Verify password
    const isValid = verifyPassword(password, settings.passwordHash)

    if (!isValid) {
      return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 })
    }

    // Create session
    await createSession('user')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Ошибка при входе' }, { status: 500 })
  }
}
