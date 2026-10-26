'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  User as UserIcon,
  Mail,
  Wallet,
  Tag,
  ShoppingBag,
  Sparkles,
  Save,
  RotateCcw,
  Check,
  Plus,
  X,
  ShieldCheck,
  Sliders,
  Layers,
  Loader2,
  Calendar,
  Store,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAppStore } from '@/lib/store'
import { PERSONA_LABELS, type Platform } from '@/lib/types'
import { ALL_PLATFORMS, platformColor, platformLabel } from '@/lib/ui-utils'
import { toast } from 'sonner'

const BUDGET_PRESETS = [
  { id: 'under-5000', label: 'Under ₹5,000', desc: 'Entry-level / Essentials' },
  { id: '5000-15000', label: '₹5,000 – ₹15,000', desc: 'Budget-friendly / Value' },
  { id: '15000-30000', label: '₹15,000 – ₹30,000', desc: 'Mid-range smart buys' },
  { id: '30000-50000', label: '₹30,000 – ₹50,000', desc: 'Upper mid-range / Tech' },
  { id: '50000-80000', label: '₹50,000 – ₹80,000', desc: 'High-performance / Premium' },
  { id: '80000-plus', label: '₹80,000+', desc: 'Flagship / Luxury Tier' },
]

const POPULAR_BRANDS = [
  'Apple',
  'Samsung',
  'Sony',
  'OnePlus',
  'Nike',
  'Adidas',
  'Lenovo',
  'HP',
  'Dell',
  'Puma',
  'boAt',
  'Asics',
  'Zara',
  'Uniqlo',
]

const CATEGORY_OPTIONS = [
  ['phone', '📱 Smartphones'],
  ['laptop', '💻 Laptops'],
  ['earbuds', '🎧 Audio / Earbuds'],
  ['fashion', '👕 Fashion & Apparel'],
  ['shoes', '👟 Footwear'],
  ['home', '🏠 Home & Kitchen'],
  ['gaming', '🎮 Gaming & Consoles'],
  ['electronics', '📷 Cameras & Gadgets'],
  ['beauty', '💄 Beauty & Personal Care'],
  ['books', '📚 Books & Stationery'],
  ['travel', '🧳 Travel & Luggage'],
  ['other', '✨ Other Specials'],
]

const SHOPPING_STYLES = [
  { id: 'The Researcher', title: 'The Researcher', desc: 'Compares every spec and deal before buying.' },
  { id: 'The Quick Decider', title: 'The Quick Decider', desc: 'Knows what they want and buys quickly.' },
  { id: 'The Deal Hunter', title: 'The Deal Hunter', desc: 'Waits for discounts, price drops, and lowest rates.' },
  { id: 'The Quality Seeker', title: 'The Quality Seeker', desc: 'Focuses on durability, brand reputation, and quality.' },
  { id: 'The Balanced Shopper', title: 'The Balanced Shopper', desc: 'Looks for the best overall value for the price.' },
]

const BUDGET_STYLES = [
  { id: 'Value-focused', label: 'Value-Focused', desc: 'Maximum performance for every rupee.' },
  { id: 'Strict limit', label: 'Strict Limit', desc: 'Never exceed the maximum budget threshold.' },
  { id: 'Deal Hunter', label: 'Deal Hunter', desc: 'Flexible if there is a massive promotional discount.' },
  { id: 'Quality-first', label: 'Quality First', desc: 'Willing to spend more for top tier quality.' },
]

interface ProfileDataResponse {
  user: {
    id: string
    name: string
    email: string
    personaCluster: string | null
    twinConfidence: number
    memoryEnabled: boolean
    personalizationEnabled: boolean
    hasOnboarded: boolean
    createdAt: string
  }
  preferences: {
    categories: string[]
    brands: string[]
    budgetRange: string
    budgetRangeLabel: string
    budgetStyle: string
    platforms: Platform[]
    shoppingFrequency: string
    shoppingStyle: string
    purchasePriorities: string[]
    discountImportance: number
    deliverySpeed: number
    lifestyle?: string
  }
  stats: {
    memoriesCount: number
    wishlistCount: number
    connectedCount: number
  }
}

