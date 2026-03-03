'use client'

import { useState, useEffect } from 'react'
import { useFinanceStore } from '@/store/finance'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Pencil, Trash2, ArrowRightLeft, Wallet, PiggyBank, Banknote, TrendingUp, LineChart, ArrowUpRight, ArrowDownRight, Calendar as CalendarIcon } from 'lucide-react'
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

const ACCOUNT_TYPES = [
  { value: 'main', label: 'Основной', icon: 'Wallet', color: '#4ECDC4' },
  { value: 'savings', label: 'Накопительный', icon: 'PiggyBank', color: '#96CEB4' },
  { value: 'cash', label: 'Наличные', icon: 'Banknote', color: '#FFEAA7' },
  { value: 'investment', label: 'Инвестиционный', icon: 'TrendingUp', color: '#82E0AA' }
]

const ACCOUNT_COLORS = ['#4ECDC4', '#96CEB4', '#FFEAA7', '#82E0AA', '#FF6B6B', '#45B7D1', '#DDA0DD', '#F7DC6F']

interface AccountFormData {
  name: string
  type: string
  currency: string
  balance: string
  color: string
  changeDate?: Date
}

interface TransferFormData {
  fromAccountId: string
  toAccountId: string
  amount: string
}

interface AccountHistory {
  date: string
  balance: number
  income: number
  expense: number
}

interface AccountHistoryStats {
  startBalance: number
  endBalance: number
  totalIncome: number
  totalExpense: number
  minBalance: number
  maxBalance: number
  change: number
  historyRecordsCount: number
}

const initialFormData: AccountFormData = {
  name: '',
  type: 'savings',
  currency: 'RUB',
  balance: '0',
  color: '#96CEB4',
  changeDate: undefined
}

