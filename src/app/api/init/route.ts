import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

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

// Default categories with Russian names and expense types
const DEFAULT_CATEGORIES = [
  // Income categories
  { name: 'Зарплата', icon: 'Briefcase', color: '#22c55e', type: 'income', expenseType: 'variable' },
  { name: 'Подработка', icon: 'Briefcase', color: '#16a34a', type: 'income', expenseType: 'variable' },
  { name: 'Инвестиционный доход', icon: 'TrendingUp', color: '#15803d', type: 'income', expenseType: 'variable' },
  { name: 'Подарки', icon: 'Gift', color: '#4ade80', type: 'income', expenseType: 'variable' },
  { name: 'Прочие доходы', icon: 'MoreHorizontal', color: '#86efac', type: 'income', expenseType: 'variable' },

  // Expense - Mandatory (Обязательные)
  { name: 'Жилье', icon: 'Home', color: '#45B7D1', type: 'expense', expenseType: 'mandatory' },
  { name: 'Коммунальные', icon: 'Home', color: '#5DADE2', type: 'expense', expenseType: 'mandatory' },
  { name: 'Подписки', icon: 'CreditCard', color: '#96CEB4', type: 'expense', expenseType: 'mandatory' },
  { name: 'Кредиты', icon: 'CreditCard', color: '#3498DB', type: 'expense', expenseType: 'mandatory' },
  { name: 'Страховка', icon: 'Shield', color: '#5499C7', type: 'expense', expenseType: 'mandatory' },

  // Expense - Variable (Переменные)
  { name: 'Еда', icon: 'Utensils', color: '#FF6B6B', type: 'expense', expenseType: 'variable' },
  { name: 'Транспорт', icon: 'Car', color: '#4ECDC4', type: 'expense', expenseType: 'variable' },
  { name: 'Покупки', icon: 'ShoppingBag', color: '#FFEAA7', type: 'expense', expenseType: 'variable' },
  { name: 'Здоровье', icon: 'Heart', color: '#98D8C8', type: 'expense', expenseType: 'variable' },
  { name: 'Образование', icon: 'Book', color: '#82E0AA', type: 'expense', expenseType: 'variable' },

  // Expense - Discretionary (Необязательные)
  { name: 'Развлечения', icon: 'Gamepad2', color: '#DDA0DD', type: 'expense', expenseType: 'discretionary' },
  { name: 'Путешествия', icon: 'Plane', color: '#F7DC6F', type: 'expense', expenseType: 'discretionary' },
  { name: 'Хобби', icon: 'Sparkles', color: '#F8B500', type: 'expense', expenseType: 'discretionary' },
  { name: 'Подарки', icon: 'Gift', color: '#FF6F61', type: 'expense', expenseType: 'discretionary' },
  { name: 'Прочее', icon: 'MoreHorizontal', color: '#B2BABB', type: 'expense', expenseType: 'variable' }
]

// Default accounts
const DEFAULT_ACCOUNTS = [
  { name: 'Основной счет', type: 'main', currency: 'RUB', balance: 0, icon: 'Wallet', color: '#4ECDC4' },
  { name: 'Накопления', type: 'savings', currency: 'RUB', balance: 0, icon: 'PiggyBank', color: '#96CEB4' },
  { name: 'Наличные', type: 'cash', currency: 'RUB', balance: 0, icon: 'Banknote', color: '#FFEAA7' }
]

// POST - Create tables and initialize default data
export async function POST() {
  try {
    // First, create tables if they don't exist
    await db.$executeRawUnsafe(CREATE_TABLES_SQL)

    // Check if categories already exist
    const existingCategories = await db.category.count()

    if (existingCategories > 0) {
      return NextResponse.json({
        message: 'Database already initialized',
        count: existingCategories
      })
    }

    // Create default categories
    await db.category.createMany({
      data: DEFAULT_CATEGORIES.map(cat => ({
        ...cat,
        isDefault: true
      }))
    })

    // Create default accounts
    await db.account.createMany({
      data: DEFAULT_ACCOUNTS.map(acc => ({
        ...acc,
        isActive: true
      }))
    })

    // Create default settings
    await db.settings.create({
      data: {
        rubToUsdRate: 0.011,
        theme: 'light',
        mandatoryPercent: 50,
        variablePercent: 30,
        savingsPercent: 10,
        investmentsPercent: 10
      }
    })

    return NextResponse.json({
      message: 'Database initialized successfully',
      categoriesCount: DEFAULT_CATEGORIES.length,
      accountsCount: DEFAULT_ACCOUNTS.length
    })
  } catch (error) {
    console.error('Error initializing database:', error)
    return NextResponse.json({ 
      error: 'Failed to initialize database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET - Check initialization status
export async function GET() {
  try {
    // Try to check if tables exist by counting categories
    try {
      const categoriesCount = await db.category.count()
      const transactionsCount = await db.transaction.count()
      const budgetsCount = await db.budget.count()
      const regularPaymentsCount = await db.regularPayment.count()
      const settings = await db.settings.findFirst()
      const accountsCount = await db.account.count()
      const goalsCount = await db.financialGoal.count()

      return NextResponse.json({
        initialized: categoriesCount > 0,
        tablesExist: true,
        categoriesCount,
        transactionsCount,
        budgetsCount,
        regularPaymentsCount,
        hasSettings: !!settings,
        accountsCount,
        goalsCount
      })
    } catch {
      // Tables don't exist yet
      return NextResponse.json({
        initialized: false,
        tablesExist: false,
        categoriesCount: 0,
        transactionsCount: 0,
        budgetsCount: 0,
        regularPaymentsCount: 0,
        hasSettings: false,
        accountsCount: 0,
        goalsCount: 0
      })
    }
  } catch (error) {
    console.error('Error checking initialization:', error)
    return NextResponse.json({ error: 'Failed to check initialization' }, { status: 500 })
  }
}