export function ProfileView() {
  const qc = useQueryClient()
  const updateUser = useAppStore((s) => s.updateUser)
  const storeUser = useAppStore((s) => s.user)

  // Local form state
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [budgetRange, setBudgetRange] = React.useState('30000-50000')
  const [budgetRangeLabel, setBudgetRangeLabel] = React.useState('₹30,000 – ₹50,000')
  const [budgetStyle, setBudgetStyle] = React.useState('Value-focused')
  const [brands, setBrands] = React.useState<string[]>([])
  const [categories, setCategories] = React.useState<string[]>([])
  const [platforms, setPlatforms] = React.useState<Platform[]>(['amazon', 'flipkart'])
  const [shoppingStyle, setShoppingStyle] = React.useState('The Balanced Shopper')
  const [shoppingFrequency, setShoppingFrequency] = React.useState('monthly')
  const [discountImportance, setDiscountImportance] = React.useState(3)
  const [deliverySpeed, setDeliverySpeed] = React.useState(3)
  const [customBrandInput, setCustomBrandInput] = React.useState('')
  const [isDirty, setIsDirty] = React.useState(false)

  const { data, isLoading } = useQuery<ProfileDataResponse>({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await fetch('/api/profile')
      if (!res.ok) throw new Error('Failed to fetch profile')
      return res.json()
    },
  })

  // Synchronize local form when backend data arrives
  React.useEffect(() => {
    if (data) {
      setName(data.user.name || '')
      setEmail(data.user.email || '')
      setBudgetRange(data.preferences.budgetRange || '30000-50000')
      setBudgetRangeLabel(data.preferences.budgetRangeLabel || '₹30,000 – ₹50,000')
      setBudgetStyle(data.preferences.budgetStyle || 'Value-focused')
      setBrands(data.preferences.brands || [])
      setCategories(data.preferences.categories || [])
      setPlatforms(data.preferences.platforms || ['amazon', 'flipkart'])
      setShoppingStyle(data.preferences.shoppingStyle || 'The Balanced Shopper')
      setShoppingFrequency(data.preferences.shoppingFrequency || 'monthly')
      setDiscountImportance(data.preferences.discountImportance ?? 3)
      setDeliverySpeed(data.preferences.deliverySpeed ?? 3)
      setIsDirty(false)
    }
  }, [data])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          budgetRange,
          budgetRangeLabel,
          budgetStyle,
          brands,
          categories,
          platforms,
          shoppingStyle,
          shoppingFrequency,
          discountImportance,
          deliverySpeed,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update profile')
      }
      return res.json()
    },
    onSuccess: (resData) => {
      if (resData.user) {
        updateUser({
          name: resData.user.name,
          email: resData.user.email,
          personaCluster: resData.user.personaCluster,
          twinConfidence: resData.user.twinConfidence,
        })
      }
      qc.invalidateQueries({ queryKey: ['profile'] })
      qc.invalidateQueries({ queryKey: ['onboarding-preferences'] })
      qc.invalidateQueries({ queryKey: ['digital-twin'] })
      qc.invalidateQueries({ queryKey: ['boot'] })
      setIsDirty(false)
      toast.success('Profile and preferences updated successfully!')
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Could not save profile changes.')
    },
  })

  function handleAddBrand(brandToAdd: string) {
    const trimmed = brandToAdd.trim()
    if (!trimmed) return
    if (!brands.some((b) => b.toLowerCase() === trimmed.toLowerCase())) {
      setBrands([...brands, trimmed])
      setIsDirty(true)
    }
    setCustomBrandInput('')
  }

  function handleRemoveBrand(brandToRemove: string) {
    setBrands(brands.filter((b) => b.toLowerCase() !== brandToRemove.toLowerCase()))
    setIsDirty(true)
  }

  function toggleCategory(catId: string) {
    if (categories.includes(catId)) {
      setCategories(categories.filter((c) => c !== catId))
    } else {
      setCategories([...categories, catId])
    }
    setIsDirty(true)
  }

  function togglePlatform(platformId: Platform) {
    if (platforms.includes(platformId)) {
      if (platforms.length === 1) {
        toast.info('Keep at least one preferred shopping platform selected.')
        return
      }
      setPlatforms(platforms.filter((p) => p !== platformId))
    } else {
      setPlatforms([...platforms, platformId])
    }
    setIsDirty(true)
  }

  function handleSelectBudgetPreset(preset: (typeof BUDGET_PRESETS)[number]) {
    setBudgetRange(preset.id)
    setBudgetRangeLabel(preset.label)
    setIsDirty(true)
  }

  function handleReset() {
    if (data) {
      setName(data.user.name || '')
      setEmail(data.user.email || '')
      setBudgetRange(data.preferences.budgetRange || '30000-50000')
      setBudgetRangeLabel(data.preferences.budgetRangeLabel || '₹30,000 – ₹50,000')
      setBudgetStyle(data.preferences.budgetStyle || 'Value-focused')
      setBrands(data.preferences.brands || [])
      setCategories(data.preferences.categories || [])
      setPlatforms(data.preferences.platforms || ['amazon', 'flipkart'])
      setShoppingStyle(data.preferences.shoppingStyle || 'The Balanced Shopper')
      setShoppingFrequency(data.preferences.shoppingFrequency || 'monthly')
      setDiscountImportance(data.preferences.discountImportance ?? 3)
      setDeliverySpeed(data.preferences.deliverySpeed ?? 3)
      setIsDirty(false)
      toast.info('Changes reset to last saved state.')
    }
  }

  const activePersona = storeUser?.personaCluster && PERSONA_LABELS[storeUser.personaCluster]
    ? PERSONA_LABELS[storeUser.personaCluster]
    : null

  const initials = (name || storeUser?.name || 'User')
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  if (isLoading && !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-xs text-muted-foreground">Loading your profile & preferences…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* Profile Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card/90 to-emerald-500/5 p-6 shadow-sm">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl font-bold text-white shadow-lg shadow-emerald-500/20">
              {initials}
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-background border border-emerald-500 text-emerald-500 text-[11px] shadow">
                <Check className="h-3.5 w-3.5" />
              </span>
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                  {name || 'Your Profile'}
                </h1>
                {activePersona && (
                  <Badge
                    variant="secondary"
                    className="gap-1 border px-2.5 py-0.5 text-xs font-semibold shadow-xs"
                    style={{
                      backgroundColor: `${activePersona.color}18`,
                      color: activePersona.color,
                      borderColor: `${activePersona.color}40`,
                    }}
                  >
                    <span>{activePersona.emoji}</span>
                    <span>{activePersona.label}</span>
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-emerald-500" />
                  {email || storeUser?.email || 'No email attached'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  Twin Confidence: {storeUser?.twinConfidence ?? data?.user.twinConfidence ?? 0}%
                </span>
                {data?.user.createdAt && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Member since {new Date(data.user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick save button in header */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            {isDirty && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="gap-1 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !isDirty}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {isDirty ? 'Save Changes' : 'Saved'}
            </Button>
          </div>
        </div>

        {/* Quick Insights Row */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 pt-4 border-t border-border/50 text-xs">
          <div className="rounded-xl border border-border/50 bg-background/50 p-2.5">
            <div className="text-muted-foreground flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-emerald-500" /> Current Budget
            </div>
            <div className="mt-1 font-semibold text-foreground truncate">
              {budgetRangeLabel || 'Not set'}
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-background/50 p-2.5">
            <div className="text-muted-foreground flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-teal-500" /> Preferred Brands
            </div>
            <div className="mt-1 font-semibold text-foreground">
              {brands.length} brand{brands.length === 1 ? '' : 's'}
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-background/50 p-2.5">
            <div className="text-muted-foreground flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5 text-sky-500" /> Categories
            </div>
            <div className="mt-1 font-semibold text-foreground">
              {categories.length} tracked
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-background/50 p-2.5">
            <div className="text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> AI Memories
            </div>
            <div className="mt-1 font-semibold text-foreground">
              {data?.stats?.memoriesCount ?? 0} active signals
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="basic" className="rounded-lg text-xs gap-1.5">
            <UserIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Basic Info</span>
            <span className="sm:hidden">Info</span>
          </TabsTrigger>
          <TabsTrigger value="budget" className="rounded-lg text-xs gap-1.5">
            <Wallet className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Budget & Spending</span>
            <span className="sm:hidden">Budget</span>
          </TabsTrigger>
          <TabsTrigger value="brands" className="rounded-lg text-xs gap-1.5">
            <Tag className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Brands & Categories</span>
            <span className="sm:hidden">Brands</span>
          </TabsTrigger>
          <TabsTrigger value="habits" className="rounded-lg text-xs gap-1.5">
            <Sliders className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Shopping Habits</span>
            <span className="sm:hidden">Habits</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: BASIC INFORMATION */}
        <TabsContent value="basic" className="space-y-4 focus-visible:outline-none">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-emerald-500" /> Basic Account Information
              </CardTitle>
              <CardDescription className="text-xs">
                Your personal details used across shopDitto and agent conversations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profile-name" className="text-xs font-semibold">
                    Display Name
                  </Label>
                  <Input
                    id="profile-name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      setIsDirty(true)
                    }}
                    placeholder="e.g. Alex Hunter"
                    className="text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    This is how the shopping agents and conversational assistant address you.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-email" className="text-xs font-semibold">
                    Email Address
                  </Label>
                  <Input
                    id="profile-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setIsDirty(true)
                    }}
                    placeholder="e.g. alex@example.com"
                    className="text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Used for logging into shopDitto and sending price drop alerts.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
                <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" /> Account Security & Intelligence
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg border border-border/40 bg-background/50">
                    <span className="text-muted-foreground text-[11px]">User Account ID</span>
                    <div className="font-mono text-[11px] mt-0.5 text-foreground truncate">
                      {data?.user.id || storeUser?.id}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/40 bg-background/50">
                    <span className="text-muted-foreground text-[11px]">Memory Status</span>
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {storeUser?.memoryEnabled ? 'Active (Continuous)' : 'Paused'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/40 bg-background/50">
                    <span className="text-muted-foreground text-[11px]">Personalization</span>
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {storeUser?.personalizationEnabled ? 'Enabled (Full)' : 'Standard'}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: BUDGET & SPENDING */}
        <TabsContent value="budget" className="space-y-4 focus-visible:outline-none">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-500" /> Target Budget & Spending Tier
              </CardTitle>
              <CardDescription className="text-xs">
                Agents calibrate recommendation price filters, budget warnings, and deal calculations according to this range.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Presets Grid */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Select Your Standard Shopping Range</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {BUDGET_PRESETS.map((preset) => {
                    const isSelected = budgetRange === preset.id || budgetRangeLabel === preset.label
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectBudgetPreset(preset)}
                        className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500/10 shadow-xs ring-1 ring-emerald-500'
                            : 'border-border/60 hover:border-border hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={`text-sm font-semibold ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                            {preset.label}
                          </span>
                          {isSelected && <Check className="h-4 w-4 text-emerald-500 shrink-0" />}
                        </div>
                        <span className="text-[11px] text-muted-foreground mt-1">
                          {preset.desc}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Budget Style */}
              <div className="space-y-2 pt-2 border-t border-border/50">
                <Label className="text-xs font-semibold">Budget Discipline & Strategy</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {BUDGET_STYLES.map((style) => {
                    const isSelected = budgetStyle === style.id
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => {
                          setBudgetStyle(style.id)
                          setIsDirty(true)
                        }}
                        className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500/10 shadow-xs ring-1 ring-emerald-500'
                            : 'border-border/60 hover:border-border hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={`text-sm font-medium ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                            {style.label}
                          </span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                        </div>
                        <span className="text-[11px] text-muted-foreground mt-0.5">
                          {style.desc}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Discount Sensitivity */}
              <div className="space-y-3 pt-2 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Discount & Promotion Weight</Label>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    Level {discountImportance} / 5
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => {
                        setDiscountImportance(lvl)
                        setIsDirty(true)
                      }}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                        discountImportance === lvl
                          ? 'border-emerald-500 bg-emerald-600 text-white shadow-xs'
                          : 'border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {lvl === 1 ? 'Low (1)' : lvl === 5 ? 'Max (5)' : lvl}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Higher discount weight pushes our MARE scoring engine to favor products with deep price cuts and sale events.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: BRANDS & CATEGORIES */}
        <TabsContent value="brands" className="space-y-4 focus-visible:outline-none">
          {/* BRANDS CARD */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4 text-emerald-500" /> Preferred Brands
              </CardTitle>
              <CardDescription className="text-xs">
                Add, remove, or customize brands you trust. shopDitto ranks these higher in search, comparison verdicts, and recommendations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Active Brands Pills */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Your Selected Brands ({brands.length})</Label>
                  {brands.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setBrands([])
                        setIsDirty(true)
                      }}
                      className="text-[11px] text-rose-500 hover:underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 min-h-[44px] p-3 rounded-xl border border-border/60 bg-muted/20">
                  {brands.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic">
                      No brands selected. Pick from popular brands below or add your own!
                    </span>
                  ) : (
                    brands.map((b) => (
                      <span
                        key={b}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-foreground transition-all hover:bg-emerald-500/20"
                      >
                        <span>{b}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBrand(b)}
                          className="rounded-full p-0.5 text-muted-foreground hover:bg-emerald-500/30 hover:text-foreground"
                          aria-label={`Remove brand ${b}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Add Custom Brand Input */}
              <div className="space-y-2">
                <Label htmlFor="custom-brand" className="text-xs font-semibold">
                  Add Any Brand
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="custom-brand"
                    value={customBrandInput}
                    onChange={(e) => setCustomBrandInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddBrand(customBrandInput)
                      }
                    }}
                    placeholder="Type brand name (e.g. Dyson, Bose, Levi's, Puma)..."
                    className="text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleAddBrand(customBrandInput)}
                    disabled={!customBrandInput.trim()}
                    className="gap-1 shrink-0"
                  >
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </div>
              </div>

              {/* Quick Add Popular Brands */}
              <div className="space-y-2 pt-2 border-t border-border/50">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Quick Add Popular Brands
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_BRANDS.map((popBrand) => {
                    const isAdded = brands.some((b) => b.toLowerCase() === popBrand.toLowerCase())
                    return (
                      <button
                        key={popBrand}
                        type="button"
                        onClick={() => {
                          if (isAdded) {
                            handleRemoveBrand(popBrand)
                          } else {
                            handleAddBrand(popBrand)
                          }
                        }}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                          isAdded
                            ? 'border-emerald-500 bg-emerald-500/15 font-semibold text-emerald-700 dark:text-emerald-300'
                            : 'border-border/60 bg-background hover:bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {isAdded ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Plus className="h-3 w-3" />
                        )}
                        {popBrand}
                      </button>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CATEGORIES CARD */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-emerald-500" /> Preferred Product Categories
              </CardTitle>
              <CardDescription className="text-xs">
                Select the types of goods you frequently look for. Our Discover view and Deal recommendations will prioritize them.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {CATEGORY_OPTIONS.map(([catId, label]) => {
                  const isSelected = categories.includes(catId)
                  return (
                    <button
                      key={catId}
                      type="button"
                      onClick={() => toggleCategory(catId)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/10 text-foreground ring-1 ring-emerald-500 shadow-xs'
                          : 'border-border/60 hover:border-border hover:bg-muted/40 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span className="truncate">{label}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 ml-1" />}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: PLATFORMS & HABITS */}
        <TabsContent value="habits" className="space-y-4 focus-visible:outline-none">
          {/* PLATFORMS */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Store className="h-4 w-4 text-emerald-500" /> Preferred Shopping Platforms
              </CardTitle>
              <CardDescription className="text-xs">
                Cross-platform shopping engines will prioritize checking live deals and catalog inventory across these stores.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {ALL_PLATFORMS.map((p) => {
                  const isSelected = platforms.includes(p)
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/60 shadow-xs'
                          : 'border-border/60 hover:bg-muted/40 text-muted-foreground'
                      }`}
                    >
                      <span
                        className="grid h-7 w-7 place-items-center rounded-md text-[10px] font-bold text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: platformColor(p) }}
                      >
                        {platformLabel(p).slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-foreground truncate">
                          {platformLabel(p)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {isSelected ? 'Enabled' : 'Disabled'}
                        </div>
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* SHOPPING STYLE & HABITS */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-500" /> Shopping Style & Delivery Speed
              </CardTitle>
              <CardDescription className="text-xs">
                Helps our Digital Twin calibrate decision-making speed and advice personality.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Style selector */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Your Archetype Style</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SHOPPING_STYLES.map((style) => {
                    const isSelected = shoppingStyle === style.id
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => {
                          setShoppingStyle(style.id)
                          setIsDirty(true)
                        }}
                        className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500/10 shadow-xs ring-1 ring-emerald-500'
                            : 'border-border/60 hover:border-border hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={`text-sm font-semibold ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                            {style.title}
                          </span>
                          {isSelected && <Check className="h-4 w-4 text-emerald-500 shrink-0" />}
                        </div>
                        <span className="text-[11px] text-muted-foreground mt-1">
                          {style.desc}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Shopping Frequency */}
              <div className="space-y-2 pt-2 border-t border-border/50">
                <Label className="text-xs font-semibold">How frequently do you shop online?</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    ['daily', 'Daily'],
                    ['weekly', 'Weekly'],
                    ['monthly', 'Monthly'],
                    ['rarely', 'Rarely'],
                  ].map(([freqKey, label]) => {
                    const isSelected = shoppingFrequency === freqKey
                    return (
                      <button
                        key={freqKey}
                        type="button"
                        onClick={() => {
                          setShoppingFrequency(freqKey)
                          setIsDirty(true)
                        }}
                        className={`py-2 text-xs font-medium rounded-lg border text-center transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-600 text-white shadow-xs'
                            : 'border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Delivery Speed Preference */}
              <div className="space-y-3 pt-2 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Delivery Speed Preference</Label>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {deliverySpeed <= 2 ? 'Standard (3-5 days)' : deliverySpeed === 3 ? 'Fast (1-2 days)' : 'Same-day / Express'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => {
                        setDeliverySpeed(speed)
                        setIsDirty(true)
                      }}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                        deliverySpeed === speed
                          ? 'border-emerald-500 bg-emerald-600 text-white shadow-xs'
                          : 'border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {speed === 1 ? 'Standard' : speed === 5 ? 'Express' : speed}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Floating / Sticky Save Bar when dirty */}
      {isDirty && (
        <div className="sticky bottom-4 z-30 flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/50 bg-background/95 p-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-foreground">You have unsaved changes</span>
            <span className="hidden sm:inline text-muted-foreground">
              (Updating will re-calibrate your AI Digital Twin)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="text-xs"
            >
              Discard
            </Button>
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save Preferences
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
