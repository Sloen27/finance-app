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
      }
    } catch (error) {
      console.error('Error saving income:', error)
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

  return (
    <Card className="col-span-full lg:col-span-2">
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
          <>
            {/* Main Budget Display */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Planned Income */}
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                <div className="text-sm text-muted-foreground">Доход</div>
                <div className="text-xl font-bold text-green-600">
                  {formatMoney(plannedIncome)}
                </div>
                {monthlyIncome?.isFromPrevious && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Из предыдущего месяца
                  </div>
                )}
              </div>

              {/* Mandatory Budget */}
              <HoverCard>
                <HoverCardTrigger asChild>
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 cursor-pointer">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      Обязательные
                      <Info className="h-3 w-3" />
                    </div>
                    <div className="text-xl font-bold text-blue-600">
                      {formatMoney(mandatoryTotal)}
                    </div>
                    <Progress
                      value={mandatoryProgress}
                      className="mt-2 h-1.5"
                    />
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
                          Нет обязательных категорий с бюджетом
                        </p>
                      )}
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>

              {/* Other Expenses */}
              <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30">
                <div className="text-sm text-muted-foreground">Другие расходы</div>
                <div className="text-xl font-bold text-orange-600">
                  {formatMoney(otherExpenses + mandatoryOverspent)}
                </div>
                {mandatoryOverspent > 0 && (
                  <div className="text-xs text-red-500 mt-1">
                    Перерасход: {formatMoney(mandatoryOverspent)}
                  </div>
                )}
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
                <Progress
                  value={remainingPercent}
                  className={`mt-2 h-1.5 ${remainingPercent < 20 ? '[&>div]:bg-red-500' : ''}`}
                />
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
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

              {/* Formula explanation */}
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                  <span>Доход: <strong>{formatMoney(plannedIncome)}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowDownRight className="h-4 w-4 text-blue-500" />
                  <span>
                    Обязательные расходы: <strong>-{formatMoney(mandatoryTotal)}</strong>
                    {mandatorySpent > 0 && (
                      <span className="text-muted-foreground ml-1">
                        (потрачено: {formatMoney(mandatorySpent)})
                      </span>
                    )}
                  </span>
                </div>
                {mandatoryOverspent > 0 && (
                  <div className="flex items-center gap-2 text-red-600">
                    <TrendingDown className="h-4 w-4" />
                    <span>
                      Перерасход обязательных: <strong>-{formatMoney(mandatoryOverspent)}</strong>
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <ArrowDownRight className="h-4 w-4 text-orange-500" />
                  <span>Другие расходы: <strong>-{formatMoney(otherExpenses)}</strong></span>
                </div>
                <div className="border-t pt-2 mt-2 flex items-center gap-2 font-semibold">
                  <Wallet className="h-4 w-4" />
                  <span>Итого осталось: {formatMoney(actualRemaining)}</span>
                </div>
              </div>
            </div>

            {/* Mandatory Categories Detail */}
            {categoryStats.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3">По обязательным категориям</h4>
                <div className="space-y-3">
                  {categoryStats.map((cat) => {
                    const progress = cat.budget > 0 ? (cat.spent / cat.budget) * 100 : 0
                    const isOverBudget = cat.spent > cat.budget

                    return (
                      <div key={cat.id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: cat.color || '#888' }}
                            />
                            <span>{cat.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={isOverBudget ? 'text-red-600 font-medium' : ''}>
                              {formatMoney(cat.spent)}
                            </span>
                            <span className="text-muted-foreground">
                              / {formatMoney(cat.budget)}
                            </span>
                            {isOverBudget && (
                              <Badge variant="destructive" className="text-xs">
                                +{formatMoney(cat.overspent)}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Progress
                          value={Math.min(progress, 100)}
                          className={`h-1.5 ${isOverBudget ? '[&>div]:bg-red-500' : progress > 80 ? '[&>div]:bg-yellow-500' : ''}`}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
