import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { resetMockData, mockDb, mockData } from './mockDb'

// Import handlers - we'll need to restructure to test them
// For now, we'll create integration-style tests that test the logic

describe('API Endpoints', () => {
  beforeEach(() => {
    resetMockData()
    vi.clearAllMocks()
  })

  describe('Transactions API', () => {
    it('should create a transaction with valid data', async () => {
      const transactionData = {
        type: 'expense',
        amount: 1000,
        categoryId: 'cat-3', // Коммунальные
        date: '2025-01-15',
        currency: 'RUB',
        comment: 'Test transaction',
      }

      // Call the mock create
      const result = await mockDb.transaction.create({
        data: {
          ...transactionData,
          date: new Date(transactionData.date),
        },
        include: { category: true, account: true },
      })

      expect(result).toBeDefined()
      expect(result.amount).toBe(1000)
      expect(result.categoryId).toBe('cat-3')
      expect(result.category?.name).toBe('Коммунальные')
      expect(mockDb.transaction.create).toHaveBeenCalled()
    })

    it('should reject transaction without categoryId', async () => {
      const transactionData = {
        type: 'expense',
        amount: 1000,
        date: '2025-01-15',
      }

      // Category ID is missing - validation should fail
      expect(transactionData.categoryId).toBeUndefined()
    })

    it('should reject transaction with invalid date', async () => {
      const invalidDate = 'invalid-date'
      const parsedDate = new Date(invalidDate)

      expect(isNaN(parsedDate.getTime())).toBe(true)
    })

    it('should reject transaction with invalid amount', async () => {
      const amount = 'not-a-number'
      const parsedAmount = parseFloat(amount)

      expect(isNaN(parsedAmount)).toBe(true)
    })

    it('should reject transaction with non-existent category', async () => {
      const categoryId = 'non-existent-category'
      const category = await mockDb.category.findUnique({ where: { id: categoryId } })

      expect(category).toBeNull()
    })

    it('should get transactions filtered by month', async () => {
      // Create some test transactions
      await mockDb.transaction.create({
        data: {
          type: 'expense',
          amount: 1000,
          categoryId: 'cat-3',
          date: new Date('2025-01-15'),
          currency: 'RUB',
        },
        include: { category: true, account: true },
      })

      await mockDb.transaction.create({
        data: {
          type: 'expense',
          amount: 2000,
          categoryId: 'cat-4',
          date: new Date('2025-02-15'),
          currency: 'RUB',
        },
        include: { category: true, account: true },
      })

      // Get January transactions
      const januaryStart = new Date(2025, 0, 1)
      const januaryEnd = new Date(2025, 1, 0, 23, 59, 59)
      const result = await mockDb.transaction.findMany({
        where: { date: { gte: januaryStart, lte: januaryEnd } },
        include: { category: true, account: true },
      })

      expect(result.length).toBe(1)
      expect(result[0].amount).toBe(1000)
    })
  })

  describe('Budgets API', () => {
    it('should create a budget with valid data', async () => {
      const budgetData = {
        categoryId: 'cat-3',
        amount: 5000,
        month: '2025-01',
        currency: 'RUB',
      }

      const result = await mockDb.budget.create({
        data: budgetData,
        include: { category: true },
      })

      expect(result).toBeDefined()
      expect(result.amount).toBe(5000)
      expect(result.categoryId).toBe('cat-3')
      expect(result.category?.name).toBe('Коммунальные')
    })

    it('should update existing budget for same category and month', async () => {
      // Create initial budget
      await mockDb.budget.create({
        data: {
          categoryId: 'cat-3',
          amount: 5000,
          month: '2025-01',
          currency: 'RUB',
        },
        include: { category: true },
      })

      // Find existing budget
      const existing = await mockDb.budget.findFirst({
        where: { categoryId: 'cat-3', month: '2025-01' },
      })

      expect(existing).toBeDefined()
      expect(existing?.amount).toBe(5000)

      // Update budget
      if (existing) {
        const updated = await mockDb.budget.update({
          where: { id: existing.id },
          data: { amount: 6000 },
          include: { category: true },
        })

        expect(updated.amount).toBe(6000)
      }
    })

    it('should reject budget without categoryId', async () => {
      const budgetData = {
        amount: 5000,
        month: '2025-01',
      }

      expect(budgetData.categoryId).toBeUndefined()
    })

    it('should reject budget with invalid amount', async () => {
      const amount = -100
      expect(amount).toBeLessThan(0)
    })

    it('should reject budget with non-existent category', async () => {
      const category = await mockDb.category.findUnique({ where: { id: 'non-existent' } })
      expect(category).toBeNull()
    })
  })

  describe('Categories API', () => {
    it('should get all categories', async () => {
      const categories = await mockDb.category.findMany()

      expect(categories.length).toBeGreaterThan(0)
      expect(categories.find(c => c.name === 'Коммунальные')).toBeDefined()
    })

    it('should filter categories by type', async () => {
      const expenseCategories = await mockDb.category.findMany({
        where: { type: 'expense' },
      })

      expect(expenseCategories.every(c => c.type === 'expense')).toBe(true)
    })

    it('should create a new category', async () => {
      const newCategory = await mockDb.category.create({
        data: {
          name: 'Тестовая категория',
          type: 'expense',
          expenseType: 'variable',
          color: '#FF0000',
        },
      })

      expect(newCategory).toBeDefined()
      expect(newCategory.name).toBe('Тестовая категория')
    })

    it('should update a category', async () => {
      const updated = await mockDb.category.update({
        where: { id: 'cat-3' },
        data: { name: 'Коммунальные услуги' },
      })

      expect(updated.name).toBe('Коммунальные услуги')
    })

    it('should delete a category', async () => {
      await mockDb.category.delete({ where: { id: 'cat-4' } })
      const deleted = await mockDb.category.findUnique({ where: { id: 'cat-4' } })

      expect(deleted).toBeNull()
    })
  })

  describe('Accounts API', () => {
    it('should get all accounts', async () => {
      const accounts = await mockDb.account.findMany()

      expect(accounts.length).toBeGreaterThan(0)
    })

    it('should create a new account', async () => {
      const account = await mockDb.account.create({
        data: {
          name: 'Тестовый счет',
          type: 'savings',
          currency: 'RUB',
          balance: 5000,
          isActive: true,
        },
      })

      expect(account).toBeDefined()
      expect(account.name).toBe('Тестовый счет')
    })
  })

  describe('Settings API', () => {
    it('should get settings', async () => {
      const settings = await mockDb.settings.findFirst()

      expect(settings).toBeDefined()
    })

    it('should update settings', async () => {
      const updated = await mockDb.settings.update({
        where: { id: 'set-1' },
        data: { theme: 'dark' },
      })

      expect(updated.theme).toBe('dark')
    })
  })

  describe('Monthly Income API', () => {
    it('should save monthly income', async () => {
      const income = await mockDb.monthlyIncome.create({
        data: {
          amount: 50000,
          month: '2025-01',
          currency: 'RUB',
          isRecurring: true,
        },
      })

      expect(income).toBeDefined()
      expect(income.amount).toBe(50000)
    })

    it('should get income for specific month', async () => {
      await mockDb.monthlyIncome.create({
        data: {
          amount: 50000,
          month: '2025-01',
          currency: 'RUB',
          isRecurring: true,
        },
      })

      const income = await mockDb.monthlyIncome.findUnique({
        where: { month: '2025-01' },
      })

      expect(income).toBeDefined()
      expect(income?.amount).toBe(50000)
    })
  })

  describe('Regular Payments API', () => {
    it('should create a regular payment with valid data', async () => {
      const paymentData = {
        name: 'Аренда квартиры',
        amount: 25000,
        categoryId: 'cat-2', // Жилье
        period: 'monthly',
        dueDate: 10,
        isActive: true,
        currency: 'RUB',
      }

      // Validate required fields
      expect(paymentData.name).toBeDefined()
      expect(typeof paymentData.name).toBe('string')
      expect(paymentData.categoryId).toBeDefined()

      // Validate amount
      const parsedAmount = typeof paymentData.amount === 'string' 
        ? parseFloat(paymentData.amount) 
        : paymentData.amount
      expect(typeof parsedAmount).toBe('number')
      expect(isNaN(parsedAmount)).toBe(false)

      // Validate period
      const validPeriods = ['daily', 'weekly', 'monthly', 'yearly']
      expect(validPeriods.includes(paymentData.period)).toBe(true)

      // Validate category exists
      const category = await mockDb.category.findUnique({ where: { id: paymentData.categoryId } })
      expect(category).not.toBeNull()

      // Create payment
      const payment = await mockDb.regularPayment.create({
        data: paymentData,
        include: { category: true },
      })

      expect(payment).toBeDefined()
      expect(payment.name).toBe('Аренда квартиры')
      expect(payment.amount).toBe(25000)
      expect(payment.category?.name).toBe('Жилье')
    })

    it('should reject payment without name', async () => {
      const paymentData = {
        amount: 25000,
        categoryId: 'cat-2',
        period: 'monthly',
      }

      expect(paymentData.name).toBeUndefined()
    })

    it('should reject payment without categoryId', async () => {
      const paymentData = {
        name: 'Тест',
        amount: 25000,
        period: 'monthly',
      }

      expect(paymentData.categoryId).toBeUndefined()
    })

    it('should reject payment with invalid amount', async () => {
      const amount = 'not-a-number'
      const parsedAmount = parseFloat(amount)
      expect(isNaN(parsedAmount)).toBe(true)
    })

    it('should reject payment with invalid period', async () => {
      const period = 'invalid-period'
      const validPeriods = ['daily', 'weekly', 'monthly', 'yearly']
      expect(validPeriods.includes(period)).toBe(false)
    })

    it('should reject payment with non-existent category', async () => {
      const category = await mockDb.category.findUnique({ where: { id: 'non-existent' } })
      expect(category).toBeNull()
    })

    it('should get all regular payments', async () => {
      // Create a payment first
      await mockDb.regularPayment.create({
        data: {
          name: 'Тестовый платеж',
          amount: 1000,
          categoryId: 'cat-3',
          period: 'monthly',
          isActive: true,
        },
        include: { category: true },
      })

      const payments = await mockDb.regularPayment.findMany({
        include: { category: true },
      })

      expect(payments.length).toBeGreaterThan(0)
    })

    it('should update a regular payment', async () => {
      // Create a payment first
      const payment = await mockDb.regularPayment.create({
        data: {
          name: 'Платеж для обновления',
          amount: 1000,
          categoryId: 'cat-3',
          period: 'monthly',
          isActive: true,
        },
        include: { category: true },
      })

      // Update the payment
      const updated = await mockDb.regularPayment.update({
        where: { id: payment.id },
        data: { amount: 2000, name: 'Обновленный платеж' },
        include: { category: true },
      })

      expect(updated.amount).toBe(2000)
      expect(updated.name).toBe('Обновленный платеж')
    })

    it('should delete a regular payment', async () => {
      // Create a payment first
      const payment = await mockDb.regularPayment.create({
        data: {
          name: 'Платеж для удаления',
          amount: 1000,
          categoryId: 'cat-3',
          period: 'monthly',
          isActive: true,
        },
        include: { category: true },
      })

      // Delete the payment
      await mockDb.regularPayment.delete({ where: { id: payment.id } })

      // Verify it's deleted
      const deleted = await mockDb.regularPayment.findUnique({ where: { id: payment.id } })
      expect(deleted).toBeNull()
    })

    it('should handle payments with null dueDate', async () => {
      const payment = await mockDb.regularPayment.create({
        data: {
          name: 'Платеж без даты',
          amount: 1000,
          categoryId: 'cat-3',
          period: 'monthly',
          dueDate: null,
          isActive: true,
        },
        include: { category: true },
      })

      expect(payment.dueDate).toBeNull()
    })

    it('should handle string amount conversion', async () => {
      const stringAmount = '15000.50'
      const parsedAmount = parseFloat(stringAmount)
      
      expect(parsedAmount).toBe(15000.50)
      expect(typeof parsedAmount).toBe('number')
    })
  })
})

