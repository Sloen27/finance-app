import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getSession()

    // Check if password is set up
    const settings = await db.settings.findFirst()
    const needsSetup = !settings?.passwordHash

    if (!session) {
      return NextResponse.json({
        authenticated: false,
        needsSetup
      })
    }

    return NextResponse.json({
      authenticated: true,
      needsSetup
    })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({ authenticated: false, needsSetup: true })
  }
}
