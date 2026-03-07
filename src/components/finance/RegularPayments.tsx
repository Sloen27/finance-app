'use client'

import { useState } from 'react'
import { useFinanceStore } from '@/store/finance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Pencil, Trash2, Calendar, Repeat } from 'lucide-react'

interface RegularPaymentFormData {
  name: string
  amount: string
  currency: string
  categoryId: string
  period: string
  dueDate: string
  isActive: boolean
}

const PERIODS = [
  { value: 'daily', label: 'Ежедневно' },
  { value: 'weekly', label: 'Еженедельно' },
  { value: 'monthly', label: 'Ежемесячно' },
  { value: 'yearly', label: 'Ежегодно' }
]

const initialFormData: RegularPaymentFormData = {
  name: '',
  amount: '',
  currency: 'RUB',
  categoryId: '',
  period: 'monthly',
  dueDate: '',
  isActive: true
}

export function RegularPayments() {
  const { regularPayments, categories, addRegularPayment, updateRegularPayment, removeRegularPayment } = useFinanceStore()
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<string | null>(null)
  const [formData, setFormData] = useState<RegularPaymentFormData>(initialFormData)
  
  const activePayments = regularPayments.filter(p => p.isActive)
  const inactivePayments = regularPayments.filter(p => !p.isActive)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.amount || !formData.categoryId) return
    
    try {
      if (editingPayment) {
        const response = await fetch(`/api/regular-payments/${editingPayment}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
        const data = await response.json()
        updateRegularPayment(editingPayment, data)
      } else {
        const response = await fetch('/api/regular-payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
        const data = await response.json()
        addRegularPayment(data)
      }
      
      setIsDialogOpen(false)
      setEditingPayment(null)
      setFormData(initialFormData)
    } catch (error) {
      console.error('Error saving regular payment:', error)
    }
  }
  
  const handleEdit = (payment: typeof regularPayments[0]) => {
    setEditingPayment(payment.id)
    setFormData({
      name: payment.name,
      amount: payment.amount.toString(),
      currency: payment.currency,
      categoryId: payment.categoryId,
      period: payment.period,
      dueDate: payment.dueDate?.toString() || '',
      isActive: payment.isActive
    })
    setIsDialogOpen(true)
  }
  
  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот регулярный платеж?')) return
    
    try {
      await fetch(`/api/regular-payments/${id}`, { method: 'DELETE' })
      removeRegularPayment(id)
    } catch (error) {
      console.error('Error deleting regular payment:', error)
    }
  }
  
  const handleToggleActive = async (payment: typeof regularPayments[0]) => {
    try {
      const response = await fetch(`/api/regular-payments/${payment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: payment.name,
          amount: payment.amount.toString(),
          currency: payment.currency,
          categoryId: payment.categoryId,
          period: payment.period,
          dueDate: payment.dueDate?.toString() || '',
          isActive: !payment.isActive
        })
      })
      const data = await response.json()
      updateRegularPayment(payment.id, data)
    } catch (error) {
      console.error('Error toggling payment status:', error)
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
  
  const getPeriodLabel = (period: string) => {
    return PERIODS.find(p => p.value === period)?.label || period
  }
  
  const renderPaymentList = (payments: typeof regularPayments, showToggle: boolean = true) => (
    <div className="space-y-3">
      {payments.map(payment => (
        <div 
          key={payment.id} 
          className={`flex items-center justify-between p-4 rounded-lg border bg-card ${
            !payment.isActive ? 'opacity-60' : ''
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-full bg-blue-100">
              <Repeat className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{payment.name}</p>
                <Badge variant="outline" className="text-xs">
                  {getPeriodLabel(payment.period)}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{payment.category.name}</span>
                {payment.dueDate && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {payment.dueDate} число
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-lg font-semibold">
              {formatMoney(payment.amount, payment.currency)}
            </span>
            {showToggle && (
              <Switch
                checked={payment.isActive}
                onCheckedChange={() => handleToggleActive(payment)}
              />
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(payment)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(payment.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Регулярные платежи</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingPayment(null)
                  setFormData(initialFormData)
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingPayment ? 'Редактировать платеж' : 'Новый регулярный платеж'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Название</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Например: Аренда"
                      required
                    />
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
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Периодичность</Label>
                      <Select 
                        value={formData.period} 
                        onValueChange={(value) => setFormData({ ...formData, period: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PERIODS.map(period => (
                            <SelectItem key={period.value} value={period.value}>
                              {period.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {formData.period === 'monthly' && (
                      <div className="space-y-2">
                        <Label>День месяца</Label>
                        <Input
                          type="number"
                          min="1"
                          max="31"
                          value={formData.dueDate}
                          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                          placeholder="1-31"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Активно</Label>
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                  </div>
                  
                  <DialogFooter>
                    <Button type="submit">
                      {editingPayment ? 'Сохранить' : 'Добавить'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            {regularPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Нет регулярных платежей. Добавьте платежи для отслеживания регулярных расходов.
              </p>
            ) : (
              <>
                {activePayments.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                      Активные ({activePayments.length})
                    </h3>
                    {renderPaymentList(activePayments)}
                  </div>
                )}
                
                {inactivePayments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                      Неактивные ({inactivePayments.length})
                    </h3>
                    {renderPaymentList(inactivePayments)}
                  </div>
                )}
              </>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
