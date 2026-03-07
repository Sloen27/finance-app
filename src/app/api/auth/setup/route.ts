import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

// SQL to create tables if they don't exist
const CREATE_TABLES_SQL = `
-- Settings table
CREATE TABLE IF NOT EXISTS "Settings" (
    "id" TEXT NOT NULL,
    "rubToUsdRate" DOUBLE PRECISION NOT NULL DEFAULT 0.011,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "mandatoryPercent" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "variablePercent" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "savingsPercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "investmentsPercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- Category table
CREATE TABLE IF NOT EXISTS "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT NOT NULL DEFAULT 'expense',
    "expenseType" TEXT NOT NULL DEFAULT 'variable',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- Account table
CREATE TABLE IF NOT EXISTS "Account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "color" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- Transaction table
CREATE TABLE IF NOT EXISTS "Transaction" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "categoryId" TEXT NOT NULL,
    "accountId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- Budget table
CREATE TABLE IF NOT EXISTS "Budget" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "month" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- RegularPayment table
CREATE TABLE IF NOT EXISTS "RegularPayment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "categoryId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "dueDate" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RegularPayment_pkey" PRIMARY KEY ("id")
);

-- FinancialGoal table
CREATE TABLE IF NOT EXISTS "FinancialGoal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetAmount" DOUBLE PRECISION NOT NULL,
    "currentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "deadline" TIMESTAMP(3),
    "accountId" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinancialGoal_pkey" PRIMARY KEY ("id")
);

-- Investment table
CREATE TABLE IF NOT EXISTS "Investment" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Investment_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Transaction_categoryId_fkey') THEN
        ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Transaction_accountId_fkey') THEN
        ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Budget_categoryId_fkey') THEN
        ALTER TABLE "Budget" ADD CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'RegularPayment_categoryId_fkey') THEN
        ALTER TABLE "RegularPayment" ADD CONSTRAINT "RegularPayment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'FinancialGoal_accountId_fkey') THEN
        ALTER TABLE "FinancialGoal" ADD CONSTRAINT "FinancialGoal_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "Category_type_idx" ON "Category"("type");
CREATE INDEX IF NOT EXISTS "Transaction_categoryId_idx" ON "Transaction"("categoryId");
CREATE INDEX IF NOT EXISTS "Transaction_accountId_idx" ON "Transaction"("accountId");
CREATE INDEX IF NOT EXISTS "Transaction_date_idx" ON "Transaction"("date");
CREATE INDEX IF NOT EXISTS "Budget_categoryId_idx" ON "Budget"("categoryId");
CREATE INDEX IF NOT EXISTS "RegularPayment_categoryId_idx" ON "RegularPayment"("categoryId");
CREATE INDEX IF NOT EXISTS "FinancialGoal_accountId_idx" ON "FinancialGoal"("accountId");
CREATE INDEX IF NOT EXISTS "Investment_date_idx" ON "Investment"("date");
CREATE INDEX IF NOT EXISTS "Account_type_idx" ON "Account"("type");

-- Unique constraint for Budget
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Budget_categoryId_month_key') THEN
        ALTER TABLE "Budget" ADD CONSTRAINT "Budget_categoryId_month_key" UNIQUE("categoryId", "month");
    END IF;
END $$;

-- MonthlyIncome table
CREATE TABLE IF NOT EXISTS "MonthlyIncome" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "month" TEXT NOT NULL,
    "source" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MonthlyIncome_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MonthlyIncome_month_key" ON "MonthlyIncome"("month");
CREATE INDEX IF NOT EXISTS "MonthlyIncome_month_idx" ON "MonthlyIncome"("month");

-- MonthlyBudgetStats table
CREATE TABLE IF NOT EXISTS "MonthlyBudgetStats" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "plannedIncome" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mandatoryBudgetTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mandatorySpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mandatoryOverspent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualRemaining" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MonthlyBudgetStats_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MonthlyBudgetStats_month_key" ON "MonthlyBudgetStats"("month");
CREATE INDEX IF NOT EXISTS "MonthlyBudgetStats_month_idx" ON "MonthlyBudgetStats"("month");
`

export async function POST(request: Request) {
  try {
    const { password, confirmPassword } = await request.json()

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Введите пароль' }, { status: 400 })
    }

    if (password.length < 4) {
      return NextResponse.json({ error: 'Пароль должен быть не менее 4 символов' }, { status: 400 })
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Пароли не совпадают' }, { status: 400 })
    }

    // First, ensure tables exist
    try {
      await db.$executeRawUnsafe(CREATE_TABLES_SQL)
    } catch (tableError) {
      console.error('Error creating tables:', tableError)
      // Continue anyway, tables might already exist
    }

    // Check if password is already set
    let settings
    try {
      settings = await db.settings.findFirst()
    } catch {
      // Settings table might not exist yet, try to create it
      await db.$executeRawUnsafe(CREATE_TABLES_SQL)
      settings = null
    }

    if (settings?.passwordHash) {
      return NextResponse.json({ error: 'Пароль уже установлен. Используйте страницу входа.' }, { status: 400 })
    }

    // Hash and save password
    const passwordHash = hashPassword(password)

    if (settings) {
      await db.settings.update({
        where: { id: settings.id },
        data: { passwordHash }
      })
    } else {
      await db.settings.create({
        data: {
          passwordHash,
          rubToUsdRate: 0.011,
          theme: 'light'
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json({ 
      error: 'Ошибка при настройке',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
