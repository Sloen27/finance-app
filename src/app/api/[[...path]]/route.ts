import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, verifyPassword } from '@/lib/auth'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

// Helper to extract path segments
function getPathSegments(request: NextRequest): string[] {
  const url = new URL(request.url)
  const pathParts = url.pathname.replace('/api/', '').split('/').filter(Boolean)
  return pathParts
}

// Helper to get current month
function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// Ensure required tables exist
async function ensureTables() {
  const tables = ['MonthlyIncome', 'MonthlyBudgetStats']
  
  for (const table of tables) {
    try {
      await db.$queryRawUnsafe(`SELECT 1 FROM "${table}" LIMIT 1`)
    } catch {
      try {
        if (table === 'MonthlyIncome') {
          await db.$executeRawUnsafe(`
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
            )
          `)
          await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "MonthlyIncome_month_key" ON "MonthlyIncome"("month")`)
        } else if (table === 'MonthlyBudgetStats') {
          await db.$executeRawUnsafe(`
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
            )
          `)
          await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "MonthlyBudgetStats_month_key" ON "MonthlyBudgetStats"("month")`)
        }
      } catch (e) {
        console.error(`Error creating ${table} table:`, e)
      }
    }
  }
}

// Main handler
export async function GET(request: NextRequest) {
  return handleRequest(request, 'GET')
}

export async function POST(request: NextRequest) {
  return handleRequest(request, 'POST')
}

export async function PUT(request: NextRequest) {
  return handleRequest(request, 'PUT')
}

export async function DELETE(request: NextRequest) {
  return handleRequest(request, 'DELETE')
}

async function handleRequest(request: NextRequest, method: string) {
  const segments = getPathSegments(request)
  const [resource, id, subResource] = segments

  try {
    switch (resource) {
      case 'categories':
        return handleCategories(method, id, request)
      case 'transactions':
        return handleTransactions(method, id, request)
      case 'accounts':
        return handleAccounts(method, id, subResource, request)
      case 'budgets':
        return handleBudgets(method, id, request)
      case 'goals':
        return handleGoals(method, id, request)
      case 'investments':
        return handleInvestments(method, id, request)
      case 'regular-payments':
        return handleRegularPayments(method, id, request)
      case 'settings':
        return handleSettings(method, request)
      case 'init':
        return handleInit(method, request)
      case 'analytics':
        return handleAnalytics(method, request)
      case 'export':
        return handleExport(method, request)
      case 'income':
        return handleIncome(method, request)
      case 'budget-stats':
        return handleBudgetStats(method, request)
      case 'auth':
        return handleAuth(method, id, request)
      default:
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown' 
    }, { status: 500 })
  }
}

