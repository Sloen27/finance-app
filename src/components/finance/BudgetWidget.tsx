'use client'

import { useState } from 'react'
import { useFinanceStore } from '@/store/finance'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger
} from '@/components/ui/hover-card'
import {
  Wallet,
  Edit3,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Info,
  PiggyBank,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

export function BudgetWidget() {
  const { monthlyIncome, budgetStats, setMonthlyIncome, setBudgetStats, currentMonth } = useFinanceStore()

  const [isEditingIncome, setIsEditingIncome] = useState(false)
  const [incomeAmount, setIncomeAmount] = useState(monthlyIncome?.amount?.toString() || '')
  const [isLoading, setIsLoading] = useState(false)

  const handleSaveIncome = async () => {
    const amount = parseFloat(incomeAmount)
    if (isNaN(amount) || amount < 0) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          month: currentMonth,
          isRecurring: true
        })
      })

      if (response.ok) {
        const data = await response.json()
        setMonthlyIncome(data)

        // Refresh budget stats
        const statsResponse = await fetch(`/api/budget-stats?month=${currentMonth}`)
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setBudgetStats(statsData)
        }
      } else {
        const error = await response.json()
        console.error('Error saving income:', error)
        alert('Ошибка при сохранении: ' + (error.details || error.error || 'Неизвестная ошибка'))
      }
    } catch (error) {
      console.error('Error saving income:', error)
      alert('Ошибка при сохранении дохода')
    } finally {
      setIsLoading(false)
      setIsEditingIncome(false)
    }
  }

  const formatMoney = (amount: number, currency: string = 'RUB') => {
    if (amount === null || amount === undefined || isNaN(amount) || !isFinite(amount)) {
      return '0 ₽'
    }
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const plannedIncome = monthlyIncome?.amount || 0
  const mandatoryTotal = budgetStats?.mandatoryBudgetTotal || 0
  const mandatorySpent = budgetStats?.mandatorySpent || 0
  const mandatoryOverspent = budgetStats?.mandatoryOverspent || 0
  const otherExpenses = budgetStats?.otherExpenses || 0
  const actualRemaining = budgetStats?.actualRemaining || 0
  const categoryStats = budgetStats?.categoryStats || []

  // Calculate percentage of income remaining
  const remainingPercent = plannedIncome > 0
    ? Math.max(0, Math.min(100, (actualRemaining / plannedIncome) * 100))
    : 0

  // Calculate mandatory budget progress
  const mandatoryProgress = mandatoryTotal > 0
    ? Math.min(100, (mandatorySpent / mandatoryTotal) * 100)
    : 0

  // Data for pie chart
  const pieData = [
    { name: 'Обязательные', value: mandatoryTotal, color: '#3b82f6' },
    { name: 'Потрачено др.', value: otherExpenses + mandatoryOverspent, color: '#f97316' },
    { name: 'Осталось', value: Math.max(0, actualRemaining), color: '#22c55e' }
  ].filter(d => d.value > 0)

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Бюджет на месяц
            </CardTitle>
            <CardDescription>
              {format(new Date(currentMonth + '-01'), 'LLLL yyyy', { locale: ru })}
            </CardDescription>
          </div>

          {/* Edit Income Dialog */}
          <Dialog open={isEditingIncome} onOpenChange={setIsEditingIncome}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Edit3 className="h-4 w-4" />
                Доход
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ежемесячный доход</DialogTitle>
                <DialogDescription>
                  Введите ваш запланированный доход на этот месяц
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  type="number"
                  placeholder="Сумма дохода"
                  value={incomeAmount}
                  onChange={(e) => setIncomeAmount(e.target.value)}
                  className="text-lg"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Эта сумма будет автоматически переноситься на следующие месяцы
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditingIncome(false)}>
                  Отмена
                </Button>
                <Button onClick={handleSaveIncome} disabled={isLoading}>
                  {isLoading ? 'Сохранение...' : 'Сохранить'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {plannedIncome === 0 ? (
          <div className="text-center py-8">
            <PiggyBank className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Укажите ваш ежемесячный доход, чтобы видеть бюджет
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setIncomeAmount('')
                setIsEditingIncome(true)
              }}
            >
              Указать доход
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left side - Chart */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-full max-w-[250px] h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatMoney(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-4 justify-center">
                {pieData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right side - Details */}
            <div className="space-y-4">
              {/* Main Stats */}
              <div className="grid grid-cols-2 gap-3">
                {/* Planned Income */}
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                  <div className="text-sm text-muted-foreground">Доход</div>
                  <div className="text-xl font-bold text-green-600">
                    {formatMoney(plannedIncome)}
                  </div>
                </div>

                {/* Remaining */}
                <div className={`p-3 rounded-lg ${
                  actualRemaining >= 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/30'
                    : 'bg-red-50 dark:bg-red-950/30'
                }`}>
                  <div className="text-sm text-muted-foreground">Осталось</div>
                  <div className={`text-xl font-bold ${
                    actualRemaining >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {formatMoney(actualRemaining)}
                  </div>
                </div>
              </div>

              {/* Mandatory Budget */}
              <HoverCard>
                <HoverCardTrigger asChild>
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 cursor-pointer">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        Обязательные расходы
                        <Info className="h-3 w-3" />
                      </div>
                      <span className="text-sm font-medium">
                        {mandatorySpent > 0 ? `${formatMoney(mandatorySpent)} / ` : ''}{formatMoney(mandatoryTotal)}
                      </span>
                    </div>
                    <Progress value={mandatoryProgress} className="h-2" />
                    {mandatoryOverspent > 0 && (
                      <div className="text-xs text-red-500 mt-1">
                        Перерасход: {formatMoney(mandatoryOverspent)}
                      </div>
                    )}
                  </div>
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-3">
                    <h4 className="font-semibold">Обязательные расходы</h4>
                    <div className="space-y-2 text-sm">
                      {categoryStats.length > 0 ? (
                        categoryStats.map((cat) => (
                          <div key={cat.id} className="flex justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: cat.color || '#888' }}
                              />
                              <span>{cat.name}</span>
                            </div>
                            <div className="text-right">
                              <span className={cat.overspent > 0 ? 'text-red-600' : ''}>
                                {formatMoney(cat.spent)}
                              </span>
                              <span className="text-muted-foreground">
                                {' / '}{formatMoney(cat.budget)}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground">
                          Нет обязательных категорий с бюджетом. Добавьте категории и установите им бюджет.
                        </p>
                      )}
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>

              {/* Other Expenses */}
              <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Другие расходы</div>
                  <div className="text-lg font-bold text-orange-600">
                    {formatMoney(otherExpenses + mandatoryOverspent)}
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                {actualRemaining >= 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm font-medium">
                  {actualRemaining >= 0
                    ? 'Бюджет в порядке'
                    : 'Превышение бюджета'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Mandatory Categories Detail */}
        {plannedIncome > 0 && categoryStats.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">По обязательным категориям</h4>
            <div className="grid gap-3 md:grid-cols-2">
              {categoryStats.map((cat) => {
                const progress = cat.budget > 0 ? (cat.spent / cat.budget) * 100 : 0
                const isOverBudget = cat.spent > cat.budget

                return (
                  <div key={cat.id} className="p-3 rounded-lg border space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color || '#888' }}
                        />
                        <span className="font-medium">{cat.name}</span>
                      </div>
                      {isOverBudget && (
                        <Badge variant="destructive" className="text-xs">
                          +{formatMoney(cat.overspent)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className={isOverBudget ? 'text-red-600 font-medium' : ''}>
                        {formatMoney(cat.spent)}
                      </span>
                      <span className="text-muted-foreground">
                        из {formatMoney(cat.budget)}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(progress, 100)}
                      className={`h-2 ${isOverBudget ? '[&>div]:bg-red-500' : progress > 80 ? '[&>div]:bg-yellow-500' : ''}`}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
