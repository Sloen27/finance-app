'use client'

import { useState } from 'react'
import { useFinanceStore } from '@/store/finance'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Pencil, Trash2, Palette, Info, FolderOpen, FolderPlus, AlertTriangle, ShoppingCart, Sparkles, TrendingUp, TrendingDown } from 'lucide-react'

interface CategoryFormData {
  name: string
  icon: string
  color: string
  type: string
  expenseType: string
}

const CATEGORY_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#B2BABB', '#82E0AA',
  '#F8B500', '#FF6F61', '#6B5B95', '#88B04B', '#F7CAC9'
]

const CATEGORY_ICONS = [
  'Utensils', 'Car', 'Home', 'CreditCard', 'ShoppingBag',
  'Gamepad2', 'Heart', 'Plane', 'MoreHorizontal', 'Briefcase',
  'Coffee', 'Book', 'Music', 'Gift', 'Sparkles', 'Shield'
]

const EXPENSE_TYPES = [
  { value: 'mandatory', label: 'Обязательные', description: 'Жилье, кредиты, подписки, страховки', icon: AlertTriangle, color: '#FF6B6B' },
  { value: 'variable', label: 'Переменные', description: 'Еда, транспорт, здоровье', icon: ShoppingCart, color: '#4ECDC4' },
  { value: 'discretionary', label: 'Необязательные', description: 'Развлечения, хобби, путешествия', icon: Sparkles, color: '#DDA0DD' }
]