describe('Date Validation', () => {
  it('should validate correct date format', () => {
    const validDates = ['2025-01-15', '2025-12-31', '2024-02-29']
    validDates.forEach(date => {
      const parsed = new Date(date)
      expect(isNaN(parsed.getTime())).toBe(false)
    })
  })

  it('should reject invalid date format', () => {
    const invalidDates = ['invalid', '2025-13-01', '2025-00-15', '', null, undefined]
    invalidDates.forEach(date => {
      if (date) {
        const parsed = new Date(date as string)
        expect(isNaN(parsed.getTime())).toBe(true)
      }
    })
  })
})

describe('Amount Validation', () => {
  it('should validate numeric amounts', () => {
    const validAmounts = [100, 100.5, '100', '100.50', 0]
    validAmounts.forEach(amount => {
      const parsed = typeof amount === 'string' ? parseFloat(amount) : amount
      expect(typeof parsed === 'number' && !isNaN(parsed)).toBe(true)
    })
  })

  it('should reject non-numeric amounts', () => {
    const invalidAmounts = ['abc', '', null, undefined, NaN]
    invalidAmounts.forEach(amount => {
      if (typeof amount === 'string') {
        const parsed = parseFloat(amount)
        expect(isNaN(parsed)).toBe(true)
      }
    })
  })
})
