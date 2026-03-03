'use client'

import { useState } from 'react'
import { useFinanceStore } from '@/store/finance'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, TrendingUp, Trash2, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react'

interface InvestmentFormData {
  type: string
  amount: string
  description: string
  date: string
}

const INVESTMENT_TYPES = [
  { value: 'deposit', label: 'Пополнение', icon: ArrowUpRight, color: 'text-green-600' },
  { value: 'withdraw', label: 'Вывод', icon: ArrowDownRight, color: 'text-red-600' },
  { value: 'adjustment', label: 'Корректировка курса', icon: RefreshCw, color: 'text-blue-600' }
]

const initialFormData: InvestmentFormData = {
  type: 'deposit',
  amount: '',
  description: '',
  date: new Date().toISOString().split('T')[0]
}

export function Investments() {
  const { investments, addInvestment, removeInvestment } = useFinanceStore()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState<InvestmentFormData>(initialFormData)

  const safeInvestments = Array.isArray(investments) ? investments : []

  // Calculate portfolio value
  const calculatePortfolioValue = () => {
    // Find the most recent adjustment
    const sortedInvestments = [...safeInvestments].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    
    const lastAdjustmentIndex = sortedInvestments.findIndex(i => i.type === 'adjustment')
    
    if (lastAdjustmentIndex !== -1) {
      // Take the most recent adjustment as base
      const adjustment = sortedInvestments[lastAdjustmentIndex]
      let portfolioValue = typeof adjustment.amount === 'number' ? adjustment.amount : 0
      
      // Add all deposits/withdraws that happened AFTER the adjustment
      for (let i = lastAdjustmentIndex - 1; i >= 0; i--) {
        const inv = sortedInvestments[i]
        const amount = typeof inv.amount === 'number' ? inv.amount : 0
        if (inv.type === 'deposit') {
          portfolioValue += amount
        } else if (inv.type === 'withdraw') {
          portfolioValue -= amount
        }
      }
      return portfolioValue
    }
    
    // No adjustment found, calculate normally
    return safeInvestments.reduce((sum, i) => {
      const amount = typeof i.amount === 'number' && !isNaN(i.amount) ? i.amount : 0
      return sum + (i.type === 'deposit' ? amount : -amount)
    }, 0)
  }

  const totalPortfolio = calculatePortfolioValue()

  const deposits = safeInvestments.filter(i => i.type === 'deposit').reduce((sum, i) => {
    const amount = typeof i.amount === 'number' && !isNaN(i.amount) ? i.amount : 0
    return sum + amount
  }, 0)

  const withdraws = safeInvestments.filter(i => i.type === 'withdraw').reduce((sum, i) => {
    const amount = typeof i.amount === 'number' && !isNaN(i.amount) ? i.amount : 0
    return sum + amount
  }, 0)

  // Calculate profit/loss
  const profitLoss = totalPortfolio - deposits + withdraws
  const profitPercent = deposits > 0 ? (profitLoss / deposits) * 100 : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.amount) return

    try {
      const response = await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formData.type,
          amount: parseFloat(formData.amount) || 0,
          description: formData.description || null,
          date: formData.date || new Date().toISOString().split('T')[0]
        })
      })
      const data = await response.json()
      addInvestment(data)

      setIsDialogOpen(false)
      setFormData(initialFormData)
    } catch (error) {
      console.error('Error saving investment:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить эту операцию?')) return
    try {
      await fetch(`/api/investments/${id}`, { method: 'DELETE' })
      removeInvestment(id)
    } catch (error) {
      console.error('Error deleting investment:', error)
    }
  }

  const formatMoney = (amount: number, currency: string = 'RUB') => {
    const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(safeAmount)
  }

  const formatDate = (date: Date | string) => {
    try {
      if (!date) return 'Дата не указана'
      
      let d: Date
      if (typeof date === 'string') {
        // Handle ISO string format from API
        d = new Date(date)
      } else {
        d = date
      }
      
      if (isNaN(d.getTime())) {
        return 'Дата не указана'
      }
      
      return d.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    } catch {
      return 'Дата не указана'
    }
  }

  const getInvestmentIcon = (type: string) => {
    const found = INVESTMENT_TYPES.find(t => t.value === type)
    if (!found) return <RefreshCw className="h-4 w-4" />
    const Icon = found.icon
    return <Icon className={`h-4 w-4 ${found.color}`} />
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Инвестиционный портфель</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(totalPortfolio)}</div>
            <p className="text-sm text-muted-foreground">текущая стоимость</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Внесено</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+{formatMoney(deposits)}</div>
            <p className="text-sm text-muted-foreground">всего пополнений</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Выведено</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">-{formatMoney(withdraws)}</div>
            <p className="text-sm text-muted-foreground">всего выводов</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Прибыль/Убыток</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {profitLoss >= 0 ? '+' : ''}{formatMoney(profitLoss)}
            </div>
            <p className="text-sm text-muted-foreground">
              {profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Investment Operations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>История операций</CardTitle>
              <CardDescription>
                Пополнения, выводы и корректировки стоимости портфеля
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setFormData(initialFormData)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Операция
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Новая операция</DialogTitle>
                  <DialogDescription>
                    Внесите информацию об операции с инвестициями
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Тип операции</Label>
                    <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INVESTMENT_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className={`h-4 w-4 ${type.color}`} />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.type === 'adjustment' && (
                      <p className="text-xs text-muted-foreground">
                        Корректировка устанавливает новую стоимость портфеля. Используйте при изменении курса акций или стоимости активов.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Сумма</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Дата</Label>
                      <Input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Описание (опционально)</Label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Комментарий к операции"
                    />
                  </div>

                  <DialogFooter>
                    <Button type="submit">Добавить</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-2">
            {safeInvestments.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">Нет операций</p>
              </div>
            ) : (
              <div className="space-y-2">
                {safeInvestments.map(investment => {
                  const amount = typeof investment.amount === 'number' && !isNaN(investment.amount) ? investment.amount : 0
                  return (
                    <div key={investment.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          investment.type === 'deposit' ? 'bg-green-100 dark:bg-green-900/30' :
                            investment.type === 'withdraw' ? 'bg-red-100 dark:bg-red-900/30' :
                              'bg-blue-100 dark:bg-blue-900/30'
                        }`}>
                          {getInvestmentIcon(investment.type)}
                        </div>
                        <div>
                          <p className="font-medium">
                            {INVESTMENT_TYPES.find(t => t.value === investment.type)?.label}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatDate(investment.date)}</span>
                            {investment.description && (
                              <>
                                <span>•</span>
                                <span>{investment.description}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`font-semibold ${
                          investment.type === 'deposit' ? 'text-green-600' :
                            investment.type === 'withdraw' ? 'text-red-600' :
                              'text-blue-600'
                        }`}>
                          {investment.type === 'deposit' ? '+' : investment.type === 'withdraw' ? '-' : '='}
                          {formatMoney(amount)}
                        </span>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(investment.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