export function Accounts() {
  const { accounts, addAccount, updateAccount, removeAccount } = useFinanceStore()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<string | null>(null)
  const [formData, setFormData] = useState<AccountFormData>(initialFormData)
  const [transferData, setTransferData] = useState<TransferFormData>({
    fromAccountId: '',
    toAccountId: '',
    amount: ''
  })
  
  // History state
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [historyPeriod, setHistoryPeriod] = useState<'month' | 'quarter' | 'year'>('month')
  const [historyData, setHistoryData] = useState<AccountHistory[]>([])
  const [historyStats, setHistoryStats] = useState<AccountHistoryStats | null>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [hasHistory, setHasHistory] = useState(false)

  const safeAccounts = Array.isArray(accounts) ? accounts : []

  // Fetch account history
  useEffect(() => {
    if (selectedAccountId && isHistoryOpen) {
      fetchAccountHistory(selectedAccountId, historyPeriod)
    }
  }, [selectedAccountId, historyPeriod, isHistoryOpen])

  const fetchAccountHistory = async (accountId: string, period: 'month' | 'quarter' | 'year') => {
    setIsLoadingHistory(true)
    try {
      const response = await fetch(`/api/accounts/${accountId}/history?period=${period}`)
      const data = await response.json()
      setHistoryData(data.history || [])
      setHistoryStats(data.stats || null)
      setHasHistory(data.hasHistory || false)
    } catch (error) {
      console.error('Error fetching account history:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const openHistoryDialog = (accountId: string) => {
    setSelectedAccountId(accountId)
    setHistoryPeriod('month')
    setIsHistoryOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) return

    try {
      if (editingAccount) {
        const response = await fetch(`/api/accounts/${editingAccount}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            balance: parseFloat(formData.balance) || 0,
            changeDate: formData.changeDate?.toISOString()
          })
        })
        const data = await response.json()
        updateAccount(editingAccount, data)
      } else {
        const response = await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            balance: parseFloat(formData.balance) || 0
          })
        })
        const data = await response.json()
        addAccount(data)
      }

      setIsDialogOpen(false)
      setEditingAccount(null)
      setFormData(initialFormData)
    } catch (error) {
      console.error('Error saving account:', error)
    }
  }

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transferData.fromAccountId || !transferData.toAccountId || !transferData.amount) return

    try {
      const response = await fetch('/api/accounts/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...transferData,
          amount: parseFloat(transferData.amount) || 0
        })
      })
      const data = await response.json()

      if (data.success) {
        updateAccount(data.fromAccount.id, data.fromAccount)
        updateAccount(data.toAccount.id, data.toAccount)
      }

      setIsTransferOpen(false)
      setTransferData({ fromAccountId: '', toAccountId: '', amount: '' })
    } catch (error) {
      console.error('Error transferring:', error)
    }
  }

  const handleEdit = (account: typeof safeAccounts[0]) => {
    setEditingAccount(account.id)
    setFormData({
      name: account.name,
      type: account.type,
      currency: account.currency || 'RUB',
      balance: String(account.balance || 0),
      color: account.color || '#96CEB4',
      changeDate: undefined
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот счет?')) return
    try {
      await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
      removeAccount(id)
    } catch (error) {
      console.error('Error deleting account:', error)
    }
  }

  const formatMoney = (amount: number, currency: string = 'RUB') => {
    const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency || 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(safeAmount)
  }

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'main': return <Wallet className="h-5 w-5" />
      case 'savings': return <PiggyBank className="h-5 w-5" />
      case 'cash': return <Banknote className="h-5 w-5" />
      case 'investment': return <TrendingUp className="h-5 w-5" />
      default: return <Wallet className="h-5 w-5" />
    }
  }

  const totalBalance = safeAccounts.reduce((sum, a) => {
    const balance = typeof a.balance === 'number' && !isNaN(a.balance) ? a.balance : 0
    return sum + balance
  }, 0)

  const accountsByType = {
    main: safeAccounts.filter(a => a.type === 'main'),
    savings: safeAccounts.filter(a => a.type === 'savings'),
    cash: safeAccounts.filter(a => a.type === 'cash'),
    investment: safeAccounts.filter(a => a.type === 'investment')
  }

  const selectedAccount = safeAccounts.find(a => a.id === selectedAccountId)

  const renderAccountCard = (account: typeof safeAccounts[0], showDelete: boolean = true) => (
    <div key={account.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${account.color || '#888'}20` }}>
          <div style={{ color: account.color || '#888' }}>{getAccountIcon(account.type)}</div>
        </div>
        <div>
          <p className="font-medium">{account.name}</p>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {ACCOUNT_TYPES.find(t => t.value === account.type)?.label || account.type}
            </Badge>
            <span className="text-xs text-muted-foreground">{account.currency || 'RUB'}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className={`text-lg font-semibold ${typeof account.balance === 'number' && account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {formatMoney(account.balance, account.currency)}
        </span>
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => openHistoryDialog(account.id)}
            title="Динамика баланса"
          >
            <LineChart className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleEdit(account)}>
            <Pencil className="h-4 w-4" />
          </Button>
          {showDelete && (
            <Button variant="ghost" size="icon" onClick={() => handleDelete(account.id)} className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Total Balance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Общий баланс</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{formatMoney(totalBalance)}</div>
          <p className="text-sm text-muted-foreground">{safeAccounts.length} счетов</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Счета</CardTitle>
              <CardDescription>Управление вашими финансовыми счетами</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsTransferOpen(true)}>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Перевод
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingAccount(null)
                    setFormData(initialFormData)
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить счет
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingAccount ? 'Редактировать счет' : 'Новый счет'}</DialogTitle>
                    <DialogDescription>
                      {editingAccount ? 'Измените параметры счета' : 'Создайте новый финансовый счет'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Название</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Название счета"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Тип счета</Label>
                        <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ACCOUNT_TYPES.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                      <Label>Баланс</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.balance}
                        onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                      />
                    </div>

                    {/* Date picker for balance change - only when editing */}
                    {editingAccount && (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          Дата изменения баланса
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                              {formData.changeDate 
                                ? format(formData.changeDate, 'd MMMM yyyy', { locale: ru })
                                : 'Сегодня (по умолчанию)'
                              }
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.changeDate}
                              onSelect={(date) => setFormData({ ...formData, changeDate: date })}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <p className="text-xs text-muted-foreground">
                          Выберите дату, когда произошло изменение баланса (для корректного графика динамики)
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Цвет</Label>
                      <div className="flex flex-wrap gap-2">
                        {ACCOUNT_COLORS.map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setFormData({ ...formData, color })}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${
                              formData.color === color ? 'border-foreground scale-110' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>

                    <DialogFooter>
                      <Button type="submit">{editingAccount ? 'Сохранить' : 'Добавить'}</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">Все ({safeAccounts.length})</TabsTrigger>
              <TabsTrigger value="main">Основные ({accountsByType.main.length})</TabsTrigger>
              <TabsTrigger value="savings">Накопления ({accountsByType.savings.length})</TabsTrigger>
              <TabsTrigger value="investment">Инвестиции ({accountsByType.investment.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <ScrollArea className="h-[400px] pr-2">
                <div className="grid gap-3">
                  {safeAccounts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Нет счетов. Добавьте первый счет.</p>
                  ) : (
                    safeAccounts.map(account => renderAccountCard(account))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {(['main', 'savings', 'investment'] as const).map(type => (
              <TabsContent key={type} value={type}>
                <div className="grid gap-3">
                  {accountsByType[type].length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Нет счетов этого типа</p>
                  ) : (
                    accountsByType[type].map(account => renderAccountCard(account, false))
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Transfer Dialog */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Перевод между счетами</DialogTitle>
            <DialogDescription>Переведите средства с одного счета на другой</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTransfer} className="space-y-4">
            <div className="space-y-2">
              <Label>Со счета</Label>
              <Select value={transferData.fromAccountId} onValueChange={(v) => setTransferData({ ...transferData, fromAccountId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите счет" />
                </SelectTrigger>
                <SelectContent>
                  {safeAccounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({formatMoney(account.balance, account.currency)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>На счет</Label>
              <Select value={transferData.toAccountId} onValueChange={(v) => setTransferData({ ...transferData, toAccountId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите счет" />
                </SelectTrigger>
                <SelectContent>
                  {safeAccounts.filter(a => a.id !== transferData.fromAccountId).map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({formatMoney(account.balance, account.currency)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Сумма</Label>
              <Input
                type="number"
                step="0.01"
                value={transferData.amount}
                onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <DialogFooter>
              <Button type="submit">Перевести</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Account History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Динамика баланса: {selectedAccount?.name}
            </DialogTitle>
            <DialogDescription>
              История изменения баланса счёта
            </DialogDescription>
          </DialogHeader>
          
          {/* Period Selector */}
          <div className="flex items-center gap-2">
            <Label className="text-sm">Период:</Label>
            <Select value={historyPeriod} onValueChange={(v) => setHistoryPeriod(v as 'month' | 'quarter' | 'year')}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Месяц</SelectItem>
                <SelectItem value="quarter">Квартал</SelectItem>
                <SelectItem value="year">Год</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoadingHistory ? (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-muted-foreground">Загрузка...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* No History Warning */}
              {!hasHistory && historyStats?.historyRecordsCount === 0 && (
                <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
                  <p className="font-medium">Нет истории изменений баланса</p>
                  <p className="text-xs mt-1">Изменяйте баланс через форму редактирования счёта для отслеживания динамики. При изменении баланса будет создаваться точка на графике.</p>
                </div>
              )}

              {/* Stats Cards */}
              {historyStats && (
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Начало</p>
                    <p className="text-lg font-semibold">{formatMoney(historyStats.startBalance, selectedAccount?.currency)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Текущий</p>
                    <p className="text-lg font-semibold">{formatMoney(historyStats.endBalance, selectedAccount?.currency)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Изменение</p>
                    <p className={`text-lg font-semibold ${historyStats.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {historyStats.change >= 0 ? '+' : ''}{formatMoney(historyStats.change, selectedAccount?.currency)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Доход/Расход</p>
                    <p className="text-sm">
                      <span className="text-green-600">+{formatMoney(historyStats.totalIncome, selectedAccount?.currency)}</span>
                      {' / '}
                      <span className="text-red-600">-{formatMoney(historyStats.totalExpense, selectedAccount?.currency)}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Chart */}
              {historyData.length > 0 && (
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historyData}>
                      <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={selectedAccount?.color || '#4ECDC4'} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={selectedAccount?.color || '#4ECDC4'} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => {
                          try {
                            if (historyPeriod === 'month') {
                              return format(parseISO(value), 'd MMM', { locale: ru })
                            }
                            return format(parseISO(value), 'MMM yyyy', { locale: ru })
                          } catch {
                            return value
                          }
                        }}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis 
                        tickFormatter={(value) => {
                          if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`
                          if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`
                          return value
                        }}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip 
                        formatter={(value: number) => [formatMoney(value, selectedAccount?.currency), 'Баланс']}
                        labelFormatter={(label) => {
                          try {
                            if (historyPeriod === 'month') {
                              return format(parseISO(label), 'd MMMM yyyy', { locale: ru })
                            }
                            return format(parseISO(label), 'LLLL yyyy', { locale: ru })
                          } catch {
                            return label
                          }
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="balance" 
                        stroke={selectedAccount?.color || '#4ECDC4'} 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorBalance)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* History Table */}
              <div>
                <h4 className="text-sm font-medium mb-2">История изменений</h4>
                <ScrollArea className="h-[200px]">
                  {historyData.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Нет данных за выбранный период</p>
                  ) : (
                    <div className="space-y-1">
                      {historyData.slice().reverse().filter(d => d.income > 0 || d.expense > 0).slice(0, 20).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                          <span className="text-sm text-muted-foreground">
                            {historyPeriod === 'month' 
                              ? format(parseISO(item.date), 'd MMMM', { locale: ru })
                              : format(parseISO(item.date), 'LLLL yyyy', { locale: ru })
                            }
                          </span>
                          <div className="flex items-center gap-4">
                            {item.income > 0 && (
                              <span className="text-sm text-green-600 flex items-center gap-1">
                                <ArrowUpRight className="h-3 w-3" />
                                +{formatMoney(item.income, selectedAccount?.currency)}
                              </span>
                            )}
                            {item.expense > 0 && (
                              <span className="text-sm text-red-600 flex items-center gap-1">
                                <ArrowDownRight className="h-3 w-3" />
                                -{formatMoney(item.expense, selectedAccount?.currency)}
                              </span>
                            )}
                            <span className="text-sm font-medium w-[100px] text-right">
                              {formatMoney(item.balance, selectedAccount?.currency)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
