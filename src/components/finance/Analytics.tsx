'use client'

import { useState, useEffect } from 'react'
import { useFinanceStore } from '@/store/finance'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts'
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, BarChart3 } from 'lucide-react'
import { format, subMonths, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { ru } from 'date-fns/locale'

interface AnalyticsData {
  month: string
  totalIncome: number
  totalExpense: number
  balance: number
  expensesByCategory: Array<{
    category: { id: string; name: string; color: string | null }
    amount: number
  }>
  expensesByDay: Array<{
    day: number
    amount: number
  }>
  previousMonth: {
    month: string
    totalIncome: number
    totalExpense: number
  } | null
}

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#B2BABB', '#82E0AA'
]

export function Analytics() {
  const { currentMonth, setCurrentMonth, transactions } = useFinanceStore()
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const safeTransactions = Array.isArray(transactions) ? transactions : []

  // Generate month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i)
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'LLLL yyyy', { locale: ru })
    }
  })

  useEffect(() => {
    fetchAnalytics()
  }, [currentMonth])

  const fetchAnalytics = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/analytics?month=${currentMonth}&compare=true`)
      const data = await response.json()
      setAnalyticsData(data)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatMoney = (amount: number, currency: string = 'RUB') => {
    const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(safeAmount)
  }

  // Prepare pie chart data - с уникальными цветами
  const pieData = (analyticsData?.expensesByCategory || []).map((item, index) => ({
    name: item.category?.name || 'Без категории',
    value: typeof item.amount === 'number' && !isNaN(item.amount) ? item.amount : 0,
    color: item.category?.color || COLORS[index % COLORS.length]
  }))

  // Prepare bar chart data - daily expenses
  const [year, month] = currentMonth.split('-').map(Number)
  const monthStart = startOfMonth(new Date(year, month - 1))
  const monthEnd = endOfMonth(new Date(year, month - 1))
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const barData = daysInMonth.map(day => {
    const dayNum = day.getDate()
    const dayExpense = (analyticsData?.expensesByDay || []).find(d => d.day === dayNum)
    return {
      day: dayNum,
      amount: dayExpense?.amount || 0
    }
  })

  // Prepare comparison data for last 6 months
  const last6MonthsData = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i)
    const monthStr = format(date, 'yyyy-MM')

    const monthTransactions = safeTransactions.filter(t => {
      try {
        const tDate = new Date(t.date)
        return format(tDate, 'yyyy-MM') === monthStr
      } catch {
        return false
      }
    })

    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (typeof t.amount === 'number' && !isNaN(t.amount) ? t.amount : 0), 0)
    
    const expense = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (typeof t.amount === 'number' && !isNaN(t.amount) ? t.amount : 0), 0)

    return {
      month: format(date, 'LLL', { locale: ru }),
      fullMonth: monthStr,
      income,
      expense
    }
  })

  // Calculate percentage changes
  const totalIncome = analyticsData?.totalIncome || 0
  const totalExpense = analyticsData?.totalExpense || 0
  const prevIncome = analyticsData?.previousMonth?.totalIncome || 0
  const prevExpense = analyticsData?.previousMonth?.totalExpense || 0

  const incomeChange = prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : 0
  const expenseChange = prevExpense > 0 ? ((totalExpense - prevExpense) / prevExpense) * 100 : 0

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">Загрузка аналитики...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Аналитика</h2>
        <Select value={currentMonth} onValueChange={setCurrentMonth}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Выберите месяц" />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Доходы</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatMoney(totalIncome)}
            </div>
            {analyticsData?.previousMonth && (
              <p className={`text-xs flex items-center gap-1 ${incomeChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {incomeChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(incomeChange).toFixed(1)}% vs прошлый месяц
              </p>
            )}
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
            {analyticsData?.previousMonth && (
              <p className={`text-xs flex items-center gap-1 ${expenseChange <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {expenseChange <= 0 ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                {Math.abs(expenseChange).toFixed(1)}% vs прошлый месяц
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Баланс</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(analyticsData?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatMoney(analyticsData?.balance || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              За {format(new Date(year, month - 1), 'LLLL yyyy', { locale: ru })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="pie" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pie">По категориям</TabsTrigger>
          <TabsTrigger value="bar">По дням</TabsTrigger>
          <TabsTrigger value="trend">Динамика</TabsTrigger>
        </TabsList>

        <TabsContent value="pie">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Расходы по категориям</CardTitle>
                <CardDescription>Распределение расходов за месяц</CardDescription>
              </CardHeader>
              <CardContent>
                {pieData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">
                    Нет данных о расходах за этот период
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatMoney(value)}
                      />
                      <Legend
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        formatter={(value) => <span className="text-xs">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Детализация по категориям</CardTitle>
                <CardDescription>Суммы расходов по каждой категории</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(analyticsData?.expensesByCategory || [])
                    .sort((a, b) => (b.amount || 0) - (a.amount || 0))
                    .map((item, index) => (
                      <div key={item.category?.id || index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.category?.color || COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm truncate max-w-[150px]">{item.category?.name || 'Без категории'}</span>
                        </div>
                        <span className="text-sm font-medium">{formatMoney(item.amount || 0)}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bar">
          <Card>
            <CardHeader>
              <CardTitle>Расходы по дням</CardTitle>
              <CardDescription>Ежедневные расходы за месяц</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={2} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value: number) => formatMoney(value)} />
                  <Bar dataKey="amount" fill="#FF6B6B" name="Расходы" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trend">
          <Card>
            <CardHeader>
              <CardTitle>Динамика за 6 месяцев</CardTitle>
              <CardDescription>Сравнение доходов и расходов</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={last6MonthsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value: number) => formatMoney(value)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="#22c55e"
                    name="Доходы"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    stroke="#ef4444"
                    name="Расходы"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
