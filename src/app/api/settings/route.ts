import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET settings
export async function GET() {
  try {
    let settings = await db.settings.findFirst()

    // Create default settings if none exist
    if (!settings) {
      settings = await db.settings.create({
        data: {
          rubToUsdRate: 0.011,
          theme: 'light',
          mandatoryPercent: 50,
          variablePercent: 30,
          savingsPercent: 10,
          investmentsPercent: 10
        }
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

// PUT update settings
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { rubToUsdRate, theme, mandatoryPercent, variablePercent, savingsPercent, investmentsPercent } = body

    let settings = await db.settings.findFirst()

    if (!settings) {
      settings = await db.settings.create({
        data: {
          rubToUsdRate: parseFloat(rubToUsdRate) || 0.011,
          theme: theme || 'light',
          mandatoryPercent: parseInt(mandatoryPercent) || 50,
          variablePercent: parseInt(variablePercent) || 30,
          savingsPercent: parseInt(savingsPercent) || 10,
          investmentsPercent: parseInt(investmentsPercent) || 10
        }
      })
    } else {
      settings = await db.settings.update({
        where: { id: settings.id },
        data: {
          rubToUsdRate: rubToUsdRate !== undefined ? parseFloat(rubToUsdRate) : settings.rubToUsdRate,
          theme: theme || settings.theme,
          mandatoryPercent: mandatoryPercent !== undefined ? parseInt(mandatoryPercent) : settings.mandatoryPercent,
          variablePercent: variablePercent !== undefined ? parseInt(variablePercent) : settings.variablePercent,
          savingsPercent: savingsPercent !== undefined ? parseInt(savingsPercent) : settings.savingsPercent,
          investmentsPercent: investmentsPercent !== undefined ? parseInt(investmentsPercent) : settings.investmentsPercent
        }
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
