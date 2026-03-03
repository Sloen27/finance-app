'use client'

import { useState } from 'react'
import { useFinanceStore } from '@/store/finance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Pencil, Trash2, AlertCircle, CheckCircle } from 'lucide-react'

interface BudgetFormData {
  categoryId: string
  amount: string
  currency: string
  month: string
}

export function Budgets() {
  const { budgets, categories, transactions, currentMonth, addBudget, updateBudget, removeBudget, settings } = useFinanceStore()
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<string | null>(null)
  const [formData, setFormData] = useState<BudgetFormData>({
    categoryId: '',
    amount: '',
    currency: 'RUB',
    month: currentMonth
  })
  
  // Filter budgets for current month
  const monthBudgets = budgets.filter(b => b.month === currentMonth)
  
  // Calculate spent amount for each budget
  const [year, month] = currentMonth.split('-').map(Number)
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0)
  
  const budgetsWithSpent = monthBudgets.map(budget => {
    const spent = transactions
      .filter(t => {
        const date = new Date(t.date)
        return t.type === 'expense' && 
               t.categoryId === budget.categoryId &&
               date >= monthStart && date <= monthEnd
      })
      .reduce((sum, t) => sum + t.amount, 0)
    
    return {
      ...budget,
      spent,
      progress: budget.amount > 0 ? Math.min((spent / budget.amount) * 100, 100) : 0,
      remaining: budget.amount - spent
    }
  })
  
  // Available categories (not already in budget)
  const availableCategories = categories.filter(
    cat => !monthBudgets.some(b => b.categoryId === cat.id) || 
    (editingBudget && monthBudgets.find(b => b.id === editingBudget)?.categoryId === cat.id)
  )
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.categoryId || !formData.amount) return
    
    try {
      if (editingBudget) {
        const response = await fetch(`/api/budgets/${editingBudget}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
        const data = await response.json()
        updateBudget(editingBudget, data)
      } else {
        const response = await fetch('/api/budgets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
        const data = await response.json()
        addBudget(data)
      }
      
      setIsDialogOpen(false)
      setEditingBudget(null)
      setFormData({ categoryId: '', amount: '', currency: 'RUB', month: currentMonth })
    } catch (error) {
      console.error('Error saving budget:', error)
    }
  }
  
  const handleEdit = (budget: typeof budgetsWithSpent[0]) => {
    setEditingBudget(budget.id)
    setFormData({
      categoryId: budget.categoryId,
      amount: budget.amount.toString(),
      currency: budget.currency,
      month: budget.month
    })
    setIsDialogOpen(true)
  }
  
  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот бюджет?')) return
    
    try {
      await fetch(`/api/budgets/${id}`, { method: 'DELETE' })
      removeBudget(id)
    } catch (error) {
      console.error('Error deleting budget:', error)
    }
  }
  
  const formatMoney = (amount: number, currency: string = 'RUB') => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount)
  }
  
  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'text-red-600'
    if (progress >= 80) return 'text-yellow-600'
    return 'text-muted-foreground'
  }
  
  const getStatusIcon = (progress: number) => {
    if (progress >= 100) return <AlertCircle className="h-4 w-4 text-red-500" />
    if (progress >= 80) return <AlertCircle className="h-4 w-4 text-yellow-500" />
    return <CheckCircle className="h-4 w-4 text-green-500" />
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Бюджеты на месяц</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingBudget(null)
                  setFormData({ categoryId: '', amount: '', currency: 'RUB', month: currentMonth })
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingBudget ? 'Редактировать бюджет' : 'Новый бюджет'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Категория</Label>
                    <Select 
                      value={formData.categoryId} 
                      onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите категорию" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCategories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Сумма бюджета</Label>
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
                      <Label>Валюта</Label>
                      <Select 
                        value={formData.currency} 
                        onValueChange={(value) => setFormData({ ...formData, currency: value })}
                      >
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
                  
                  <DialogFooter>
                    <Button type="submit">
                      {editingBudget ? 'Сохранить' : 'Добавить'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            {budgetsWithSpent.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Нет бюджетов на этот месяц. Добавьте бюджет для отслеживания расходов.
              </p>
            ) : (
              <div className="space-y-4">
                {budgetsWithSpent.map(budget => (
                  <div 
                    key={budget.id} 
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(budget.progress)}
                        <div>
                          <p className="font-medium">{budget.category.name}</p>
                          <p className={`text-sm ${getProgressColor(budget.progress)}`}>
                            {formatMoney(budget.spent, budget.currency)} из {formatMoney(budget.amount, budget.currency)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${
                          budget.remaining < 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {budget.remaining >= 0 ? 'Осталось: ' : 'Превышение: '}
                          {formatMoney(Math.abs(budget.remaining), budget.currency)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(budget)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(budget.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Progress 
                      value={budget.progress}
                      className={`h-3 ${
                        budget.progress >= 100 
                          ? '[&>div]:bg-red-500' 
                          : budget.progress >= 80 
                            ? '[&>div]:bg-yellow-500' 
                            : ''
                      }`}
                    />
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