export function Categories() {
  const { categories, addCategory, updateCategory, removeCategory } = useFinanceStore()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense')
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    icon: 'MoreHorizontal',
    color: CATEGORY_COLORS[0],
    type: 'expense',
    expenseType: 'variable'
  })

  // Delete confirmation state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string; isDefault: boolean } | null>(null)

  const openAddDialog = (type: 'expense' | 'income') => {
    setEditingCategory(null)
    setFormData({
      name: '',
      icon: 'MoreHorizontal',
      color: CATEGORY_COLORS[0],
      type: type,
      expenseType: 'variable'
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      alert('Введите название категории')
      return
    }

    try {
      if (editingCategory) {
        const response = await fetch(`/api/categories/${editingCategory}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Ошибка при обновлении')
        }
        const data = await response.json()
        updateCategory(editingCategory, data)
      } else {
        const response = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, isDefault: false })
        })
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Ошибка при создании')
        }
        const data = await response.json()
        addCategory(data)
      }

      setIsDialogOpen(false)
      setEditingCategory(null)
      setFormData({
        name: '',
        icon: 'MoreHorizontal',
        color: CATEGORY_COLORS[0],
        type: activeTab,
        expenseType: 'variable'
      })
    } catch (error) {
      console.error('Error saving category:', error)
      alert(error instanceof Error ? error.message : 'Ошибка при сохранении')
    }
  }

  const handleEdit = (category: typeof categories[0]) => {
    setEditingCategory(category.id)
    setFormData({
      name: category.name,
      icon: category.icon || 'MoreHorizontal',
      color: category.color || CATEGORY_COLORS[0],
      type: category.type || 'expense',
      expenseType: category.expenseType || 'variable'
    })
    setIsDialogOpen(true)
  }

  const handleDeleteClick = (id: string) => {
    const category = categories.find(c => c.id === id)
    if (category) {
      setCategoryToDelete({ id, name: category.name, isDefault: category.isDefault })
      setIsDeleteDialogOpen(true)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return

    try {
      const response = await fetch(`/api/categories/${categoryToDelete.id}`, { method: 'DELETE' })
      if (response.ok) {
        removeCategory(categoryToDelete.id)
      } else {
        const data = await response.json()
        alert(data.error || 'Ошибка при удалении')
      }
    } catch (error) {
      console.error('Error deleting category:', error)
    } finally {
      setIsDeleteDialogOpen(false)
      setCategoryToDelete(null)
    }
  }

  const safeCategories = categories || []
  
  const expenseCategories = safeCategories.filter(c => c.type === 'expense' || !c.type)
  const incomeCategories = safeCategories.filter(c => c.type === 'income')
  
  const defaultExpenseCategories = expenseCategories.filter(c => c.isDefault)
  const customExpenseCategories = expenseCategories.filter(c => !c.isDefault)
  const defaultIncomeCategories = incomeCategories.filter(c => c.isDefault)
  const customIncomeCategories = incomeCategories.filter(c => !c.isDefault)

  const getExpenseTypeLabel = (type: string) => {
    return EXPENSE_TYPES.find(t => t.value === type)?.label || type
  }

  const getExpenseTypeColor = (type: string) => {
    return EXPENSE_TYPES.find(t => t.value === type)?.color || '#888'
  }

  const renderCategoryCard = (category: typeof categories[0], isIncome: boolean) => (
    <div
      key={category.id}
      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-5 h-5 rounded-full shadow-sm"
          style={{ backgroundColor: category.color || '#B2BABB' }}
        />
        <span className="font-medium">{category.name}</span>
        {category.icon && (
          <Badge variant="outline" className="text-xs font-normal">
            {category.icon}
          </Badge>
        )}
        {category.isDefault && (
          <Badge variant="secondary" className="text-xs">
            Базовая
          </Badge>
        )}
        {!isIncome && (
          <Badge
            variant="secondary"
            className="text-xs"
            style={{ 
              backgroundColor: `${getExpenseTypeColor(category.expenseType || 'variable')}20`, 
              color: getExpenseTypeColor(category.expenseType || 'variable') 
            }}
          >
            {getExpenseTypeLabel(category.expenseType || 'variable')}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEdit(category)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Редактировать</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteClick(category.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Удалить</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )

  const renderCategorySection = (
    title: string,
    icon: React.ReactNode,
    categoriesList: typeof safeCategories,
    isIncome: boolean
  ) => (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{categoriesList.length}</span>
      </div>
      <ScrollArea className="h-[200px] pr-2">
        {categoriesList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FolderPlus className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">Нет категорий</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {categoriesList.map(category => renderCategoryCard(category, isIncome))}
          </div>
        )}
      </ScrollArea>
    </div>
  )

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'expense' | 'income')} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="expense" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Категории расходов
          </TabsTrigger>
          <TabsTrigger value="income" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Категории доходов
          </TabsTrigger>
        </TabsList>

        {/* Expense Categories Tab */}
        <TabsContent value="expense" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Типы расходов</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">
                {EXPENSE_TYPES.map(type => {
                  const Icon = type.icon
                  const count = expenseCategories.filter(c => c.expenseType === type.value).length
                  return (
                    <div key={type.value} className="flex items-start gap-3 p-3 rounded-lg border" style={{ borderColor: `${type.color}50` }}>
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${type.color}20` }}>
                        <Icon className="h-4 w-4" style={{ color: type.color }} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{type.label}</p>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                        <p className="text-xs mt-1">{count} категорий</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Категории расходов</CardTitle>
                  <CardDescription>
                    Управляйте категориями для классификации расходов
                  </CardDescription>
                </div>
                <Button onClick={() => openAddDialog('expense')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить категорию
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {renderCategorySection(
                'Базовые категории',
                <FolderOpen className="h-4 w-4 text-muted-foreground" />,
                defaultExpenseCategories,
                false
              )}
              {renderCategorySection(
                'Пользовательские категории',
                <FolderPlus className="h-4 w-4 text-muted-foreground" />,
                customExpenseCategories,
                false
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Income Categories Tab */}
        <TabsContent value="income" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Категории доходов</CardTitle>
                  <CardDescription>
                    Управляйте категориями для классификации доходов
                  </CardDescription>
                </div>
                <Button onClick={() => openAddDialog('income')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить категорию
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {renderCategorySection(
                'Базовые категории',
                <FolderOpen className="h-4 w-4 text-muted-foreground" />,
                defaultIncomeCategories,
                true
              )}
              {renderCategorySection(
                'Пользовательские категории',
                <FolderPlus className="h-4 w-4 text-muted-foreground" />,
                customIncomeCategories,
                true
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Category Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Редактировать категорию' : 'Новая категория'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? 'Измените название, цвет, иконку или тип'
                : `Создайте новую категорию для ${formData.type === 'income' ? 'доходов' : 'расходов'}`
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Например: Продукты"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Тип категории</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      Расход
                    </div>
                  </SelectItem>
                  <SelectItem value="income">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Доход
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.type === 'expense' && (
              <div className="space-y-2">
                <Label>Тип расходов</Label>
                <Select value={formData.expenseType} onValueChange={(v) => setFormData({ ...formData, expenseType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {EXPENSE_TYPES.find(t => t.value === formData.expenseType)?.description}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Цвет
              </Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                      formData.color === color ? 'border-foreground scale-110 ring-2 ring-offset-2 ring-primary' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Иконка</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_ICONS.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-all ${
                      formData.icon === icon
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-accent border-border'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Отмена
              </Button>
              <Button type="submit">
                {editingCategory ? 'Сохранить' : 'Добавить'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить категорию "{categoryToDelete?.name}"?</AlertDialogTitle>
            {categoryToDelete?.isDefault ? (
              <AlertDialogDescription className="space-y-2">
                <span className="text-amber-600 font-medium">Это базовая категория.</span>
                <br />
                Вы уверены, что хотите её удалить? Это действие нельзя отменить.
              </AlertDialogDescription>
            ) : (
              <AlertDialogDescription>
                Это действие нельзя отменить. Категория будет удалена навсегда.
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
