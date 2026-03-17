import { vi } from 'vitest'

// Create mock data stores
const mockData = {
  categories: [] as any[],
  transactions: [] as any[],
  accounts: [] as any[],
  budgets: [] as any[],
  goals: [] as any[],
  investments: [] as any[],
  regularPayments: [] as any[],
  settings: null as any,
  monthlyIncome: [] as any[],
  monthlyBudgetStats: [] as any[],
}

// Reset function for tests
export function resetMockData() {
  mockData.categories = [
    { id: 'cat-1', name: 'Зарплата', icon: 'Briefcase', color: '#22c55e', type: 'income', expenseType: 'variable', isDefault: true },
    { id: 'cat-2', name: 'Жилье', icon: 'Home', color: '#45B7D1', type: 'expense', expenseType: 'mandatory', isDefault: true },
    { id: 'cat-3', name: 'Коммунальные', icon: 'Home', color: '#5DADE2', type: 'expense', expenseType: 'mandatory', isDefault: true },
    { id: 'cat-4', name: 'Еда', icon: 'Utensils', color: '#FF6B6B', type: 'expense', expenseType: 'variable', isDefault: true },
  ]
  mockData.transactions = []
  mockData.accounts = [
    { id: 'acc-1', name: 'Основной счет', type: 'main', currency: 'RUB', balance: 10000, isActive: true },
  ]
  mockData.budgets = []
  mockData.goals = []
  mockData.investments = []
  mockData.regularPayments = []
  mockData.settings = { id: 'set-1', rubToUsdRate: 0.011, theme: 'light', passwordHash: null }
  mockData.monthlyIncome = []
  mockData.monthlyBudgetStats = []
}

// Initialize mock data
resetMockData()

// Helper to generate IDs
let idCounter = 0
function generateId(prefix: string = 'id') {
  return `${prefix}-${++idCounter}`
}

