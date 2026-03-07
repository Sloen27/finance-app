'use client'

import { useState } from 'react'
import { useFinanceStore } from '@/store/finance'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Pencil, Trash2, Target, TrendingUp, Calendar, CheckCircle } from 'lucide-react'

interface GoalFormData {
  name: string
  targetAmount: string
  currentAmount: string
  currency: string
  deadline: string
}

const initialFormData: GoalFormData = {
  name: '',
  targetAmount: '',
  currentAmount: '0',
  currency: 'RUB',
  deadline: ''
}

export function FinancialGoals() {
  const { goals, addGoal, updateGoal, removeGoal } = useFinanceStore()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDepositOpen, setIsDepositOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<string | null>(null)
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null)
  const [depositAmount, setDepositAmount] = useState('')
  const [formData, setFormData] = useState<GoalFormData>(initialFormData)

  const safeGoals = Array.isArray(goals) ? goals : []
  const activeGoals = safeGoals.filter(g => !g.isCompleted)
  const completedGoals = safeGoals.filter(g => g.isCompleted)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.targetAmount) return

    try {
      const dataToSend = {
        name: formData.name,
        targetAmount: parseFloat(formData.targetAmount) || 0,
        currentAmount: parseFloat(formData.currentAmount) || 0,
        currency: formData.currency || 'RUB',
        deadline: formData.deadline || null
      }

      if (editingGoal) {
        const response = await fetch(`/api/goals/${editingGoal}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend)
        })
        const data = await response.json()
        updateGoal(editingGoal, data)
      } else {
        const response = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend)
        })
        const data = await response.json()
        addGoal(data)
      }

      setIsDialogOpen(false)
      setEditingGoal(null)
      setFormData(initialFormData)
    } catch (error) {
      console.error('Error saving goal:', error)
    }
  }

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!depositGoalId || !depositAmount) return

    const goal = safeGoals.find(g => g.id === depositGoalId)
    if (!goal) return

    try {
      const newAmount = (goal.currentAmount || 0) + (parseFloat(depositAmount) || 0)
      const response = await fetch(`/api/goals/${depositGoalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentAmount: newAmount
        })
      })
      const data = await response.json()
      updateGoal(depositGoalId, data)

      setIsDepositOpen(false)
      setDepositGoalId(null)
      setDepositAmount('')
    } catch (error) {
      console.error('Error depositing to goal:', error)
    }
  }

  const handleEdit = (goal: typeof safeGoals[0]) => {
    setEditingGoal(goal.id)
    setFormData({
      name: goal.name,
      targetAmount: String(goal.targetAmount || 0),
      currentAmount: String(goal.currentAmount || 0),
      currency: goal.currency || 'RUB',
      deadline: goal.deadline || ''
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить эту цель?')) return
    try {
      await fetch(`/api/goals/${id}`, { method: 'DELETE' })
      removeGoal(id)
    } catch (error) {
      console.error('Error deleting goal:', error)
    }
  }

  const formatMoney = (amount: number, currency: string = 'RUB') => {
    const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency || 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(safeAmount)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    try {
      return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    } catch {
      return null
    }
  }

  const totalTarget = activeGoals.reduce((sum, g) => {
    const amount = typeof g.targetAmount === 'number' && !isNaN(g.targetAmount) ? g.targetAmount : 0
    return sum + amount
  }, 0)

  const totalSaved = activeGoals.reduce((sum, g) => {
    const amount = typeof g.currentAmount === 'number' && !isNaN(g.currentAmount) ? g.currentAmount : 0
    return sum + amount
  }, 0)

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Прогресс целей</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-3xl font-bold">{formatMoney(totalSaved)}</div>
              <p className="text-sm text-muted-foreground">из {formatMoney(totalTarget)}</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold">
                {totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0}%
              </div>
              <p className="text-sm text-muted-foreground">{activeGoals.length} активных целей</p>
            </div>
          </div>
          <Progress value={totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0} className="mt-4 h-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Финансовые цели</CardTitle>
              <CardDescription>Накопления на важные покупки и события</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingGoal(null)
                  setFormData(initialFormData)
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Новая цель
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingGoal ? 'Редактировать цель' : 'Новая финансовая цель'}</DialogTitle>
                  <DialogDescription>
                    Укажите цель и сумму для накопления
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Название цели</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Например: Отпуск, Автомобиль"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Целевая сумма</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.targetAmount}
                        onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Валюта</Label>
                      <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RUB">₽ RUB</SelectItem>
                          <SelectItem value="USD">$ USD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Начальная сумма (уже накоплено)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.currentAmount}
                      onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Срок (опционально)</Label>
                    <Input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    />
                  </div>

                  <DialogFooter>
                    <Button type="submit">{editingGoal ? 'Сохранить' : 'Добавить'}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-2">
            {activeGoals.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">Нет активных финансовых целей</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Создайте цель, чтобы начать копить</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeGoals.map(goal => {
                  const targetAmount = typeof goal.targetAmount === 'number' && !isNaN(goal.targetAmount) ? goal.targetAmount : 0
                  const currentAmount = typeof goal.currentAmount === 'number' && !isNaN(goal.currentAmount) ? goal.currentAmount : 0
                  const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0
                  const remaining = targetAmount - currentAmount

                  return (
                    <div key={goal.id} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-primary/10">
                            <Target className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium">{goal.name}</h4>
                            {goal.deadline && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {formatDate(goal.deadline)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDepositGoalId(goal.id)
                              setIsDepositOpen(true)
                            }}
                          >
                            <TrendingUp className="h-4 w-4 mr-1" />
                            Пополнить
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(goal)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(goal.id)} className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{formatMoney(currentAmount, goal.currency)}</span>
                          <span className="text-muted-foreground">
                            {formatMoney(targetAmount, goal.currency)}
                          </span>
                        </div>
                        <Progress value={Math.min(progress, 100)} className={`h-3 ${progress >= 100 ? '[&>div]:bg-green-500' : ''}`} />
                        <div className="flex justify-between text-xs">
                          <Badge variant="secondary">{Math.round(progress)}%</Badge>
                          <span className={remaining <= 0 ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                            {remaining <= 0 ? 'Цель достигнута!' : `Осталось: ${formatMoney(Math.abs(remaining), goal.currency)}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>

          {completedGoals.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Достигнутые цели ({completedGoals.length})
              </h3>
              <div className="space-y-2">
                {completedGoals.map(goal => (
                  <div key={goal.id} className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">{goal.name}</p>
                        <p className="text-sm text-muted-foreground">{formatMoney(goal.targetAmount, goal.currency)}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(goal.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deposit Dialog */}
      <Dialog open={isDepositOpen} onOpenChange={setIsDepositOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Пополнить цель</DialogTitle>
            <DialogDescription>Добавьте средства к накоплениям</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDeposit} className="space-y-4">
            <div className="space-y-2">
              <Label>Сумма пополнения</Label>
              <Input
                type="number"
                step="0.01"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.00"
                required
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDepositOpen(false)}>Отмена</Button>
              <Button type="submit">Пополнить</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
