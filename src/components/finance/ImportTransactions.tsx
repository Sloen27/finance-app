'use client'

import { useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { useFinanceStore } from '@/store/finance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
  Upload, FileSpreadsheet, Sparkles, CheckCircle2, AlertCircle,
  Loader2, ChevronDown, ChevronUp, Eye, EyeOff
} from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface ParsedRow {
  date: Date
  amount: number
  currency: string
  description: string
  bankCategory: string
  type: 'income' | 'expense'
  selected: boolean
  categoryId: string
  comment: string
}

interface ImportTransactionsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: (transactions: any[]) => void
}

// T-Bank / Tinkoff column indices
const COL = {
  DATE: 0,
  STATUS: 3,
  AMOUNT: 4,
  CURRENCY: 5,
  BANK_CATEGORY: 9,
  DESCRIPTION: 11,
}

// Bank category → app category name mapping hints
const BANK_CATEGORY_MAP: Record<string, string> = {
  'Супермаркеты': 'Еда',
  'Фастфуд': 'Еда',
  'Рестораны': 'Еда',
  'Такси': 'Транспорт',
  'Местный транспорт': 'Транспорт',
  'Заправки': 'Транспорт',
  'Автоуслуги': 'Транспорт',
  'Ж/д билеты': 'Транспорт',
  'Медицина': 'Здоровье',
  'Зарплата': 'Зарплата',
  'Пополнения': 'Прочие доходы',
  'Проценты': 'Прочие доходы',
  'Бонусы': 'Прочие доходы',
  'ЖКХ': 'Коммунальные',
  'Онлайн-кинотеатры': 'Подписки',
  'Цифровые товары': 'Подписки',
  'Различные товары': 'Покупки',
  'Различные услуги': 'Прочее',
  'Услуги банка': 'Кредиты',
  'НКО': 'Прочее',
  'Лотереи': 'Развлечения',
  'Сервис': 'Подписки',
}