// === CATEGORIES ===
async function handleCategories(method: string, id: string | undefined, request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  if (method === 'GET') {
    const type = searchParams.get('type')
    const where = type ? { type } : {}
    const categories = await db.category.findMany({ where, orderBy: { name: 'asc' } })
    return NextResponse.json(categories)
  }
  
  if (method === 'POST') {
    const body = await request.json()
    const category = await db.category.create({ data: body })
    return NextResponse.json(category)
  }
  
  if (method === 'PUT' && id) {
    const body = await request.json()
    const category = await db.category.update({ where: { id }, data: body })
    return NextResponse.json(category)
  }
  
  if (method === 'DELETE' && id) {
    await db.category.delete({ where: { id } })
    return NextResponse.json({ success: true })
  }
  
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

// === TRANSACTIONS ===
async function handleTransactions(method: string, id: string | undefined, request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  if (method === 'GET') {
    const month = searchParams.get('month')
    if (month) {
      const [year, monthNum] = month.split('-').map(Number)
      const startDate = new Date(year, monthNum - 1, 1)
      const endDate = new Date(year, monthNum, 0, 23, 59, 59)
      const transactions = await db.transaction.findMany({
        where: { date: { gte: startDate, lte: endDate } },
        include: { category: true, account: true },
        orderBy: { date: 'desc' }
      })
      return NextResponse.json(transactions)
    }
    const transactions = await db.transaction.findMany({
      include: { category: true, account: true },
      orderBy: { date: 'desc' }
    })
    return NextResponse.json(transactions)
  }
  
  if (method === 'POST') {
    const body = await request.json()
    const transaction = await db.transaction.create({
      data: { ...body, date: new Date(body.date) },
      include: { category: true, account: true }
    })
    return NextResponse.json(transaction)
  }
  
  if (method === 'PUT' && id) {
    const body = await request.json()
    const transaction = await db.transaction.update({
      where: { id },
      data: { ...body, date: body.date ? new Date(body.date) : undefined },
      include: { category: true, account: true }
    })
    return NextResponse.json(transaction)
  }
  
  if (method === 'DELETE' && id) {
    await db.transaction.delete({ where: { id } })
    return NextResponse.json({ success: true })
  }
  
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

// === ACCOUNTS ===
async function handleAccounts(method: string, id: string | undefined, subResource: string | undefined, request: NextRequest) {
  if (subResource === 'transfer' && method === 'POST') {
    const body = await request.json()
    const { fromAccountId, toAccountId, amount } = body
    
    const fromAccount = await db.account.findUnique({ where: { id: fromAccountId } })
    const toAccount = await db.account.findUnique({ where: { id: toAccountId } })
    
    if (!fromAccount || !toAccount) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }
    
    await db.account.update({ where: { id: fromAccountId }, data: { balance: fromAccount.balance - amount } })
    await db.account.update({ where: { id: toAccountId }, data: { balance: toAccount.balance + amount } })
    
    return NextResponse.json({ success: true })
  }
  
  if (id && subResource === 'history') {
    try {
      const history = await db.$queryRawUnsafe(`SELECT * FROM "BalanceHistory" WHERE "accountId" = '${id}' ORDER BY date DESC`)
      return NextResponse.json(history)
    } catch {
      return NextResponse.json([])
    }
  }
  
  if (method === 'GET') {
    if (id) {
      const account = await db.account.findUnique({ where: { id } })
      return NextResponse.json(account)
    }
    const accounts = await db.account.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json(accounts)
  }
  
  if (method === 'POST') {
    const body = await request.json()
    const account = await db.account.create({ data: body })
    return NextResponse.json(account)
  }
  
  if (method === 'PUT' && id) {
    const body = await request.json()
    const account = await db.account.update({ where: { id }, data: body })
    return NextResponse.json(account)
  }
  
  if (method === 'DELETE' && id) {
    await db.account.delete({ where: { id } })
    return NextResponse.json({ success: true })
  }
  
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

// === BUDGETS ===
async function handleBudgets(method: string, id: string | undefined, request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  if (method === 'GET') {
    const month = searchParams.get('month')
    const where = month ? { month } : {}
    const budgets = await db.budget.findMany({
      where,
      include: { category: true },
      orderBy: { category: { name: 'asc' } }
    })
    return NextResponse.json(budgets)
  }
  
  if (method === 'POST') {
    const body = await request.json()
    const budget = await db.budget.upsert({
      where: { categoryId_month: { categoryId: body.categoryId, month: body.month } },
      update: { amount: body.amount },
      create: body,
      include: { category: true }
    })
    return NextResponse.json(budget)
  }
  
  if (method === 'PUT' && id) {
    const body = await request.json()
    const budget = await db.budget.update({ where: { id }, data: body, include: { category: true } })
    return NextResponse.json(budget)
  }
  
  if (method === 'DELETE' && id) {
    await db.budget.delete({ where: { id } })
    return NextResponse.json({ success: true })
  }
  
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

// === GOALS ===
async function handleGoals(method: string, id: string | undefined, request: NextRequest) {
  if (method === 'GET') {
    if (id) {
      const goal = await db.financialGoal.findUnique({ where: { id }, include: { account: true } })
      return NextResponse.json(goal)
    }
    const goals = await db.financialGoal.findMany({ include: { account: true }, orderBy: { createdAt: 'desc' } })
    return NextResponse.json(goals)
  }
  
  if (method === 'POST') {
    const body = await request.json()
    const goal = await db.financialGoal.create({ data: body, include: { account: true } })
    return NextResponse.json(goal)
  }
  
  if (method === 'PUT' && id) {
    const body = await request.json()
    const goal = await db.financialGoal.update({ where: { id }, data: body, include: { account: true } })
    return NextResponse.json(goal)
  }
  
  if (method === 'DELETE' && id) {
    await db.financialGoal.delete({ where: { id } })
    return NextResponse.json({ success: true })
  }
  
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

// === INVESTMENTS ===
async function handleInvestments(method: string, id: string | undefined, request: NextRequest) {
  if (method === 'GET') {
    const investments = await db.investment.findMany({ orderBy: { date: 'desc' } })
    return NextResponse.json(investments)
  }
  
  if (method === 'POST') {
    const body = await request.json()
    const investment = await db.investment.create({ data: { ...body, date: new Date(body.date) } })
    return NextResponse.json(investment)
  }
  
  if (method === 'DELETE' && id) {
    await db.investment.delete({ where: { id } })
    return NextResponse.json({ success: true })
  }
  
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

// === REGULAR PAYMENTS ===
async function handleRegularPayments(method: string, id: string | undefined, request: NextRequest) {
  if (method === 'GET') {
    if (id) {
      const payment = await db.regularPayment.findUnique({ where: { id }, include: { category: true } })
      return NextResponse.json(payment)
    }
    const payments = await db.regularPayment.findMany({ include: { category: true }, orderBy: { name: 'asc' } })
    return NextResponse.json(payments)
  }
  
  if (method === 'POST') {
    const body = await request.json()
    const payment = await db.regularPayment.create({ data: body, include: { category: true } })
    return NextResponse.json(payment)
  }
  
  if (method === 'PUT' && id) {
    const body = await request.json()
    const payment = await db.regularPayment.update({ where: { id }, data: body, include: { category: true } })
    return NextResponse.json(payment)
  }
  
  if (method === 'DELETE' && id) {
    await db.regularPayment.delete({ where: { id } })
    return NextResponse.json({ success: true })
  }
  
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

// === SETTINGS ===
async function handleSettings(method: string, request: NextRequest) {
  if (method === 'GET') {
    const settings = await db.settings.findFirst()
    return NextResponse.json(settings)
  }
  
  if (method === 'PUT' || method === 'POST') {
    const body = await request.json()
    let settings = await db.settings.findFirst()
    if (settings) {
      settings = await db.settings.update({ where: { id: settings.id }, data: body })
    } else {
      settings = await db.settings.create({ data: body })
    }
    return NextResponse.json(settings)
  }
  
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

// === INIT ===
async function handleInit(method: string, request: NextRequest) {
  if (method === 'GET') {
    try {
      const categoriesCount = await db.category.count()
      const transactionsCount = await db.transaction.count()
      const settings = await db.settings.findFirst()
      return NextResponse.json({
        initialized: categoriesCount > 0,
        categoriesCount,
        transactionsCount,
        hasSettings: !!settings
      })
    } catch {
      return NextResponse.json({ initialized: false })
    }
  }
  
  if (method === 'POST') {
    const existingCategories = await db.category.count()
    if (existingCategories > 0) {
      return NextResponse.json({ message: 'Already initialized' })
    }
    
    const defaultCategories = [
      { name: 'Зарплата', icon: 'Briefcase', color: '#22c55e', type: 'income', expenseType: 'variable', isDefault: true },
      { name: 'Подработка', icon: 'Briefcase', color: '#16a34a', type: 'income', expenseType: 'variable', isDefault: true },
      { name: 'Инвестиции', icon: 'TrendingUp', color: '#15803d', type: 'income', expenseType: 'variable', isDefault: true },
      { name: 'Подарки', icon: 'Gift', color: '#4ade80', type: 'income', expenseType: 'variable', isDefault: true },
      { name: 'Прочие доходы', icon: 'MoreHorizontal', color: '#86efac', type: 'income', expenseType: 'variable', isDefault: true },
      { name: 'Жилье', icon: 'Home', color: '#45B7D1', type: 'expense', expenseType: 'mandatory', isDefault: true },
      { name: 'Коммунальные', icon: 'Home', color: '#5DADE2', type: 'expense', expenseType: 'mandatory', isDefault: true },
      { name: 'Подписки', icon: 'CreditCard', color: '#96CEB4', type: 'expense', expenseType: 'mandatory', isDefault: true },
      { name: 'Кредиты', icon: 'CreditCard', color: '#3498DB', type: 'expense', expenseType: 'mandatory', isDefault: true },
      { name: 'Страховка', icon: 'Shield', color: '#5499C7', type: 'expense', expenseType: 'mandatory', isDefault: true },
      { name: 'Еда', icon: 'Utensils', color: '#FF6B6B', type: 'expense', expenseType: 'variable', isDefault: true },
      { name: 'Транспорт', icon: 'Car', color: '#4ECDC4', type: 'expense', expenseType: 'variable', isDefault: true },
      { name: 'Покупки', icon: 'ShoppingBag', color: '#FFEAA7', type: 'expense', expenseType: 'variable', isDefault: true },
      { name: 'Здоровье', icon: 'Heart', color: '#98D8C8', type: 'expense', expenseType: 'variable', isDefault: true },
      { name: 'Образование', icon: 'Book', color: '#82E0AA', type: 'expense', expenseType: 'variable', isDefault: true },
      { name: 'Развлечения', icon: 'Gamepad2', color: '#DDA0DD', type: 'expense', expenseType: 'discretionary', isDefault: true },
      { name: 'Путешествия', icon: 'Plane', color: '#F7DC6F', type: 'expense', expenseType: 'discretionary', isDefault: true },
      { name: 'Хобби', icon: 'Sparkles', color: '#F8B500', type: 'expense', expenseType: 'discretionary', isDefault: true },
      { name: 'Подарки расход', icon: 'Gift', color: '#FF6F61', type: 'expense', expenseType: 'discretionary', isDefault: true },
      { name: 'Прочее', icon: 'MoreHorizontal', color: '#B2BABB', type: 'expense', expenseType: 'variable', isDefault: true }
    ]
    
    await db.category.createMany({ data: defaultCategories })
    
    await db.account.createMany({
      data: [
        { name: 'Основной счет', type: 'main', currency: 'RUB', balance: 0, isActive: true },
        { name: 'Накопления', type: 'savings', currency: 'RUB', balance: 0, isActive: true },
        { name: 'Наличные', type: 'cash', currency: 'RUB', balance: 0, isActive: true }
      ]
    })
    
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
    
    return NextResponse.json({ success: true, message: 'Database initialized' })
  }
  
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

// === ANALYTICS ===
async function handleAnalytics(method: string, request: NextRequest) {
  if (method !== 'GET') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }
  
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') || getCurrentMonth()
  
  const [year, monthNum] = month.split('-').map(Number)
  const startDate = new Date(year, monthNum - 1, 1)
  const endDate = new Date(year, monthNum, 0, 23, 59, 59)
  
  const transactions = await db.transaction.findMany({
    where: { date: { gte: startDate, lte: endDate } },
    include: { category: true }
  })
  
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
  
  const byCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const catId = t.categoryId
      if (!acc[catId]) {
        acc[catId] = { categoryId: catId, categoryName: t.category?.name || 'Other', total: 0 }
      }
      acc[catId].total += t.amount
      return acc
    }, {} as Record<string, { categoryId: string; categoryName: string; total: number }>)
  
  return NextResponse.json({
    month,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    byCategory: Object.values(byCategory).sort((a, b) => b.total - a.total)
  })
}

// === EXPORT ===
async function handleExport(method: string, request: NextRequest) {
  if (method !== 'GET') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }
  
  const [transactions, categories, accounts, budgets] = await Promise.all([
    db.transaction.findMany({ include: { category: true, account: true } }),
    db.category.findMany(),
    db.account.findMany(),
    db.budget.findMany({ include: { category: true } })
  ])
  
  return NextResponse.json({ transactions, categories, accounts, budgets, exportedAt: new Date().toISOString() })
}

// === INCOME ===
async function handleIncome(method: string, request: NextRequest) {
  await ensureTables()
  
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') || getCurrentMonth()
  
  if (method === 'GET') {
    const income = await db.monthlyIncome.findUnique({ where: { month } })
    
    if (!income) {
      const lastRecurring = await db.monthlyIncome.findFirst({
        where: { isRecurring: true },
        orderBy: { month: 'desc' }
      })
      if (lastRecurring) {
        return NextResponse.json({ ...lastRecurring, id: null, month, isFromPrevious: true })
      }
    }
    
    return NextResponse.json(income || { amount: 0, month, isRecurring: true })
  }
  
  if (method === 'POST') {
    const body = await request.json()
    const { amount, month: bodyMonth = getCurrentMonth(), source, isRecurring = true } = body
    
    if (typeof amount !== 'number' || amount < 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }
    
    const existing = await db.monthlyIncome.findUnique({ where: { month: bodyMonth } })
    
    let income
    if (existing) {
      income = await db.monthlyIncome.update({
        where: { id: existing.id },
        data: { amount, source, isRecurring }
      })
    } else {
      income = await db.monthlyIncome.create({
        data: { amount, month: bodyMonth, source, isRecurring }
      })
    }
    
    return NextResponse.json(income)
  }
  
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

// === BUDGET STATS ===
async function handleBudgetStats(method: string, request: NextRequest) {
  await ensureTables()
  
  if (method !== 'GET') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }
  
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') || getCurrentMonth()
  
  const [year, monthNum] = month.split('-').map(Number)
  const monthStart = startOfMonth(new Date(year, monthNum - 1))
  const monthEnd = endOfMonth(new Date(year, monthNum - 1))
  
  let income = await db.monthlyIncome.findUnique({ where: { month } })
  if (!income) {
    const lastRecurring = await db.monthlyIncome.findFirst({
      where: { isRecurring: true },
      orderBy: { month: 'desc' }
    })
    income = lastRecurring ? { ...lastRecurring, month } as any : null
  }
  
  const plannedIncome = income?.amount || 0
  
  const mandatoryCategories = await db.category.findMany({
    where: { type: 'expense', expenseType: 'mandatory' },
    include: { budgets: { where: { month } } }
  })
  
  const mandatoryBudgetTotal = mandatoryCategories.reduce((sum, cat) => sum + (cat.budgets[0]?.amount || 0), 0)
  
  const transactions = await db.transaction.findMany({
    where: { date: { gte: monthStart, lte: monthEnd } },
    include: { category: true }
  })
  
  const mandatorySpent = transactions
    .filter(t => t.type === 'expense' && t.category?.expenseType === 'mandatory')
    .reduce((sum, t) => sum + t.amount, 0)
  
  const mandatoryOverspent = Math.max(0, mandatorySpent - mandatoryBudgetTotal)
  const otherExpenses = transactions
    .filter(t => t.type === 'expense' && t.category?.expenseType !== 'mandatory')
    .reduce((sum, t) => sum + t.amount, 0)
  
  const remainingBudget = plannedIncome - mandatoryBudgetTotal
  const actualRemaining = remainingBudget - mandatoryOverspent - otherExpenses
  
  let budgetStats = await db.monthlyBudgetStats.findUnique({ where: { month } })
  
  const statsData = {
    plannedIncome,
    mandatoryBudgetTotal,
    mandatorySpent,
    mandatoryOverspent,
    otherExpenses,
    remainingBudget,
    actualRemaining
  }
  
  if (budgetStats) {
    budgetStats = await db.monthlyBudgetStats.update({
      where: { id: budgetStats.id },
      data: statsData
    })
  } else {
    budgetStats = await db.monthlyBudgetStats.create({
      data: { month, ...statsData }
    })
  }
  
  const categoryStats = await Promise.all(
    mandatoryCategories.map(async (cat) => {
      const spent = await db.transaction.aggregate({
        where: {
          categoryId: cat.id,
          type: 'expense',
          date: { gte: monthStart, lte: monthEnd }
        },
        _sum: { amount: true }
      })
      
      const budget = cat.budgets[0]?.amount || 0
      const spentAmount = spent._sum.amount || 0
      
      return {
        id: cat.id,
        name: cat.name,
        color: cat.color,
        budget,
        spent: spentAmount,
        overspent: Math.max(0, spentAmount - budget),
        remaining: Math.max(0, budget - spentAmount)
      }
    })
  )
  
  const avgResults: number[] = []
  for (let i = 0; i < 3; i++) {
    const date = subMonths(new Date(), i)
    const mStr = format(date, 'yyyy-MM')
    const [y, m] = mStr.split('-').map(Number)
    const ms = startOfMonth(new Date(y, m - 1))
    const me = endOfMonth(new Date(y, m - 1))
    
    const spent = await db.transaction.aggregate({
      where: {
        type: 'expense',
        category: { expenseType: 'mandatory' },
        date: { gte: ms, lte: me }
      },
      _sum: { amount: true }
    })
    avgResults.push(spent._sum.amount || 0)
  }
  
  return NextResponse.json({
    ...budgetStats,
    categoryStats,
    avgMandatoryExpenses: avgResults.reduce((a, b) => a + b, 0) / 3,
    mandatoryCategoriesTotal: categoryStats.reduce((s, c) => s + c.budget, 0),
    mandatorySpentTotal: categoryStats.reduce((s, c) => s + c.spent, 0),
    mandatoryOverspentTotal: categoryStats.reduce((s, c) => s + c.overspent, 0)
  })
}

// === AUTH ===
async function handleAuth(method: string, action: string | undefined, request: NextRequest) {
  if (action === 'check') {
    const settings = await db.settings.findFirst()
    return NextResponse.json({ hasPassword: !!settings?.passwordHash })
  }
  
  if (action === 'setup' && method === 'POST') {
    const { password, confirmPassword } = await request.json()
    
    if (!password || password.length < 4) {
      return NextResponse.json({ error: 'Пароль должен быть не менее 4 символов' }, { status: 400 })
    }
    
    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Пароли не совпадают' }, { status: 400 })
    }
    
    let settings = await db.settings.findFirst()
    
    if (settings?.passwordHash) {
      return NextResponse.json({ error: 'Пароль уже установлен' }, { status: 400 })
    }
    
    const passwordHash = hashPassword(password)
    
    if (settings) {
      await db.settings.update({ where: { id: settings.id }, data: { passwordHash } })
    } else {
      await db.settings.create({ data: { passwordHash } })
    }
    
    return NextResponse.json({ success: true })
  }
  
  if (action === 'login' && method === 'POST') {
    const { password } = await request.json()
    const settings = await db.settings.findFirst()
    
    if (!settings?.passwordHash) {
      return NextResponse.json({ error: 'Пароль не установлен' }, { status: 400 })
    }
    
    if (!verifyPassword(password, settings.passwordHash)) {
      return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 })
    }
    
    return NextResponse.json({ success: true })
  }
  
  if (action === 'change-password' && method === 'POST') {
    const { currentPassword, newPassword } = await request.json()
    const settings = await db.settings.findFirst()
    
    if (!settings?.passwordHash) {
      return NextResponse.json({ error: 'Пароль не установлен' }, { status: 400 })
    }
    
    if (!verifyPassword(currentPassword, settings.passwordHash)) {
      return NextResponse.json({ error: 'Неверный текущий пароль' }, { status: 401 })
    }
    
    await db.settings.update({
      where: { id: settings.id },
      data: { passwordHash: hashPassword(newPassword) }
    })
    
    return NextResponse.json({ success: true })
  }
  
  if (action === 'logout') {
    return NextResponse.json({ success: true })
  }
  
  return NextResponse.json({ error: 'Invalid auth action' }, { status: 400 })
}
