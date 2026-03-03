'use client'

import { useState } from 'react'
import { useFinanceStore } from '@/store/finance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Plus, Pencil, Trash2, Filter, ArrowUpRight, ArrowDownRight, List, Calendar as CalendarIcon, ChevronLeft, ChevronRight, PieChart, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, isWeekend } from 'date-fns'
import { ru } from 'date-fns/locale'

interface TransactionFormData {
  type: string
  amount: string
  currency: string
  categoryId: string
  date: string
  comment: string
}

const initialFormData: TransactionFormData = {
  type: 'expense',
  amount: '',
  currency: 'RUB',
  categoryId: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  comment: ''
}

export function Transactions() {
  const { transactions, categories, currentMonth, addTransaction, updateTransaction, removeTransaction, settings } = useFinanceStore()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null)
  const [formData, setFormData] = useState<TransactionFormData>(initialFormData)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')

  // Calendar state
  const [calendarDate, setCalendarDate] = useState(new Date(currentMonth + '-01'))
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [isDayDialogOpen, setIsDayDialogOpen] = useState(false)

  // Sorting state
  const [sortField, setSortField] = useState<'date' | 'amount'>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Filters
  const [filterType, setFilterType] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterCurrency, setFilterCurrency] = useState<string>('all')

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    const transactionMonth = format(new Date(t.date), 'yyyy-MM')
    if (transactionMonth !== currentMonth) return false
    if (filterType !== 'all' && t.type !== filterType) return false
    if (filterCategory !== 'all' && t.categoryId !== filterCategory) return false
    if (filterCurrency !== 'all' && t.currency !== filterCurrency) return false
    return true
  }).sort((a, b) => {
    let comparison = 0
    if (sortField === 'date') {
      comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
    } else if (sortField === 'amount') {
      comparison = a.amount - b.amount
    }
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.categoryId || !formData.amount) return

    try {
      if (editingTransaction) {
        const response = await fetch(`/api/transactions/${editingTransaction}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
        const data = await response.json()
        updateTransaction(editingTransaction, data)
      } else {
        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
        const data = await response.json()
        addTransaction(data)
      }

      setIsDialogOpen(false)
      setEditingTransaction(null)
      setFormData(initialFormData)
    } catch (error) {
      console.error('Error saving transaction:', error)
    }
  }

  const handleEdit = (transaction: typeof transactions[0]) => {
    setEditingTransaction(transaction.id)
    setFormData({
      type: transaction.type,
      amount: transaction.amount.toString(),
      currency: transaction.currency,
      categoryId: transaction.categoryId,
      date: format(new Date(transaction.date), 'yyyy-MM-dd'),
      comment: transaction.comment || ''
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить эту транзакцию?')) return
    try {
      await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
      removeTransaction(id)
    } catch (error) {
      console.error('Error deleting transaction:', error)
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

  // Calendar helpers
  const monthStart = startOfMonth(calendarDate)
  const monthEnd = endOfMonth(calendarDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const getDayTransactions = (date: Date) => {
    return transactions.filter(t => isSameDay(new Date(t.date), date))
  }

  const handleDayClick = (day: Date) => {
    setSelectedDay(day)
    setIsDayDialogOpen(true)
  }

  const handleAddTransactionFromDay = () => {
    if (selectedDay) {
      setFormData({ ...initialFormData, date: format(selectedDay, 'yyyy-MM-dd') })
      setIsDayDialogOpen(false)
      setIsDialogOpen(true)
    }
  }

  const getDayTotals = (date: Date) => {
    const dayTx = getDayTransactions(date)
    const income = dayTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
    const expense = dayTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
    return { income, expense, count: dayTx.length }
  }

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  const isWeekendHeader = [false, false, false, false, false, true, true]

  // Income distribution calculation
  const incomeAmount = formData.type === 'income' ? parseFloat(formData.amount) || 0 : 0
  const mandatoryPercent = settings?.mandatoryPercent || 50
  const variablePercent = settings?.variablePercent || 30
  const savingsPercent = settings?.savingsPercent || 10
  const investmentsPercent = settings?.investmentsPercent || 10

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Транзакции</CardTitle>
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center border rounded-lg p-1">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('calendar')}
                >
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </div>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <Button onClick={() => {
                  setEditingTransaction(null)
                  setFormData(initialFormData)
                  setIsDialogOpen(true)
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить
                </Button>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingTransaction ? 'Редактировать транзакцию' : 'Новая транзакция'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Тип</Label>
                        <Select
                          value={formData.type}
                          onValueChange={(value) => setFormData({ ...formData, type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="expense">Расход</SelectItem>
                            <SelectItem value="income">Доход</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

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
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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

                      <div className="space-y-2">
                        <Label>Дата</Label>
                        <Input
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          required
                        />
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
                          {categories
                            .filter(c => c.type === formData.type || (!c.type && formData.type === 'expense'))
                            .map(category => (
                              <SelectItem key={category.id} value={category.id}>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color || '#B2BABB' }} />
                                  {category.name}
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Комментарий</Label>
                      <Input
                        value={formData.comment}
                        onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                        placeholder="Необязательно"
                      />
                    </div>

                    {/* Income Distribution Preview */}
                    {formData.type === 'income' && incomeAmount > 0 && (
                      <div className="p-3 rounded-lg bg-muted space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <PieChart className="h-4 w-4" />
                          Распределение дохода
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span>Обязательные расходы ({mandatoryPercent}%)</span>
                            <span className="font-medium">{formatMoney(incomeAmount * mandatoryPercent / 100, formData.currency)}</span>
                          </div>
                          <Progress value={mandatoryPercent} className="h-1.5" />

                          <div className="flex items-center justify-between">
                            <span>Переменные расходы ({variablePercent}%)</span>
                            <span className="font-medium">{formatMoney(incomeAmount * variablePercent / 100, formData.currency)}</span>
                          </div>
                          <Progress value={variablePercent} className="h-1.5" />

                          <div className="flex items-center justify-between">
                            <span>Накопления ({savingsPercent}%)</span>
                            <span className="font-medium">{formatMoney(incomeAmount * savingsPercent / 100, formData.currency)}</span>
                          </div>
                          <Progress value={savingsPercent} className="h-1.5" />

                          <div className="flex items-center justify-between">
                            <span>Инвестиции ({investmentsPercent}%)</span>
                            <span className="font-medium">{formatMoney(incomeAmount * investmentsPercent / 100, formData.currency)}</span>
                          </div>
                          <Progress value={investmentsPercent} className="h-1.5" />
                        </div>
                      </div>
                    )}

                    <DialogFooter>
                      <Button type="submit">
                        {editingTransaction ? 'Сохранить' : 'Добавить'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'list' ? (
            <>
              {/* Filters */}
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Тип" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все типы</SelectItem>
                      <SelectItem value="income">Доход</SelectItem>
                      <SelectItem value="expense">Расход</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Категория" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все категории</SelectItem>
                    {categories
                      .filter(c => filterType === 'all' || c.type === filterType || (!c.type && filterType === 'expense'))
                      .map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                <Select value={filterCurrency} onValueChange={setFilterCurrency}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Валюта" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все валюты</SelectItem>
                    <SelectItem value="RUB">₽ RUB</SelectItem>
                    <SelectItem value="USD">$ USD</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sorting */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="ml-auto">
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                      Сортировка
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setSortField('date'); setSortDirection('desc') }}>
                      <ArrowDown className="h-4 w-4 mr-2" />
                      Дата (новые первые)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortField('date'); setSortDirection('asc') }}>
                      <ArrowUp className="h-4 w-4 mr-2" />
                      Дата (старые первые)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { setSortField('amount'); setSortDirection('desc') }}>
                      <ArrowDown className="h-4 w-4 mr-2" />
                      Сумма (по убыванию)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortField('amount'); setSortDirection('asc') }}>
                      <ArrowUp className="h-4 w-4 mr-2" />
                      Сумма (по возрастанию)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Transactions List */}
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {filteredTransactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Нет транзакций за выбранный период
                    </p>
                  ) : (
                    filteredTransactions.map(transaction => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${
                            transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            {transaction.type === 'income'
                              ? <ArrowUpRight className="h-4 w-4 text-green-600" />
                              : <ArrowDownRight className="h-4 w-4 text-red-600" />
                            }
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{transaction.category.name}</p>
                              <Badge variant="outline" className="text-xs">
                                {transaction.currency}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{format(new Date(transaction.date), 'd MMMM yyyy', { locale: ru })}</span>
                              {transaction.comment && (
                                <>
                                  <span>•</span>
                                  <span>{transaction.comment}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-lg font-semibold ${
                            transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'income' ? '+' : '-'}
                            {formatMoney(transaction.amount, transaction.currency)}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(transaction)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(transaction.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </>
          ) : (
            /* Calendar View */
            <div className="space-y-4">
              {/* Month Navigation */}
              <div className="flex items-center justify-between">
                <Button variant="outline" size="icon" onClick={() => setCalendarDate(subMonths(calendarDate, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-lg font-semibold capitalize">
                  {format(calendarDate, 'LLLL yyyy', { locale: ru })}
                </h3>
                <Button variant="outline" size="icon" onClick={() => setCalendarDate(addMonths(calendarDate, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Week Days Header */}
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((day, idx) => (
                  <div
                    key={day}
                    className={`text-center text-sm font-medium py-2 rounded ${
                      isWeekendHeader[idx] ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for days before month start */}
                {Array.from({ length: (monthStart.getDay() + 6) % 7 }, (_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* Day cells */}
                {days.map(day => {
                  const totals = getDayTotals(day)
                  const weekend = isWeekend(day)

                  return (
                    <div
                      key={day.toISOString()}
                      className={`aspect-square p-2 border rounded-lg cursor-pointer transition-all hover:bg-accent flex flex-col
                        ${isToday(day) ? 'border-primary border-2' : 'border-border'}
                        ${selectedDay && isSameDay(day, selectedDay) ? 'bg-primary/10 ring-2 ring-primary' : ''}
                        ${weekend && !isToday(day) ? 'bg-red-50 dark:bg-red-950/20' : ''}
                        ${weekend ? 'hover:bg-red-100 dark:hover:bg-red-900/30' : ''}
                      `}
                      onClick={() => handleDayClick(day)}
                    >
                      <div className="flex flex-col h-full">
                        <span className={`text-base font-medium ${
                          isToday(day) ? 'text-primary' :
                          weekend ? 'text-red-600 dark:text-red-400' : ''
                        }`}>
                          {format(day, 'd')}
                        </span>
                        {totals.count > 0 && (
                          <div className="flex-1 flex flex-col justify-end text-[10px] mt-1">
                            {totals.income > 0 && (
                              <span className="text-green-600 dark:text-green-400 truncate font-medium">+{formatMoney(totals.income)}</span>
                            )}
                            {totals.expense > 0 && (
                              <span className="text-red-600 dark:text-red-400 truncate font-medium">-{formatMoney(totals.expense)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Day Transactions Dialog */}
      <Dialog open={isDayDialogOpen} onOpenChange={setIsDayDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDay && format(selectedDay, 'd MMMM yyyy', { locale: ru })}
            </DialogTitle>
            <DialogDescription>
              Транзакции за выбранный день
            </DialogDescription>
          </DialogHeader>
          
          {selectedDay && (() => {
            const dayTransactions = getDayTransactions(selectedDay)
            const dayTotals = getDayTotals(selectedDay)
            
            return (
              <div className="space-y-4">
                {/* Day Summary */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Доход</p>
                    <p className="text-lg font-semibold text-green-600">+{formatMoney(dayTotals.income)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Расход</p>
                    <p className="text-lg font-semibold text-red-600">-{formatMoney(dayTotals.expense)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Итого</p>
                    <p className={`text-lg font-semibold ${dayTotals.income - dayTotals.expense >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatMoney(dayTotals.income - dayTotals.expense)}
                    </p>
                  </div>
                </div>

                {/* Transactions List */}
                <ScrollArea className="h-[250px]">
                  {dayTransactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Нет транзакций за этот день
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {dayTransactions.map(transaction => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
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
                              <p className="text-sm font-medium">{transaction.category.name}</p>
                              {transaction.comment && (
                                <p className="text-xs text-muted-foreground">{transaction.comment}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${
                              transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.type === 'income' ? '+' : '-'}{formatMoney(transaction.amount, transaction.currency)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                handleEdit(transaction)
                                setIsDayDialogOpen(false)
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => {
                                handleDelete(transaction.id)
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                <DialogFooter>
                  <Button onClick={handleAddTransactionFromDay}>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить транзакцию
                  </Button>
                </DialogFooter>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