export function ImportTransactions({ open, onOpenChange, onImported }: ImportTransactionsProps) {
  const { categories, addTransaction } = useFinanceStore()

  const [rows, setRows] = useState<ParsedRow[]>([])
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload')
  const [importProgress, setImportProgress] = useState(0)
  const [importResult, setImportResult] = useState<{ created: number; errors: number } | null>(null)
  const [isCategorizingLLM, setIsCategorizingLLM] = useState(false)
  const [llmError, setLlmError] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [openrouterKey, setOpenrouterKey] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('openrouter_api_key') || '' : ''
  )
  const [llmModel, setLlmModel] = useState('openai/gpt-4o-mini')
  const [fileName, setFileName] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const expenseCategories = categories.filter(c => c.type === 'expense')
  const incomeCategories = categories.filter(c => c.type === 'income')

  // Auto-match category by bank name
  const autoMatchCategory = useCallback((bankCategory: string, type: 'income' | 'expense'): string => {
    const hint = BANK_CATEGORY_MAP[bankCategory]
    const pool = type === 'income' ? incomeCategories : expenseCategories
    if (hint) {
      const match = pool.find(c => c.name.toLowerCase().includes(hint.toLowerCase()) ||
        hint.toLowerCase().includes(c.name.toLowerCase()))
      if (match) return match.id
    }
    const directMatch = pool.find(c =>
      c.name.toLowerCase() === bankCategory.toLowerCase()
    )
    if (directMatch) return directMatch.id
    const fallback = pool.find(c => c.name === 'Прочее' || c.name === 'Прочие доходы')
    return fallback?.id || (pool[0]?.id ?? '')
  }, [expenseCategories, incomeCategories])

  const parseFile = (file: File) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array', cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: 'yyyy-mm-dd hh:mm:ss' }) as any[][]

        const parsed: ParsedRow[] = []
        for (let i = 1; i < raw.length; i++) {
          const row = raw[i]
          if (!row || row.length < 12) continue

          // Skip failed transactions
          const status = String(row[COL.STATUS] || '').trim()
          if (status === 'FAILED') continue

          // Parse amount
          const rawAmount = parseFloat(String(row[COL.AMOUNT] || '0').replace(',', '.'))
          if (isNaN(rawAmount) || rawAmount === 0) continue

          // Skip bank service rows without real description
          const description = String(row[COL.DESCRIPTION] || '').trim()
          if (!description) continue

          // Parse date
          let date: Date
          const rawDate = row[COL.DATE]
          if (rawDate instanceof Date) {
            date = rawDate
          } else {
            date = new Date(String(rawDate))
          }
          if (isNaN(date.getTime())) continue

          const type: 'income' | 'expense' = rawAmount >= 0 ? 'income' : 'expense'
          const bankCategory = String(row[COL.BANK_CATEGORY] || '').trim()
          const currency = String(row[COL.CURRENCY] || 'RUB').trim()
          const categoryId = autoMatchCategory(bankCategory, type)

          parsed.push({
            date,
            amount: Math.abs(rawAmount),
            currency,
            description,
            bankCategory,
            type,
            selected: true,
            categoryId,
            comment: description,
          })
        }

        setRows(parsed)
        setStep('preview')
      } catch (err) {
        console.error('Parse error:', err)
        alert('Ошибка при чтении файла. Убедитесь, что это выписка T-Bank / Тинькофф в формате .xlsx')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      parseFile(file)
    }
  }

  const handleCategorizeLLM = async () => {
    if (!openrouterKey.trim()) {
      setLlmError('Введите OpenRouter API ключ')
      setShowSettings(true)
      return
    }
    setLlmError('')
    setIsCategorizingLLM(true)

    // Save key for future sessions
    localStorage.setItem('openrouter_api_key', openrouterKey.trim())

    try {
      const selectedRows = rows.filter(r => r.selected)
      const allCats = categories.map(c => ({ id: c.id, name: c.name, type: c.type }))

      const response = await fetch('/api/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: selectedRows.map((r, i) => ({
            index: i,
            description: r.description,
            bankCategory: r.bankCategory,
            amount: r.type === 'income' ? r.amount : -r.amount,
          })),
          categories: allCats,
          apiKey: openrouterKey.trim(),
          model: llmModel,
        })
      })

      const data = await response.json()
      if (!response.ok) {
        setLlmError(data.error || 'Ошибка OpenRouter')
        return
      }

      // Apply LLM results
      const resultsMap: Record<number, string> = {}
      for (const r of (data.results || [])) {
        resultsMap[r.index] = r.categoryId
      }

      let selectedIdx = 0
      setRows(prev => prev.map(row => {
        if (!row.selected) return row
        const catId = resultsMap[selectedIdx]
        selectedIdx++
        if (catId && categories.find(c => c.id === catId)) {
          return { ...row, categoryId: catId }
        }
        return row
      }))
    } catch (err) {
      setLlmError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setIsCategorizingLLM(false)
    }
  }

  const handleImport = async () => {
    const selected = rows.filter(r => r.selected && r.categoryId)
    if (selected.length === 0) return

    setStep('importing')
    setImportProgress(0)

    const batch = selected.map(r => ({
      type: r.type,
      amount: r.amount,
      currency: r.currency,
      categoryId: r.categoryId,
      date: r.date.toISOString(),
      comment: r.comment || null,
    }))

    try {
      const response = await fetch('/api/import-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: batch })
      })

      const data = await response.json()
      setImportProgress(100)
      setImportResult({ created: data.created || 0, errors: data.errors || 0 })
      setStep('done')

      if (data.transactions?.length) {
        onImported(data.transactions)
      }
    } catch (err) {
      alert('Ошибка при импорте: ' + (err instanceof Error ? err.message : String(err)))
      setStep('preview')
    }
  }

  const handleClose = () => {
    setRows([])
    setStep('upload')
    setImportResult(null)
    setImportProgress(0)
    setLlmError('')
    setFileName('')
    onOpenChange(false)
  }

  const selectedCount = rows.filter(r => r.selected).length
  const incomeCount = rows.filter(r => r.selected && r.type === 'income').length
  const expenseCount = rows.filter(r => r.selected && r.type === 'expense').length

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Импорт выписки T-Bank / Тинькофф
          </DialogTitle>
          <DialogDescription>
            Загрузите файл .xlsx из приложения T-Bank → История операций → Выгрузить выписку
          </DialogDescription>
        </DialogHeader>

        {/* STEP: UPLOAD */}
        {step === 'upload' && (
          <div
            className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-1">Перетащите файл сюда</p>
            <p className="text-sm text-muted-foreground mb-4">или нажмите для выбора файла</p>
            <Button variant="outline">Выбрать файл .xlsx</Button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
          </div>
        )}

        {/* STEP: PREVIEW */}
        {step === 'preview' && (
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            {/* Stats */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted-foreground">{fileName}</span>
              <Badge variant="outline">{rows.length} операций</Badge>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                ↑ {incomeCount} доходов
              </Badge>
              <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                ↓ {expenseCount} расходов
              </Badge>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(s => !s)}
                >
                  {showSettings ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                  OpenRouter
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleCategorizeLLM}
                  disabled={isCategorizingLLM}
                >
                  {isCategorizingLLM
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Категоризация...</>
                    : <><Sparkles className="h-4 w-4 mr-2" />Авто-категории (LLM)</>
                  }
                </Button>
              </div>
            </div>

            {/* OpenRouter Settings */}
            {showSettings && (
              <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                <p className="text-sm font-medium">Настройки OpenRouter</p>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      type={showApiKey ? 'text' : 'password'}
                      placeholder="sk-or-v1-..."
                      value={openrouterKey}
                      onChange={e => setOpenrouterKey(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-7 w-7"
                      onClick={() => setShowApiKey(s => !s)}
                    >
                      {showApiKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </div>
                  <Select value={llmModel} onValueChange={setLlmModel}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai/gpt-4o-mini">GPT-4o Mini (быстро)</SelectItem>
                      <SelectItem value="openai/gpt-4o">GPT-4o (точнее)</SelectItem>
                      <SelectItem value="anthropic/claude-3-haiku">Claude 3 Haiku</SelectItem>
                      <SelectItem value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</SelectItem>
                      <SelectItem value="google/gemini-flash-1.5">Gemini Flash 1.5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ключ сохраняется в браузере. Получить:{' '}
                  <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="underline">
                    openrouter.ai/keys
                  </a>
                </p>
                {llmError && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />{llmError}
                  </p>
                )}
              </div>
            )}

            {/* Select All / Deselect */}
            <div className="flex items-center gap-2 text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRows(prev => prev.map(r => ({ ...r, selected: true })))}
              >
                Выбрать все
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRows(prev => prev.map(r => ({ ...r, selected: false })))}
              >
                Снять все
              </Button>
              <span className="text-muted-foreground ml-2">Выбрано: {selectedCount}</span>
            </div>

            {/* Table */}
            <ScrollArea className="flex-1 border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="w-8 p-2"></th>
                    <th className="p-2 text-left font-medium">Дата</th>
                    <th className="p-2 text-left font-medium">Описание</th>
                    <th className="p-2 text-left font-medium">Банк. категория</th>
                    <th className="p-2 text-right font-medium">Сумма</th>
                    <th className="p-2 text-left font-medium min-w-[160px]">Категория в приложении</th>
                    <th className="p-2 text-left font-medium">Комментарий</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={i}
                      className={`border-t transition-colors ${
                        row.selected ? 'hover:bg-accent/50' : 'opacity-40 bg-muted/20'
                      }`}
                    >
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={e => setRows(prev =>
                            prev.map((r, j) => j === i ? { ...r, selected: e.target.checked } : r)
                          )}
                          className="cursor-pointer"
                        />
                      </td>
                      <td className="p-2 whitespace-nowrap text-muted-foreground">
                        {format(row.date, 'd MMM', { locale: ru })}
                      </td>
                      <td className="p-2 max-w-[160px] truncate" title={row.description}>
                        {row.description}
                      </td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-xs font-normal">
                          {row.bankCategory}
                        </Badge>
                      </td>
                      <td className={`p-2 text-right font-medium whitespace-nowrap ${
                        row.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {row.type === 'income' ? '+' : '-'}
                        {row.amount.toLocaleString('ru-RU')} {row.currency}
                      </td>
                      <td className="p-2">
                        <Select
                          value={row.categoryId}
                          onValueChange={catId =>
                            setRows(prev => prev.map((r, j) => j === i ? { ...r, categoryId: catId } : r))
                          }
                        >
                          <SelectTrigger className="h-7 text-xs w-full">
                            <SelectValue placeholder="Выбрать..." />
                          </SelectTrigger>
                          <SelectContent>
                            {(row.type === 'income' ? incomeCategories : expenseCategories).map(c => (
                              <SelectItem key={c.id} value={c.id}>
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color || '#888' }} />
                                  {c.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Input
                          className="h-7 text-xs"
                          value={row.comment}
                          onChange={e =>
                            setRows(prev => prev.map((r, j) => j === i ? { ...r, comment: e.target.value } : r))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </div>
        )}

        {/* STEP: IMPORTING */}
        {step === 'importing' && (
          <div className="py-12 space-y-4 text-center">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
            <p className="text-lg font-medium">Импортируем транзакции...</p>
            <Progress value={importProgress} className="max-w-sm mx-auto" />
          </div>
        )}

        {/* STEP: DONE */}
        {step === 'done' && importResult && (
          <div className="py-12 space-y-4 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
            <p className="text-xl font-bold">Импорт завершён!</p>
            <div className="flex justify-center gap-4">
              <Badge className="text-base px-4 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                ✓ Добавлено: {importResult.created}
              </Badge>
              {importResult.errors > 0 && (
                <Badge variant="destructive" className="text-base px-4 py-1">
                  ✗ Ошибок: {importResult.errors}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Транзакции добавлены. Обновите страницу, чтобы увидеть все изменения.
            </p>
          </div>
        )}

        <DialogFooter className="mt-4">
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>Отмена</Button>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                ← Назад
              </Button>
              <Button
                onClick={handleImport}
                disabled={selectedCount === 0}
              >
                Импортировать {selectedCount} транзакций
              </Button>
            </>
          )}
          {step === 'done' && (
            <Button onClick={handleClose}>Готово</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