// Create mock Prisma client
export const mockDb = {
  category: {
    findMany: vi.fn(async ({ where, orderBy } = {}) => {
      let result = [...mockData.categories]
      if (where?.type) {
        result = result.filter(c => c.type === where.type)
      }
      if (orderBy?.name === 'asc') {
        result.sort((a, b) => a.name.localeCompare(b.name))
      }
      return result
    }),
    findUnique: vi.fn(async ({ where }) => {
      return mockData.categories.find(c => c.id === where.id) || null
    }),
    create: vi.fn(async ({ data }) => {
      const category = { id: generateId('cat'), ...data }
      mockData.categories.push(category)
      return category
    }),
    update: vi.fn(async ({ where, data }) => {
      const index = mockData.categories.findIndex(c => c.id === where.id)
      if (index === -1) throw new Error('Category not found')
      mockData.categories[index] = { ...mockData.categories[index], ...data }
      return mockData.categories[index]
    }),
    delete: vi.fn(async ({ where }) => {
      const index = mockData.categories.findIndex(c => c.id === where.id)
      if (index !== -1) mockData.categories.splice(index, 1)
      return { success: true }
    }),
    count: vi.fn(async () => mockData.categories.length),
  },

  transaction: {
    findMany: vi.fn(async ({ where, include, orderBy } = {}) => {
      let result = [...mockData.transactions]
      if (where?.date) {
        if (where.date.gte) {
          result = result.filter(t => new Date(t.date) >= where.date.gte)
        }
        if (where.date.lte) {
          result = result.filter(t => new Date(t.date) <= where.date.lte)
        }
      }
      if (where?.type) {
        result = result.filter(t => t.type === where.type)
      }
      // Add category to each transaction
      result = result.map(t => ({
        ...t,
        category: mockData.categories.find(c => c.id === t.categoryId) || null,
        account: mockData.accounts.find(a => a.id === t.accountId) || null,
      }))
      if (orderBy?.date === 'desc') {
        result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      }
      return result
    }),
    create: vi.fn(async ({ data, include }) => {
      const transaction = {
        id: generateId('tx'),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      }
      mockData.transactions.push(transaction)
      return {
        ...transaction,
        category: mockData.categories.find(c => c.id === data.categoryId) || null,
        account: mockData.accounts.find(a => a.id === data.accountId) || null,
      }
    }),
    update: vi.fn(async ({ where, data, include }) => {
      const index = mockData.transactions.findIndex(t => t.id === where.id)
      if (index === -1) throw new Error('Transaction not found')
      mockData.transactions[index] = {
        ...mockData.transactions[index],
        ...data,
        updatedAt: new Date(),
      }
      return {
        ...mockData.transactions[index],
        category: mockData.categories.find(c => c.id === mockData.transactions[index].categoryId) || null,
        account: mockData.accounts.find(a => a.id === mockData.transactions[index].accountId) || null,
      }
    }),
    delete: vi.fn(async ({ where }) => {
      const index = mockData.transactions.findIndex(t => t.id === where.id)
      if (index !== -1) mockData.transactions.splice(index, 1)
      return { success: true }
    }),
    aggregate: vi.fn(async ({ where, _sum }) => {
      let filtered = [...mockData.transactions]
      if (where?.type) {
        filtered = filtered.filter(t => t.type === where.type)
      }
      if (where?.categoryId) {
        filtered = filtered.filter(t => t.categoryId === where.categoryId)
      }
      return {
        _sum: {
          amount: filtered.reduce((sum, t) => sum + (t.amount || 0), 0),
        },
      }
    }),
  },

  account: {
    findMany: vi.fn(async () => mockData.accounts),
    findUnique: vi.fn(async ({ where }) => mockData.accounts.find(a => a.id === where.id) || null),
    create: vi.fn(async ({ data }) => {
      const account = { id: generateId('acc'), ...data }
      mockData.accounts.push(account)
      return account
    }),
    update: vi.fn(async ({ where, data }) => {
      const index = mockData.accounts.findIndex(a => a.id === where.id)
      if (index === -1) throw new Error('Account not found')
      mockData.accounts[index] = { ...mockData.accounts[index], ...data }
      return mockData.accounts[index]
    }),
    delete: vi.fn(async ({ where }) => {
      const index = mockData.accounts.findIndex(a => a.id === where.id)
      if (index !== -1) mockData.accounts.splice(index, 1)
      return { success: true }
    }),
  },

  budget: {
    findMany: vi.fn(async ({ where, include, orderBy } = {}) => {
      let result = [...mockData.budgets]
      if (where?.month) {
        result = result.filter(b => b.month === where.month)
      }
      result = result.map(b => ({
        ...b,
        category: mockData.categories.find(c => c.id === b.categoryId) || null,
      }))
      return result
    }),
    findFirst: vi.fn(async ({ where }) => {
      return mockData.budgets.find(b => b.categoryId === where.categoryId && b.month === where.month) || null
    }),
    create: vi.fn(async ({ data, include }) => {
      const budget = {
        id: generateId('bud'),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      }
      mockData.budgets.push(budget)
      return {
        ...budget,
        category: mockData.categories.find(c => c.id === data.categoryId) || null,
      }
    }),
    update: vi.fn(async ({ where, data, include }) => {
      const index = mockData.budgets.findIndex(b => b.id === where.id)
      if (index === -1) throw new Error('Budget not found')
      mockData.budgets[index] = { ...mockData.budgets[index], ...data, updatedAt: new Date() }
      return {
        ...mockData.budgets[index],
        category: mockData.categories.find(c => c.id === mockData.budgets[index].categoryId) || null,
      }
    }),
    delete: vi.fn(async ({ where }) => {
      const index = mockData.budgets.findIndex(b => b.id === where.id)
      if (index !== -1) mockData.budgets.splice(index, 1)
      return { success: true }
    }),
  },

  settings: {
    findFirst: vi.fn(async () => mockData.settings),
    create: vi.fn(async ({ data }) => {
      mockData.settings = { id: generateId('set'), ...data }
      return mockData.settings
    }),
    update: vi.fn(async ({ where, data }) => {
      mockData.settings = { ...mockData.settings, ...data }
      return mockData.settings
    }),
  },

  financialGoal: {
    findMany: vi.fn(async () => mockData.goals),
    findUnique: vi.fn(async ({ where }) => mockData.goals.find(g => g.id === where.id) || null),
    create: vi.fn(async ({ data }) => {
      const goal = { id: generateId('goal'), ...data }
      mockData.goals.push(goal)
      return goal
    }),
    update: vi.fn(async ({ where, data }) => {
      const index = mockData.goals.findIndex(g => g.id === where.id)
      if (index === -1) throw new Error('Goal not found')
      mockData.goals[index] = { ...mockData.goals[index], ...data }
      return mockData.goals[index]
    }),
    delete: vi.fn(async ({ where }) => {
      const index = mockData.goals.findIndex(g => g.id === where.id)
      if (index !== -1) mockData.goals.splice(index, 1)
      return { success: true }
    }),
  },

  investment: {
    findMany: vi.fn(async () => mockData.investments),
    create: vi.fn(async ({ data }) => {
      const investment = { id: generateId('inv'), ...data }
      mockData.investments.push(investment)
      return investment
    }),
    delete: vi.fn(async ({ where }) => {
      const index = mockData.investments.findIndex(i => i.id === where.id)
      if (index !== -1) mockData.investments.splice(index, 1)
      return { success: true }
    }),
  },

  regularPayment: {
    findMany: vi.fn(async ({ include } = {}) => {
      const payments = mockData.regularPayments.map(p => ({
        ...p,
        category: include?.category ? mockData.categories.find(c => c.id === p.categoryId) || null : undefined
      }))
      return payments
    }),
    findUnique: vi.fn(async ({ where, include }) => {
      const payment = mockData.regularPayments.find(p => p.id === where.id) || null
      if (!payment) return null
      return {
        ...payment,
        category: include?.category ? mockData.categories.find(c => c.id === payment.categoryId) || null : undefined
      }
    }),
    create: vi.fn(async ({ data, include }) => {
      const payment = { id: generateId('pay'), ...data }
      mockData.regularPayments.push(payment)
      return {
        ...payment,
        category: include?.category ? mockData.categories.find(c => c.id === data.categoryId) || null : undefined
      }
    }),
    update: vi.fn(async ({ where, data, include }) => {
      const index = mockData.regularPayments.findIndex(p => p.id === where.id)
      if (index === -1) throw new Error('Payment not found')
      mockData.regularPayments[index] = { ...mockData.regularPayments[index], ...data }
      return {
        ...mockData.regularPayments[index],
        category: include?.category ? mockData.categories.find(c => c.id === mockData.regularPayments[index].categoryId) || null : undefined
      }
    }),
    delete: vi.fn(async ({ where }) => {
      const index = mockData.regularPayments.findIndex(p => p.id === where.id)
      if (index !== -1) mockData.regularPayments.splice(index, 1)
      return { success: true }
    }),
  },

  monthlyIncome: {
    findUnique: vi.fn(async ({ where }) => mockData.monthlyIncome.find(i => i.month === where.month) || null),
    findFirst: vi.fn(async ({ where, orderBy }) => {
      let result = [...mockData.monthlyIncome]
      if (where?.isRecurring) {
        result = result.filter(i => i.isRecurring)
      }
      if (orderBy?.month === 'desc') {
        result.sort((a, b) => b.month.localeCompare(a.month))
      }
      return result[0] || null
    }),
    create: vi.fn(async ({ data }) => {
      const income = { id: generateId('inc'), createdAt: new Date(), updatedAt: new Date(), ...data }
      mockData.monthlyIncome.push(income)
      return income
    }),
    update: vi.fn(async ({ where, data }) => {
      const index = mockData.monthlyIncome.findIndex(i => i.id === where.id)
      if (index === -1) throw new Error('Income not found')
      mockData.monthlyIncome[index] = { ...mockData.monthlyIncome[index], ...data, updatedAt: new Date() }
      return mockData.monthlyIncome[index]
    }),
  },

  monthlyBudgetStats: {
    findUnique: vi.fn(async ({ where }) => mockData.monthlyBudgetStats.find(s => s.month === where.month) || null),
    create: vi.fn(async ({ data }) => {
      const stats = { id: generateId('stat'), createdAt: new Date(), updatedAt: new Date(), ...data }
      mockData.monthlyBudgetStats.push(stats)
      return stats
    }),
    update: vi.fn(async ({ where, data }) => {
      const index = mockData.monthlyBudgetStats.findIndex(s => s.id === where.id)
      if (index === -1) throw new Error('Stats not found')
      mockData.monthlyBudgetStats[index] = { ...mockData.monthlyBudgetStats[index], ...data, updatedAt: new Date() }
      return mockData.monthlyBudgetStats[index]
    }),
  },

  $queryRawUnsafe: vi.fn(async () => []),
  $executeRawUnsafe: vi.fn(async () => 1),
}

// Mock the db module
vi.mock('@/lib/db', () => ({
  db: mockDb,
}))

export { mockData }
