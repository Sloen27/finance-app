'use client'

import { useState, useEffect } from 'react'
import { useFinanceStore } from '@/store/finance'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Download, Upload, Database, Sun, Moon, RefreshCw, PieChart, Shield, Lock, Sparkles, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'

export function Settings() {
  const { settings, setSettings } = useFinanceStore()

  const [rubToUsdRate, setRubToUsdRate] = useState('0.011')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [isExporting, setIsExporting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // OpenRouter API key (stored in DB)
  const [openrouterKey, setOpenrouterKey] = useState(settings?.openrouterApiKey || '')
  const [openrouterModel, setOpenrouterModel] = useState(settings?.openrouterModel || 'openai/gpt-4o-mini')
  const [showOpenrouterKey, setShowOpenrouterKey] = useState(false)
  const [openrouterSaved, setOpenrouterSaved] = useState(false)
  const [isSavingKey, setIsSavingKey] = useState(false)

  const handleSaveOpenrouterKey = async () => {
    setIsSavingKey(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openrouterApiKey: openrouterKey.trim(), openrouterModel })
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to save settings')
      }
      const data = await response.json()
      setSettings(data)
      setOpenrouterSaved(true)
      setTimeout(() => setOpenrouterSaved(false), 2000)
    } catch (error) {
      console.error('Error saving OpenRouter key:', error)
      alert('Ошибка сохранения ключа: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setIsSavingKey(false)
    }
  }

  // Distribution percentages
  const [mandatoryPercent, setMandatoryPercent] = useState('50')
  const [variablePercent, setVariablePercent] = useState('30')
  const [savingsPercent, setSavingsPercent] = useState('10')
  const [investmentsPercent, setInvestmentsPercent] = useState('10')

  useEffect(() => {
    if (settings) {
      setRubToUsdRate(settings.rubToUsdRate.toString())
      setTheme(settings.theme as 'light' | 'dark')
      setMandatoryPercent(settings.mandatoryPercent?.toString() || '50')
      setVariablePercent(settings.variablePercent?.toString() || '30')
      setSavingsPercent(settings.savingsPercent?.toString() || '10')
      setInvestmentsPercent(settings.investmentsPercent?.toString() || '10')
      setOpenrouterKey(settings.openrouterApiKey || '')
      setOpenrouterModel(settings.openrouterModel || 'openai/gpt-4o-mini')
    }
  }, [settings])

  const totalPercent = parseInt(mandatoryPercent) + parseInt(variablePercent) + parseInt(savingsPercent) + parseInt(investmentsPercent)

  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rubToUsdRate: parseFloat(rubToUsdRate),
          theme,
          mandatoryPercent: parseInt(mandatoryPercent),
          variablePercent: parseInt(variablePercent),
          savingsPercent: parseInt(savingsPercent),
          investmentsPercent: parseInt(investmentsPercent)
        })
      })
      const data = await response.json()
      setSettings(data)
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportCSV = async () => {
    setIsExporting(true)
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transactions.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting CSV:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleBackup = async () => {
    setIsExporting(true)
    try {
      const response = await fetch('/api/export')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `finance-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error creating backup:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    setTheme(newTheme)
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme })
      })
      const data = await response.json()
      setSettings(data)

      // Apply theme
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(newTheme)
    } catch (error) {
      console.error('Error updating theme:', error)
    }
  }

  const handleChangePassword = async () => {
    setPasswordError('')
    setPasswordSuccess('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Заполните все поля')
      return
    }

    if (newPassword.length < 4) {
      setPasswordError('Новый пароль должен быть не менее 4 символов')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Новые пароли не совпадают')
      return
    }

    setIsChangingPassword(true)

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      })

      const data = await response.json()

      if (response.ok) {
        setPasswordSuccess('Пароль успешно изменен')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setPasswordError(data.error || 'Ошибка при смене пароля')
      }
    } catch {
      setPasswordError('Ошибка соединения')
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Income Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Распределение дохода
          </CardTitle>
          <CardDescription>
            Настройте проценты для визуального распределения при добавлении дохода
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mandatory">Обязательные расходы (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="mandatory"
                  type="number"
                  min="0"
                  max="100"
                  value={mandatoryPercent}
                  onChange={(e) => setMandatoryPercent(e.target.value)}
                  className="w-24"
                />
                <Progress value={parseInt(mandatoryPercent) || 0} className="flex-1 h-2" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="variable">Переменные расходы (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="variable"
                  type="number"
                  min="0"
                  max="100"
                  value={variablePercent}
                  onChange={(e) => setVariablePercent(e.target.value)}
                  className="w-24"
                />
                <Progress value={parseInt(variablePercent) || 0} className="flex-1 h-2" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="savings">Накопления (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="savings"
                  type="number"
                  min="0"
                  max="100"
                  value={savingsPercent}
                  onChange={(e) => setSavingsPercent(e.target.value)}
                  className="w-24"
                />
                <Progress value={parseInt(savingsPercent) || 0} className="flex-1 h-2" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="investments">Инвестиции (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="investments"
                  type="number"
                  min="0"
                  max="100"
                  value={investmentsPercent}
                  onChange={(e) => setInvestmentsPercent(e.target.value)}
                  className="w-24"
                />
                <Progress value={parseInt(investmentsPercent) || 0} className="flex-1 h-2" />
              </div>
            </div>
          </div>

          <div className={`p-3 rounded-lg ${totalPercent === 100 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
            <p className={`text-sm font-medium ${totalPercent === 100 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
              Всего: {totalPercent}% {totalPercent !== 100 && '(должно быть 100%)'}
            </p>
          </div>

          <Button onClick={handleSaveSettings} disabled={isSaving || totalPercent !== 100}>
            {isSaving ? 'Сохранение...' : 'Сохранить настройки'}
          </Button>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Безопасность
          </CardTitle>
          <CardDescription>
            Измените пароль для доступа к приложению
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="current-password">Текущий пароль</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="pl-10"
                  placeholder="Введите текущий пароль"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password-setting">Новый пароль</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new-password-setting"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10"
                  placeholder="Минимум 4 символа"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password-setting">Подтвердите новый пароль</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm-password-setting"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  placeholder="Повторите новый пароль"
                />
              </div>
            </div>

            {passwordError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm">
                {passwordSuccess}
              </div>
            )}

            <Button onClick={handleChangePassword} disabled={isChangingPassword}>
              {isChangingPassword ? 'Изменение...' : 'Изменить пароль'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Currency Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Курсы валют
          </CardTitle>
          <CardDescription>
            Укажите курс конвертации RUB в USD для отображения общей суммы
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rubToUsd">Курс RUB → USD</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">1 RUB =</span>
                <Input
                  id="rubToUsd"
                  type="number"
                  step="0.0001"
                  value={rubToUsdRate}
                  onChange={(e) => setRubToUsdRate(e.target.value)}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">USD</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Пример: при курсе 90 RUB за 1 USD укажите 0.0111
              </p>
            </div>
          </div>
          <Button onClick={handleSaveSettings} disabled={isSaving}>
            {isSaving ? 'Сохранение...' : 'Сохранить настройки'}
          </Button>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {theme === 'light' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            Оформление
          </CardTitle>
          <CardDescription>
            Выберите светлую или темную тему интерфейса
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div
              className={`flex items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all ${theme === 'light' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
              onClick={() => handleThemeChange('light')}
            >
              <Sun className="h-5 w-5" />
              <span>Светлая</span>
            </div>
            <div
              className={`flex items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all ${theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
              onClick={() => handleThemeChange('dark')}
            >
              <Moon className="h-5 w-5" />
              <span>Темная</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export & Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Экспорт и резервное копирование
          </CardTitle>
          <CardDescription>
            Экспортируйте данные для анализа или создайте резервную копию
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Экспорт в CSV</Label>
              <p className="text-sm text-muted-foreground">
                Экспорт всех транзакций в формат CSV для открытия в Excel
              </p>
              <Button
                variant="outline"
                onClick={handleExportCSV}
                disabled={isExporting}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Экспорт CSV
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Резервная копия</Label>
              <p className="text-sm text-muted-foreground">
                Полная резервная копия базы данных в формате JSON
              </p>
              <Button
                variant="outline"
                onClick={handleBackup}
                disabled={isExporting}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Создать бэкап
              </Button>
            </div>
          </div>

          <Separator />

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Примечание:</strong> Резервная копия содержит все данные приложения,
              включая транзакции, категории, бюджеты и регулярные платежи.
              Сохраните файл в безопасном месте.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* OpenRouter Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Интеграции — OpenRouter
          </CardTitle>
          <CardDescription>
            API ключ для авто-категоризации транзакций через LLM при импорте выписки
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-md">
            <Label htmlFor="openrouter-key">OpenRouter API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="openrouter-key"
                  type={showOpenrouterKey ? 'text' : 'password'}
                  placeholder="sk-or-v1-..."
                  value={openrouterKey}
                  onChange={(e) => setOpenrouterKey(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-7 w-7"
                  onClick={() => setShowOpenrouterKey(s => !s)}
                >
                  {showOpenrouterKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
              </div>
              <Button onClick={handleSaveOpenrouterKey} variant="outline" disabled={isSavingKey}>
                {openrouterSaved
                  ? <><CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />Сохранено</>
                  : isSavingKey ? 'Сохранение...' : 'Сохранить'
                }
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="openrouter-model">Модель по умолчанию</Label>
              <Select value={openrouterModel} onValueChange={setOpenrouterModel}>
                <SelectTrigger id="openrouter-model" className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meta-llama/llama-3.1-8b-instruct:free">🆓 Llama 3.1 8B — бесплатно</SelectItem>
                  <SelectItem value="google/gemini-2.0-flash-exp:free">🆓 Gemini 2.0 Flash — бесплатно</SelectItem>
                  <SelectItem value="deepseek/deepseek-chat:free">🆓 DeepSeek Chat — бесплатно</SelectItem>
                  <SelectItem value="mistralai/mistral-7b-instruct:free">🆓 Mistral 7B — бесплатно</SelectItem>
                  <SelectItem value="openai/gpt-4o-mini">💰 GPT-4o Mini — быстро и дёшево</SelectItem>
                  <SelectItem value="openai/gpt-4o">💰 GPT-4o — точнее</SelectItem>
                  <SelectItem value="anthropic/claude-3-haiku">💰 Claude 3 Haiku</SelectItem>
                  <SelectItem value="anthropic/claude-3.5-sonnet">💰 Claude 3.5 Sonnet — лучшее качество</SelectItem>
                  <SelectItem value="google/gemini-flash-1.5">💰 Gemini Flash 1.5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs text-muted-foreground">
              Ключ хранится в базе данных. Получить ключ:{' '}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-foreground"
              >
                openrouter.ai/keys
              </a>
            </p>
          </div>

          {openrouterKey && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              Ключ задан — авто-категоризация доступна в разделе Транзакции → Импорт
            </div>
          )}
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>О приложении</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong>Персональный финансовый учет</strong> v2.0.0</p>
            <p>Лаконичное веб-приложение для учета личных финансов.</p>
            <Separator className="my-4" />
            <p>Возможности:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Учет доходов и расходов в RUB и USD</li>
              <li>Категоризация транзакций по типам расходов</li>
              <li>Бюджетирование по категориям</li>
              <li>Отслеживание регулярных платежей</li>
              <li>Финансовые цели и накопления</li>
              <li>Инвестиционные счета</li>
              <li>Прогноз и финансовая подушка</li>
              <li>Аналитика и визуализация</li>
              <li>Календарный режим</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
