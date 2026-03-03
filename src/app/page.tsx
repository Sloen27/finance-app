'use client'

import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useFinanceStore } from '@/store/finance'
import { Dashboard } from '@/components/finance/Dashboard'
import { Transactions } from '@/components/finance/Transactions'
import { Categories } from '@/components/finance/Categories'
import { Budgets } from '@/components/finance/Budgets'
import { RegularPayments } from '@/components/finance/RegularPayments'
import { Analytics } from '@/components/finance/Analytics'
import { Settings } from '@/components/finance/Settings'
import { Accounts } from '@/components/finance/Accounts'
import { FinancialGoals } from '@/components/finance/FinancialGoals'
import { Investments } from '@/components/finance/Investments'
import {
  LayoutDashboard,
  Receipt,
  Tags,
  PiggyBank,
  Calendar,
  BarChart3,
  Settings as SettingsIcon,
  Loader2,
  Wallet,
  Building2,
  Target,
  TrendingUp,
  LogOut
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { subMonths, format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

export default function Home() {
  const {
    categories,
    transactions,
    budgets,
    regularPayments,
    settings,
    accounts,
    goals,
    investments,
    currentMonth,
    setCategories,
    setTransactions,
    setBudgets,
    setRegularPayments,
    setSettings,
    setAccounts,
    setGoals,
    setInvestments,
    setCurrentMonth,
    isLoading,
    setIsLoading
  } = useFinanceStore()

  const [isInitialized, setIsInitialized] = useState(false)

  // Generate month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i)
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'LLLL yyyy', { locale: ru })
    }
  })

  // Initialize app and fetch all data
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check initialization status
        const initResponse = await fetch('/api/init')
        const initData = await initResponse.json()

        // Initialize default categories if needed
        if (!initData.initialized) {
          await fetch('/api/init', { method: 'POST' })
        }

        // Fetch all data in parallel
        const [categoriesRes, transactionsRes, budgetsRes, regularPaymentsRes, settingsRes, accountsRes, goalsRes, investmentsRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/transactions'),
          fetch('/api/budgets'),
          fetch('/api/regular-payments'),
          fetch('/api/settings'),
          fetch('/api/accounts'),
          fetch('/api/goals'),
          fetch('/api/investments')
        ])

        const [categoriesData, transactionsData, budgetsData, regularPaymentsData, settingsData, accountsData, goalsData, investmentsData] = await Promise.all([
          categoriesRes.json(),
          transactionsRes.json(),
          budgetsRes.json(),
          regularPaymentsRes.json(),
          settingsRes.json(),
          accountsRes.json(),
          goalsRes.json(),
          investmentsRes.json()
        ])

        // Ensure all data is arrays (handle error objects from API)
        setCategories(Array.isArray(categoriesData) ? categoriesData : [])
        setTransactions(Array.isArray(transactionsData) ? transactionsData : [])
        setBudgets(Array.isArray(budgetsData) ? budgetsData : [])
        setRegularPayments(Array.isArray(regularPaymentsData) ? regularPaymentsData : [])
        setSettings(settingsData && !settingsData.error ? settingsData : null)
        setAccounts(Array.isArray(accountsData) ? accountsData : [])
        setGoals(Array.isArray(goalsData) ? goalsData : [])
        setInvestments(Array.isArray(investmentsData) ? investmentsData : [])

        // Apply theme
        if (settingsData && settingsData.theme) {
          document.documentElement.classList.remove('light', 'dark')
          document.documentElement.classList.add(settingsData.theme)
        }

        setIsInitialized(true)
      } catch (error) {
        console.error('Error initializing app:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeApp()
  }, [])

  // Show loading state
  if (isLoading || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Wallet className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Финансы</h1>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Загрузка...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Персональные финансы</h1>
            </div>

            <div className="flex items-center gap-4">
              {/* Month Selector */}
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

              {/* Logout Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST' })
                  window.location.href = '/login'
                }}
                title="Выйти"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          {/* Scrollable Tabs */}
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="inline-flex w-max">
              <TabsTrigger value="dashboard" className="flex items-center gap-2 px-4">
                <LayoutDashboard className="h-4 w-4" />
                <span>Обзор</span>
              </TabsTrigger>
              <TabsTrigger value="transactions" className="flex items-center gap-2 px-4">
                <Receipt className="h-4 w-4" />
                <span>Транзакции</span>
              </TabsTrigger>
              <TabsTrigger value="accounts" className="flex items-center gap-2 px-4">
                <Building2 className="h-4 w-4" />
                <span>Счета</span>
              </TabsTrigger>
              <TabsTrigger value="categories" className="flex items-center gap-2 px-4">
                <Tags className="h-4 w-4" />
                <span>Категории</span>
              </TabsTrigger>
              <TabsTrigger value="budgets" className="flex items-center gap-2 px-4">
                <PiggyBank className="h-4 w-4" />
                <span>Бюджеты</span>
              </TabsTrigger>
              <TabsTrigger value="regular" className="flex items-center gap-2 px-4">
                <Calendar className="h-4 w-4" />
                <span>Платежи</span>
              </TabsTrigger>
              <TabsTrigger value="goals" className="flex items-center gap-2 px-4">
                <Target className="h-4 w-4" />
                <span>Цели</span>
              </TabsTrigger>
              <TabsTrigger value="investments" className="flex items-center gap-2 px-4">
                <TrendingUp className="h-4 w-4" />
                <span>Инвестиции</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2 px-4">
                <BarChart3 className="h-4 w-4" />
                <span>Аналитика</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2 px-4">
                <SettingsIcon className="h-4 w-4" />
                <span>Настройки</span>
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <TabsContent value="dashboard">
            <Dashboard />
          </TabsContent>

          <TabsContent value="transactions">
            <Transactions />
          </TabsContent>

          <TabsContent value="accounts">
            <Accounts />
          </TabsContent>

          <TabsContent value="categories">
            <Categories />
          </TabsContent>

          <TabsContent value="budgets">
            <Budgets />
          </TabsContent>

          <TabsContent value="regular">
            <RegularPayments />
          </TabsContent>

          <TabsContent value="goals">
            <FinancialGoals />
          </TabsContent>

          <TabsContent value="investments">
            <Investments />
          </TabsContent>

          <TabsContent value="analytics">
            <Analytics />
          </TabsContent>

          <TabsContent value="settings">
            <Settings />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Персональный финансовый учет © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  )
}
