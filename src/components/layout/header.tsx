'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Search,
  LogOut,
  User,
  Menu,
  Package,
  Users,
  Receipt,
  PackageSearch,
  Loader2,
  ArrowRight,
  Settings,
  Sun,
  Moon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRouter, usePathname } from 'next/navigation'
import { NotificationsDropdown } from '@/components/layout/notifications-dropdown'
import { globalSearch } from '@/modules/search/search.actions'
import { formatCurrency } from '@/lib/format'
import {
  saveUserPreferences,
} from '@/lib/user-preferences'

interface HeaderProps {
  user: {
    name: string
    email: string
  }
  onMenuClick?: () => void
}

interface SearchResults {
  products: Array<{
    id: string
    name: string
    barcode: string | null
    salePrice: number
    stock: number
    category: { name: string } | null
  }>
  clients: Array<{ id: string; name: string; phone: string | null }>
  sales: Array<{ id: string; invoiceNumber: string; total: number }>
}

const EMPTY_RESULTS: SearchResults = { products: [], clients: [], sales: [] }

export function Header({ user, onMenuClick }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()

  function handleLogout() {
    router.push('/auth/logout')
  }

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS)
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [isDark, setIsDark] = useState(true)

  const searchBoxRef = useRef<HTMLFormElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const hasResults = results.products.length > 0 || results.clients.length > 0 || results.sales.length > 0

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggleTheme() {
    const nextIsDark = !isDark
    setIsDark(nextIsDark)
    saveUserPreferences({ theme: nextIsDark ? 'dark' : 'light' })
    if (nextIsDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const sectionLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    sales: 'Ventas POS',
    inventory: 'Inventario',
    clients: 'Clientes',
    credits: 'Créditos',
    reports: 'Reportes',
    web: 'Tienda Online',
    admin: 'Configuración',
    assistant: 'Asistente IA',
    profile: 'Mi Perfil',
  }
  const currentSection = pathname.split('/')[1] || 'dashboard'
  const sectionLabel = sectionLabels[currentSection] || 'Dashboard'

  // Cerrar y limpiar búsqueda al cambiar de ruta
  useEffect(() => {
    setOpen(false)
    setQuery('')
    setResults(EMPTY_RESULTS)
  }, [pathname])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  function handleSearchChange(value: string) {
    setQuery(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    // Protección anti-autofill: Solo abrir resultados si el usuario está enfocado activamente en el input
    const isInputFocused = typeof document !== 'undefined' && document.activeElement === searchInputRef.current
    if (!isInputFocused) {
      setOpen(false)
      return
    }

    if (value.trim().length < 2) {
      setResults(EMPTY_RESULTS)
      setOpen(false)
      setSearching(false)
      return
    }

    setOpen(true)
    setSearching(true)
    debounceTimer.current = setTimeout(async () => {
      try {
        const data = await globalSearch(value)
        setResults(data)
      } catch {
        setResults(EMPTY_RESULTS)
      } finally {
        setSearching(false)
      }
    }, 250)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (e.key === 'Enter') {
      const first = results.products[0]
      if (first) {
        e.preventDefault()
        router.push(`/inventory/${first.id}`)
        setOpen(false)
      } else if (hasResults) {
        e.preventDefault()
        router.push('/sales')
        setOpen(false)
      } else if (query.trim().length >= 2) {
        e.preventDefault()
        router.push('/inventory')
        setOpen(false)
      }
    }
  }

  function goToInventory() {
    setOpen(false)
    setQuery('')
    router.push('/inventory')
  }

  function navigate(path: string) {
    setOpen(false)
    setQuery('')
    router.push(path)
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 lg:px-6 sticky top-0 z-30 shrink-0">
      {/* Lado Izquierdo: Menú móvil y Breadcrumbs estilo captura (Dashboard > Overview) */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden shrink-0 rounded-xl text-zinc-500 hover:text-zinc-900"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Breadcrumbs exactos de la captura: Dashboard > Overview */}
        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium">
          <Link
            href="/dashboard"
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            Dashboard
          </Link>
          <span className="text-zinc-300 dark:text-zinc-700 font-normal">›</span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {sectionLabel === 'Dashboard' ? 'Overview' : sectionLabel}
          </span>
        </div>
      </div>

      {/* Lado Derecho: Buscador Search... [⌘ K], Campana, Ajustes y Avatar */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Barra de búsqueda estilo captura con ⌘ K */}
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            if (query.trim().length >= 2) {
              handleKeyDown({ key: 'Enter', preventDefault: () => {} } as React.KeyboardEvent<HTMLInputElement>)
            }
          }}
          autoComplete="off"
          ref={searchBoxRef}
          className="relative hidden sm:block w-48 md:w-60 lg:w-64"
        >
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <Input
            ref={searchInputRef}
            id="nova-global-search-input"
            name="nova_global_search_input"
            type="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
            data-bwignore="true"
            placeholder="Search..."
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (results && query.trim().length >= 2) setOpen(true)
            }}
            onBlur={() => {
              if (debounceTimer.current) clearTimeout(debounceTimer.current)
            }}
            className="w-full pl-8 pr-12 h-8 rounded-lg bg-zinc-50/80 hover:bg-white focus:bg-white dark:bg-zinc-900/60 dark:hover:bg-zinc-900 dark:focus:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-400 transition-all"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium text-zinc-400 bg-white dark:bg-zinc-800 rounded border border-zinc-200/80 dark:border-zinc-700 pointer-events-none">
            ⌘ K
          </kbd>

          {/* Menú flotante de resultados globales */}
          {open && query.trim().length >= 2 && (
            <div className="absolute -left-10 sm:left-0 top-full mt-2 w-[calc(100vw-2.5rem)] sm:w-96 max-w-md z-50 rounded-2xl border border-border/80 bg-popover/98 backdrop-blur-xl text-popover-foreground shadow-2xl overflow-hidden animate-fade-in">
              {searching ? (
                <div className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Buscando en catálogo y ventas...
                </div>
              ) : !hasResults ? (
                <div className="px-4 py-3 text-xs text-muted-foreground">
                  Sin resultados para &quot;{query.trim()}&quot;
                </div>
              ) : (
                <div className="max-h-[65vh] overflow-y-auto py-1 divide-y divide-border/40">
                  {results.products.length > 0 && (
                    <div className="py-1">
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Package className="h-3 w-3" /> Productos
                      </div>
                      {results.products.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => navigate(`/inventory/${p.id}`)}
                          className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-xs hover:bg-muted/50 transition-colors"
                        >
                          <span className="flex flex-col min-w-0">
                            <span className="font-semibold truncate text-foreground">{p.name}</span>
                            <span className="text-[10px] text-muted-foreground truncate">
                              {p.category?.name}
                              {p.barcode ? ` · ${p.barcode}` : ''}
                            </span>
                          </span>
                          <span className="flex items-center gap-2 shrink-0">
                            <span className="font-mono font-semibold">{formatCurrency(p.salePrice)}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                p.stock <= 0
                                  ? 'bg-destructive/10 text-destructive'
                                  : p.stock <= 5
                                    ? 'bg-amber-500/10 text-amber-600'
                                    : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {p.stock} u
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {results.clients.length > 0 && (
                    <div className="py-1">
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Users className="h-3 w-3" /> Clientes
                      </div>
                      {results.clients.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => navigate('/clients')}
                          className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-xs hover:bg-muted/50 transition-colors"
                        >
                          <span className="font-semibold truncate text-foreground">{c.name}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0 font-mono">{c.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {results.sales.length > 0 && (
                    <div className="py-1">
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Receipt className="h-3 w-3" /> Facturas
                      </div>
                      {results.sales.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => navigate(`/sales/${s.id}`)}
                          className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-xs hover:bg-muted/50 transition-colors"
                        >
                          <span className="font-mono font-semibold truncate text-foreground">{s.invoiceNumber}</span>
                          <span className="text-xs font-mono font-bold shrink-0">{formatCurrency(s.total)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={goToInventory}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold border-t border-border bg-muted/40 hover:bg-muted/70 transition-colors text-foreground"
              >
                <PackageSearch className="h-3.5 w-3.5" />
                Ir al inventario completo
                <ArrowRight className="h-3.5 w-3.5 ml-auto" />
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Lado Derecho: Acciones rápidas, Notificaciones y Perfil de Usuario (Estilo captura) */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Toggle de tema oscuro / claro */}
        <button
          type="button"
          onClick={toggleTheme}
          title={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          aria-label="Alternar tema"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 transition-colors cursor-pointer"
        >
          {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>

        {/* Campana de Notificaciones (Icono de la captura) */}
        <NotificationsDropdown />

        {/* Botón de configuración (Icono de la captura) */}
        <Link
          href="/admin"
          title="Configuración"
          aria-label="Configuración"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 transition-colors cursor-pointer"
        >
          <Settings className="h-3.5 w-3.5" />
        </Link>

        {/* Avatar Dropdown en el Header */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center cursor-pointer rounded-full outline-none focus:ring-2 focus:ring-zinc-400">
            <div className="h-8 w-8 rounded-full overflow-hidden border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80"
                alt={user.name}
                className="h-full w-full object-cover"
              />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-2 rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-2xl p-1.5">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal px-2.5 py-2">
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-xs text-foreground">{user.name}</span>
                  <span className="text-[11px] text-muted-foreground font-normal truncate">{user.email}</span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              onClick={() => router.push('/profile')}
              className="cursor-pointer rounded-xl px-2.5 py-2 text-xs"
            >
              <User className="mr-2 h-4 w-4" />
              <span>Mi Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push('/admin')}
              className="cursor-pointer rounded-xl px-2.5 py-2 text-xs"
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Configuración</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive cursor-pointer rounded-xl px-2.5 py-2 text-xs"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar Sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
