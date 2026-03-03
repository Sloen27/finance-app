import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, hashPassword } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 })
    }

    if (newPassword.length < 4) {
      return NextResponse.json({ error: 'Новый пароль должен быть не менее 4 символов' }, { status: 400 })
    }

    // Get current settings
    const settings = await db.settings.findFirst()

    if (!settings || !settings.passwordHash) {
      return NextResponse.json({ error: 'Пароль не настроен' }, { status: 400 })
    }

    // Verify current password
    const isValid = verifyPassword(currentPassword, settings.passwordHash)

    if (!isValid) {
      return NextResponse.json({ error: 'Неверный текущий пароль' }, { status: 401 })
    }

    // Hash new password and save
    const newPasswordHash = hashPassword(newPassword)

    await db.settings.update({
      where: { id: settings.id },
      data: { passwordHash: newPasswordHash }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json({ error: 'Ошибка при смене пароля' }, { status: 500 })
  }
}
