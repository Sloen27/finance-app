import { create } from 'zustand'

export interface Category {
  id: string
  name: string
  icon: string | null
  color: string | null
  isDefault: boolean
  type: string // 'income' or 'expense'
  expenseType: string // 'mandatory', 'variable', 'discretionary' - only for expense
}

export interface Transaction {
  id: string
  type: string
  amount: number
  currency: string
  categoryId: string
  category: Category
  accountId: string | null
  date: Date
  comment: string | null
}

export interface Budget {
  id: string
  categoryId: string
  category: Category
  amount: number
  currency: string
  month: string
}

export interface RegularPayment {
  id: string
  name: string
  amount: number
  currency: string
  categoryId: string
  category: Category
  period: string
  dueDate: number | null
  isActive: boolean
}

export interface Settings {
  id: string
  rubToUsdRate: number
  theme: string
  mandatoryPercent: number
  variablePercent: number
  savingsPercent: number
  investmentsPercent: number
  passwordHash: string | null
}

export interface Account {
  id: string
  name: string
  type: string // 'main', 'savings', 'cash', 'investment'
  currency: string
  balance: number
  color: string | null
  icon: string | null
  isActive: boolean
}

export interface FinancialGoal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  currency: string
  deadline: string | null
  accountId: string | null
  account: Account | null
  isCompleted: boolean
}

export interface Investment {
  id: string
  type: string // 'deposit', 'withdraw', 'adjustment'
  amount: number
  description: string | null
  date: Date
}

interface FinanceStore {
  categories: Category[]
  transactions: Transaction[]
  budgets: Budget[]
  regularPayments: RegularPayment[]
  settings: Settings | null
  accounts: Account[]
  goals: FinancialGoal[]
  investments: Investment[]
  currentMonth: string
  isLoading: boolean

  setCategories: (categories: Category[]) => void
  addCategory: (category: Category) => void
  updateCategory: (id: string, category: Partial<Category>) => void
  removeCategory: (id: string) => void

  setTransactions: (transactions: Transaction[]) => void
  addTransaction: (transaction: Transaction) => void
  updateTransaction: (id: string, transaction: Partial<Transaction>) => void
  removeTransaction: (id: string) => void

  setBudgets: (budgets: Budget[]) => void
  addBudget: (budget: Budget) => void
  updateBudget: (id: string, budget: Partial<Budget>) => void
  removeBudget: (id: string) => void

  setRegularPayments: (payments: RegularPayment[]) => void
  addRegularPayment: (payment: RegularPayment) => void
  updateRegularPayment: (id: string, payment: Partial<RegularPayment>) => void
  removeRegularPayment: (id: string) => void

  setSettings: (settings: Settings) => void

  setAccounts: (accounts: Account[]) => void
  addAccount: (account: Account) => void
  updateAccount: (id: string, account: Partial<Account>) => void
  removeAccount: (id: string) => void

  setGoals: (goals: FinancialGoal[]) => void
  addGoal: (goal: FinancialGoal) => void
  updateGoal: (id: string, goal: Partial<FinancialGoal>) => void
  removeGoal: (id: string) => void

  setInvestments: (investments: Investment[]) => void
  addInvestment: (investment: Investment) => void
  removeInvestment: (id: string) => void

  setCurrentMonth: (month: string) => void
  setIsLoading: (loading: boolean) => void
}

const getCurrentMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export const useFinanceStore = create<FinanceStore>((set) => ({
  categories: [],
  transactions: [],
  budgets: [],
  regularPayments: [],
  settings: null,
  accounts: [],
  goals: [],
  investments: [],
  currentMonth: getCurrentMonth(),
  isLoading: true,

  setCategories: (categories) => set({ categories }),
  addCategory: (category) => set((state) => ({
    categories: [...state.categories, category].sort((a, b) => a.name.localeCompare(b.name))
  })),
  updateCategory: (id, category) => set((state) => ({
    categories: state.categories.map((c) => c.id === id ? { ...c, ...category } : c)
  })),
  removeCategory: (id) => set((state) => ({
    categories: state.categories.filter((c) => c.id !== id)
  })),

  setTransactions: (transactions) => set({ transactions }),
  addTransaction: (transaction) => set((state) => ({
    transactions: [transaction, ...state.transactions]
  })),
  updateTransaction: (id, transaction) => set((state) => ({
    transactions: state.transactions.map((t) => t.id === id ? { ...t, ...transaction } : t)
  })),
  removeTransaction: (id) => set((state) => ({
    transactions: state.transactions.filter((t) => t.id !== id)
  })),

  setBudgets: (budgets) => set({ budgets }),
  addBudget: (budget) => set((state) => ({
    budgets: [...state.budgets, budget]
  })),
  updateBudget: (id, budget) => set((state) => ({
    budgets: state.budgets.map((b) => b.id === id ? { ...b, ...budget } : b)
  })),
  removeBudget: (id) => set((state) => ({
    budgets: state.budgets.filter((b) => b.id !== id)
  })),

  setRegularPayments: (regularPayments) => set({ regularPayments }),
  addRegularPayment: (payment) => set((state) => ({
    regularPayments: [...state.regularPayments, payment].sort((a, b) => a.name.localeCompare(b.name))
  })),
  updateRegularPayment: (id, payment) => set((state) => ({
    regularPayments: state.regularPayments.map((p) => p.id === id ? { ...p, ...payment } : p)
  })),
  removeRegularPayment: (id) => set((state) => ({
    regularPayments: state.regularPayments.filter((p) => p.id !== id)
  })),

  setSettings: (settings) => set({ settings }),

  setAccounts: (accounts) => set({ accounts }),
  addAccount: (account) => set((state) => ({
    accounts: [...state.accounts, account]
  })),
  updateAccount: (id, account) => set((state) => ({
    accounts: state.accounts.map((a) => a.id === id ? { ...a, ...account } : a)
  })),
  removeAccount: (id) => set((state) => ({
    accounts: state.accounts.filter((a) => a.id !== id)
  })),

  setGoals: (goals) => set({ goals }),
  addGoal: (goal) => set((state) => ({
    goals: [...state.goals, goal]
  })),
  updateGoal: (id, goal) => set((state) => ({
    goals: state.goals.map((g) => g.id === id ? { ...g, ...goal } : g)
  })),
  removeGoal: (id) => set((state) => ({
    goals: state.goals.filter((g) => g.id !== id)
  })),

  setInvestments: (investments) => set({ investments }),
  addInvestment: (investment) => set((state) => ({
    investments: [investment, ...state.investments]
  })),
  removeInvestment: (id) => set((state) => ({
    investments: state.investments.filter((i) => i.id !== id)
  })),

  setCurrentMonth: (month) => set({ currentMonth: month }),
  setIsLoading: (loading) => set({ isLoading: loading })
}))
