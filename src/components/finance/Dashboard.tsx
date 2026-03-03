'use client'

import { useFinanceStore } from '@/store/finance'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Wallet, Calendar, ArrowUpRight, ArrowDownRight, PiggyBank, Target, Shield, AlertTriangle, ShoppingCart, Sparkles, BarChart3, Coins, Info, Calculator } from 'lucide-react'
import { format, isAfter, isBefore, startOfMonth, endOfMonth, differenceInDays, subMonths, getDaysInMonth } from 'date-fns'
import { ru } from 'date-fns/locale'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'

export function Dashboard() {
  const { transactions, budgets, regularPayments, currentMonth, categories, settings, accounts, goals } = useFinanceStore()

  // Filter transactions for current month
  const [year, month] = currentMonth.split('-').map(Number)
  const monthStart = startOfMonth(new Date(year, month - 1))
  const monthEnd = endOfMonth(new Date(year, month - 1))
  const today = new Date()

  const safeTransactions = transactions || []
  const safeBudgets = budgets || []
  const safeRegularPayments = regularPayments || []
  const safeCategories = categories || []
  const safeAccounts = accounts || []
  const safeGoals = goals || []

  const monthTransactions = safeTransactions.filter(t => {
    const date = new Date(t.date)
    return !isBefore(date, monthStart) && !isAfter(date, monthEnd)
  })

  // Calculate totals
  const totalIncome = monthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  const totalExpense = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  const balance = totalIncome - totalExpense

  // Calculate expenses by type (for financial cushion)
  const mandatoryExpenses = monthTransactions
    .filter(t => t.type === 'expense' && t.category?.expenseType === 'mandatory')
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  const variableExpenses = monthTransactions
    .filter(t => t.type === 'expense' && t.category?.expenseType === 'variable')
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  const discretionaryExpenses = monthTransactions
    .filter(t => t.type === 'expense' && t.category?.expenseType === 'discretionary')
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  // Expenses by category for pie chart
  const expensesByCategory = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const catId = t.categoryId
      const catName = t.category?.name || 'Другое'
      const catColor = t.category?.color || '#B2BABB'
      if (!acc[catId]) {
        acc[catId] = { name: catName, value: 0, color: catColor }
      }
      acc[catId].value += t.amount || 0
      return acc
    }, {} as Record<string, { name: string; value: number; color: string }>)

  const expenseStructure = Object.values(expensesByCategory)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8) // Top 8 categories

  // Forecast calculation
  const daysInMonth = differenceInDays(monthEnd, monthStart) + 1
  const daysPassed = Math.max(differenceInDays(today, monthStart) + 1, 1)
  const daysRemaining = Math.max(differenceInDays(monthEnd, today), 0)
  const dailyAverage = totalExpense / daysPassed
  const projectedExpense = dailyAverage * daysInMonth
  const projectedBalance = totalIncome - projectedExpense

  // Get active regular payments due this month
  const activePayments = safeRegularPayments.filter(p => p.isActive)
  const upcomingPayments = activePayments.filter(p => {
    if (p.period === 'monthly' && p.dueDate) {
      const dueDate = new Date(year, month - 1, p.dueDate)
      return isAfter(dueDate, today) || p.dueDate >= today.getDate()
    }
    return false
  }).slice(0, 5)

  // Calculate budget progress
  const monthBudgets = safeBudgets.filter(b => b.month === currentMonth)
  const budgetProgress = monthBudgets.map(budget => {
    const spent = monthTransactions
      .filter(t => t.type === 'expense' && t.categoryId === budget.categoryId)
      .reduce((sum, t) => sum + (t.amount || 0), 0)
    return {
      ...budget,
      spent,
      progress: budget.amount > 0 ? Math.min((spent / budget.amount) * 100, 100) : 0
    }
  })

  // Financial cushion calculation
  const totalSavings = safeAccounts.filter(a => a.type === 'savings').reduce((sum, a) => sum + (a.balance || 0), 0)
  const mainBalance = safeAccounts.filter(a => a.type === 'main').reduce((sum, a) => sum + (a.balance || 0), 0)
  const totalBalance = safeAccounts.reduce((sum, a) => sum + (a.balance || 0), 0)
  const totalInvestments = safeAccounts.filter(a => a.type === 'investment').reduce((sum, a) => sum + (a.balance || 0), 0)

  // Calculate average mandatory expenses over last 3 months for more accurate cushion
  const last3MonthsMandatory = Array.from({ length: 3 }, (_, i) => {
    const date = subMonths(new Date(), i)
    const monthStr = format(date, 'yyyy-MM')
    const monthTx = safeTransactions.filter(t => {
      const txDate = new Date(t.date)
      return format(txDate, 'yyyy-MM') === monthStr && t.type === 'expense' && t.category?.expenseType === 'mandatory'
    })
    return monthTx.reduce((sum, t) => sum + (t.amount || 0), 0)
  })
  const avgMonthlyMandatory = last3MonthsMandatory.reduce((sum, m) => sum + m, 0) / 3
  const currentMonthMandatory = mandatoryExpenses || 1
  
  // Use average if we have data, otherwise use current month
  const effectiveMandatoryExpenses = avgMonthlyMandatory > 0 ? avgMonthlyMandatory : currentMonthMandatory
  const financialCushionMonths = effectiveMandatoryExpenses > 0 
    ? (totalSavings + mainBalance) / effectiveMandatoryExpenses 
    : 0

  // Calculate upcoming regular payments amount until end of month
  const upcomingPaymentsTotal = activePayments
    .filter(p => p.period === 'monthly' && p.dueDate && p.dueDate >= today.getDate())
    .reduce((sum, p) => sum + (p.amount || 0), 0)

  // Month end forecast with detailed calculation
  const monthEndForecast = totalBalance - upcomingPaymentsTotal + totalIncome - totalExpense

  // Detailed forecast breakdown
  const forecastDetails = {
    currentBalance: totalBalance,
    monthIncome: totalIncome,
    monthExpense: totalExpense,
    upcomingPayments: upcomingPaymentsTotal,
    daysRemaining,
    daysPassed,
    daysInMonth,
    dailyAverage,
    projectedExpense,
    projectedBalance,
    monthEndForecast
  }

  // Detailed cushion breakdown
  const cushionDetails = {
    totalSavings,
    mainBalance,
    availableFunds: totalSavings + mainBalance,
    mandatoryExpenses,
    avgMonthlyMandatory,
    currentMonthMandatory,
    effectiveMandatoryExpenses,
    financialCushionMonths,
    formula: `${formatMoney(totalSavings + mainBalance)} ÷ ${formatMoney(effectiveMandatoryExpenses)} = ${financialCushionMonths.toFixed(1)} мес.`
  }

  // Cash flow for last 6 months
  const cashFlowData = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i)
    const monthStr = format(date, 'yyyy-MM')
    const monthTx = safeTransactions.filter(t => format(new Date(t.date), 'yyyy-MM') === monthStr)
    const income = monthTx.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0)
    const expense = monthTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0)
    return {
      month: format(date, 'LLL', { locale: ru }),
      income,
      expense,
      flow: income - expense
    }
  })

  // Goals progress
  const totalGoalTarget = safeGoals.filter(g => !g.isCompleted).reduce((sum, g) => sum + (g.targetAmount || 0), 0)
  const totalGoalSaved = safeGoals.filter(g => !g.isCompleted).reduce((sum, g) => sum + (g.currentAmount || 0), 0)

  const formatMoney = (amount: number, currency: string = 'RUB') => {
    if (amount === null || amount === undefined || isNaN(amount) || !isFinite(amount)) {
      return '0 ₽'
    }
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const recentTransactions = monthTransactions.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Main Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Баланс</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatMoney(balance)}
            </div>
            <p className="text-xs text-muted-foreground">
              За {format(monthStart, 'LLLL yyyy', { locale: ru })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Доходы</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatMoney(totalIncome)}
            </div>
            <p className="text-xs text-muted-foreground">
              {monthTransactions.filter(t => t.type === 'income').length} операций
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Расходы</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatMoney(totalExpense)}
            </div>
            <p className="text-xs text-muted-foreground">
              {monthTransactions.filter(t => t.type === 'expense').length} операций
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Бюджеты</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {budgetProgress.filter(b => b.progress < 100).length}/{budgetProgress.length}
            </div>
            <p className="text-xs text-muted-foreground">
              В рамках бюджета
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Financial Accounts Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer">
          <HoverCard>
            <HoverCardTrigger asChild>
              <div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-1">
                    Всего средств
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </CardTitle>
                  <Coins className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{formatMoney(totalBalance)}</div>
                </CardContent>
              </div>
            </HoverCardTrigger>
            <HoverCardContent className="w-96">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">Детальный расчёт</h4>
                </div>
                
                <div className="space-y-3">
                  {/* Account Breakdown */}
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-sm font-medium mb-2">Структура средств</p>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Основные счета</span>
                        <span className="font-medium">{formatMoney(mainBalance)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Накопления</span>
                        <span className="font-medium text-green-600">{formatMoney(totalSavings)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Инвестиции</span>
                        <span className="font-medium text-blue-600">{formatMoney(totalInvestments)}</span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t font-semibold">
                        <span>Итого</span>
                        <span>{formatMoney(totalBalance)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Cushion with Formula */}
                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium">Финансовая подушка</p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Запас на</span>
                        <span className="font-bold text-lg">{isFinite(cushionDetails.financialCushionMonths) ? cushionDetails.financialCushionMonths.toFixed(1) : '0'} мес.</span>
                      </div>
                      <Progress value={Math.min(cushionDetails.financialCushionMonths * 20, 100)} className="h-2" />
                      
                      {/* Formula */}
                      <div className="mt-3 p-2 rounded bg-muted/50 text-xs">
                        <p className="text-muted-foreground mb-1">Формула расчёта:</p>
                        <p className="font-mono">
                          ({formatMoney(cushionDetails.totalSavings)} + {formatMoney(cushionDetails.mainBalance)}) ÷ {formatMoney(cushionDetails.effectiveMandatoryExpenses)}
                        </p>
                        <p className="font-mono font-semibold mt-1">
                          = {cushionDetails.financialCushionMonths.toFixed(1)} месяцев
                        </p>
                      </div>

                      {/* Details */}
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>• Доступные средства: {formatMoney(cushionDetails.availableFunds)}</p>
                        <p>• Ср. обязательные расходы: {formatMoney(cushionDetails.effectiveMandatoryExpenses)}/мес</p>
                        {cushionDetails.avgMonthlyMandatory > 0 && (
                          <p className="text-xs">• Среднее за 3 месяца</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Month End Forecast */}
                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">Прогноз на конец месяца</p>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      {/* Formula */}
                      <div className="p-2 rounded bg-muted/50 text-xs">
                        <p className="text-muted-foreground mb-1">Формула:</p>
                        <p className="font-mono">
                          {formatMoney(forecastDetails.currentBalance)}
                          {' '}- {formatMoney(forecastDetails.upcomingPayments)}
                          {' '}+ {formatMoney(forecastDetails.monthIncome)}
                          {' '}- {formatMoney(forecastDetails.monthExpense)}
                        </p>
                        <p className="font-mono font-semibold mt-1">
                          = {formatMoney(forecastDetails.monthEndForecast)}
                        </p>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Текущий баланс</span>
                        <span>{formatMoney(forecastDetails.currentBalance)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Доходы за месяц</span>
                        <span className="text-green-600">+{formatMoney(forecastDetails.monthIncome)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Расходы за месяц</span>
                        <span className="text-red-600">-{formatMoney(forecastDetails.monthExpense)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ожидаемые платежи</span>
                        <span className="text-red-600">-{formatMoney(forecastDetails.upcomingPayments)}</span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t font-semibold">
                        <span>Прогноз</span>
                        <span className={forecastDetails.monthEndForecast >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatMoney(forecastDetails.monthEndForecast)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Накопления</CardTitle>
            <PiggyBank className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-600">{formatMoney(totalSavings)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Инвестиции</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-600">{formatMoney(totalInvestments)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Цели</CardTitle>
            <Target className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-purple-600">{formatMoney(totalGoalSaved)}</div>
            <Progress value={totalGoalTarget > 0 ? (totalGoalSaved / totalGoalTarget) * 100 : 0} className="mt-2 h-1" />
          </CardContent>
        </Card>
      </div>

      {/* Expense Structure & Forecast */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Expense Structure */}
        <Card>
          <CardHeader>
            <CardTitle>Структура расходов</CardTitle>
            <CardDescription>Распределение по категориям</CardDescription>
          </CardHeader>
          <CardContent>
            {expenseStructure.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Нет данных о расходах</p>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-[150px] h-[150px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseStructure}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        dataKey="value"
                      >
                        {expenseStructure.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatMoney(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {expenseStructure.map(item => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm truncate max-w-[100px]">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium">{formatMoney(item.value)}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {totalExpense > 0 ? Math.round((item.value / totalExpense) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Forecast & Cushion */}
        <Card>
          <CardHeader>
            <CardTitle>Прогноз и безопасность</CardTitle>
            <CardDescription>Анализ до конца месяца</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Forecast */}
            <HoverCard>
              <HoverCardTrigger asChild>
                <div className="p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium flex items-center gap-1">
                      Прогноз на конец месяца
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </span>
                    <Badge variant={projectedBalance >= 0 ? 'default' : 'destructive'}>
                      {projectedBalance >= 0 ? 'Профицит' : 'Дефицит'}
                    </Badge>
                  </div>
                  <div className={`text-xl font-bold ${projectedBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatMoney(projectedBalance)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Дней до конца: {daysRemaining} • Средний расход: {formatMoney(dailyAverage)}/день
                  </p>
                </div>
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    <h4 className="font-semibold text-sm">Детали прогноза</h4>
                  </div>
                  
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Дней в месяце</span>
                      <span>{forecastDetails.daysInMonth}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Дней прошло</span>
                      <span>{forecastDetails.daysPassed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Дней осталось</span>
                      <span>{forecastDetails.daysRemaining}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Средний расход/день</span>
                      <span>{formatMoney(forecastDetails.dailyAverage)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Прогноз расходов</span>
                      <span className="text-red-600">{formatMoney(forecastDetails.projectedExpense)}</span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t font-semibold">
                      <span>Прогноз баланса</span>
                      <span className={forecastDetails.projectedBalance >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatMoney(forecastDetails.projectedBalance)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-2 rounded bg-muted text-xs">
                    <p className="text-muted-foreground">Формула:</p>
                    <p className="font-mono">{formatMoney(totalIncome)} - {formatMoney(forecastDetails.projectedExpense)}</p>
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>

            {/* Financial Cushion */}
            <HoverCard>
              <HoverCardTrigger asChild>
                <div className="p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Финансовая подушка
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold">
                      {isFinite(financialCushionMonths) ? financialCushionMonths.toFixed(1) : '0'}
                    </span>
                    <span className="text-muted-foreground">месяцев</span>
                  </div>
                  <Progress value={Math.min(financialCushionMonths * 20, 100)} className="mt-2 h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {financialCushionMonths >= 6 ? 'Отличный запас!' : financialCushionMonths >= 3 ? 'Хороший уровень' : 'Рекомендуется увеличить'}
                  </p>
                </div>
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <h4 className="font-semibold text-sm">Расчёт подушки безопасности</h4>
                  </div>
                  
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Накопления</span>
                      <span className="text-green-600">{formatMoney(cushionDetails.totalSavings)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Основные счета</span>
                      <span>{formatMoney(cushionDetails.mainBalance)}</span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t">
                      <span className="text-muted-foreground">Доступно</span>
                      <span className="font-semibold">{formatMoney(cushionDetails.availableFunds)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Обязательные расходы/мес</span>
                      <span className="text-red-600">{formatMoney(cushionDetails.effectiveMandatoryExpenses)}</span>
                    </div>
                  </div>
                  
                  <div className="p-2 rounded bg-muted text-xs">
                    <p className="text-muted-foreground mb-1">Формула:</p>
                    <p className="font-mono">{cushionDetails.formula}</p>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    <p>Рекомендуется иметь запас на 3-6 месяцев</p>
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Денежный поток
          </CardTitle>
          <CardDescription>Динамика за последние 6 месяцев</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => formatMoney(value)} />
              <Legend />
              <Bar dataKey="income" name="Доходы" fill="#22c55e" />
              <Bar dataKey="expense" name="Расходы" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Последние операции</CardTitle>
            <CardDescription>Ваши последние транзакции за месяц</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Нет транзакций за выбранный период
                </p>
              ) : (
                recentTransactions.map(transaction => (
                  <div key={transaction.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {transaction.type === 'income'
                          ? <ArrowUpRight className="h-4 w-4 text-green-600" />
                          : <ArrowDownRight className="h-4 w-4 text-red-600" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-medium">{transaction.category?.name || 'Категория'}</p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.comment || format(new Date(transaction.date), 'd MMM', { locale: ru })}
                        </p>
                      </div>
                    </div>
                    <div className={`text-sm font-medium ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatMoney(transaction.amount, transaction.currency)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Payments */}
        <Card>
          <CardHeader>
            <CardTitle>Предстоящие платежи</CardTitle>
            <CardDescription>Регулярные платежи этого месяца</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Нет предстоящих платежей
                </p>
              ) : (
                upcomingPayments.map(payment => (
                  <div key={payment.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-blue-100">
                        <Calendar className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{payment.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {payment.dueDate} число • {payment.category?.name || 'Категория'}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {formatMoney(payment.amount, payment.currency)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Progress */}
      {budgetProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Прогресс бюджета</CardTitle>
            <CardDescription>Расходы по категориям в этом месяце</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {budgetProgress.map(budget => (
                <div key={budget.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{budget.category?.name || 'Категория'}</span>
                    <span className={budget.progress >= 100 ? 'text-red-600' : 'text-muted-foreground'}>
                      {formatMoney(budget.spent, budget.currency)} / {formatMoney(budget.amount, budget.currency)}
                    </span>
                  </div>
                  <Progress
                    value={budget.progress}
                    className={`h-2 ${budget.progress >= 100 ? '[&>div]:bg-red-500' : budget.progress >= 80 ? '[&>div]:bg-yellow-500' : ''}`}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
