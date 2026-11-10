'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ShoppingCart,
  HandCoins,
  Package,
  Users,
  Settings,
  Keyboard,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Zap,
} from 'lucide-react'
import { useBusinessWorkflow } from '@/lib/use-business-workflow'

// Módulos principales de navegación exclusivos de Nova ERP
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Ventas', href: '/sales', icon: ShoppingCart },
  { name: 'Créditos', href: '/credits', icon: HandCoins },
  { name: 'Inventario', href: '/inventory', icon: Package },
  { name: 'Clientes', href: '/clients', icon: Users },
]

interface SidebarProps {
  user?: {
    name: string
    email: string
  }
  collapsed?: boolean
  onToggleCollapse?: () => void
  onMobileClose?: () => void
}

export function Sidebar({ user, collapsed = false, onToggleCollapse, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const { config: workflow, profile } = useBusinessWorkflow()

  const isCreditDisabled = workflow.sector === 'restaurant_gastronomy' || workflow.allowCreditSales === false
  const visibleNavigation = navigation.filter((item) => !(item.href === '/credits' && isCreditDisabled))

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname.startsWith(href + '/')
  }

  function handleLinkClick() {
    if (onMobileClose) {
      onMobileClose()
    }
  }

  return (
    <div className="flex h-full w-full flex-col bg-card text-foreground select-none rounded-3xl border border-border/80 dark:border-white/[0.08] shadow-xs backdrop-blur-xl overflow-hidden transition-all duration-300 no-scrollbar">
      {/* Header superior: h-16 alineado con el Header principal */}
      <div
        className={cn(
          'flex h-16 items-center border-b border-border/60 dark:border-white/[0.08] shrink-0 transition-all duration-200',
          collapsed ? 'justify-center px-1' : 'justify-between px-3.5',
        )}
      >
        {!collapsed ? (
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Emblema en modo expandido */}
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border border-border/80 overflow-hidden shadow-2xs">
              {workflow.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={workflow.logoUrl}
                  alt={workflow.companyName || 'Logo de la empresa'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4.5 w-4.5 stroke-[2.2]"
                >
                  <path d="M5 19V5L15 19V5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="19" cy="5" r="2.2" fill="currentColor" />
                </svg>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="truncate text-xs font-bold text-foreground tracking-tight">
                {workflow.companyName || 'Nova ERP'}
              </span>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="truncate text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {profile.tag}
                </span>
                <span className="text-[9px] text-muted-foreground/50">&bull;</span>
                <span className="truncate text-[10px] text-muted-foreground">
                  {workflow.slogan ? workflow.slogan : 'Sistema Activo'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Emblema en modo colapsado */
          <div className="relative group flex justify-center w-full">
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Expandir barra lateral"
              aria-label="Expandir barra lateral"
              className="group/btn relative flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border border-border/80 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer shadow-2xs"
            >
              {workflow.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={workflow.logoUrl}
                  alt={workflow.companyName || 'Logo'}
                  className="h-full w-full rounded-xl object-cover"
                />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 stroke-[2.2] transition-transform duration-200 group-hover/btn:scale-110"
                >
                  <path d="M5 19V5L15 19V5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="19" cy="5" r="2.2" fill="currentColor" />
                </svg>
              )}
            </button>
            <div className="absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl bg-popover text-popover-foreground text-xs font-medium whitespace-nowrap shadow-md border border-border/80 backdrop-blur-md z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150">
              {workflow.companyName || 'Nova ERP'} &bull; [{profile.tag}] &bull; Click para expandir
            </div>
          </div>
        )}

        {!collapsed && (
          <div className="flex items-center gap-1">
            {/* Botón de cerrar en móvil */}
            {onMobileClose && (
              <button
                type="button"
                onClick={onMobileClose}
                title="Cerrar menú"
                aria-label="Cerrar menú"
                className="lg:hidden flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Botón de contraer en escritorio */}
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Contraer barra lateral"
                aria-label="Contraer barra lateral"
                className="hidden lg:flex items-center justify-center h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all cursor-pointer"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Navegación de módulos */}
      <nav
        className={cn(
          'flex-1 py-3 no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          collapsed
            ? 'px-2 space-y-2 flex flex-col items-center overflow-visible'
            : 'px-3 space-y-3 overflow-y-auto overflow-x-hidden',
        )}
      >
        {/* Grupo: MAIN */}
        <div className="space-y-1 w-full">
          {!collapsed && (
            <div className="px-3 py-1 text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
              Main
            </div>
          )}
          {visibleNavigation.map((item) => {
            const active = isActive(item.href)

            if (collapsed) {
              return (
                <div key={item.name} className="relative group flex justify-center w-full">
                  <Link
                    href={item.href}
                    onClick={handleLinkClick}
                    aria-label={item.name}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-200 cursor-pointer relative',
                      active
                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 border border-zinc-200/80 dark:border-zinc-700/70 shadow-xs font-semibold'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:scale-105 active:scale-95',
                    )}
                  >
                    <item.icon className="h-4.5 w-4.5 shrink-0" />
                  </Link>

                  <div className="absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl bg-popover text-popover-foreground text-xs font-medium whitespace-nowrap shadow-md border border-border/80 backdrop-blur-md z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150">
                    {item.name}
                  </div>
                </div>
              )
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleLinkClick}
                className={cn(
                  'group relative flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 border border-zinc-200/80 dark:border-zinc-700/70 font-semibold shadow-xs'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <item.icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-colors duration-150',
                    active ? 'text-zinc-900 dark:text-zinc-50' : 'text-muted-foreground group-hover:text-foreground',
                  )}
                />
                <span className="flex-1 truncate tracking-tight">{item.name}</span>
              </Link>
            )
          })}
        </div>

        {/* Enlace a Configuración / Administración */}
        <div className="w-full pt-1">
          {collapsed ? (
            <div className="relative group flex justify-center w-full">
              <Link
                href="/admin"
                onClick={handleLinkClick}
                aria-label="Administración"
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-200 cursor-pointer relative',
                  pathname === '/admin' || pathname.startsWith('/admin/')
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 border border-zinc-200/80 dark:border-zinc-700/70 shadow-xs font-semibold'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:scale-105 active:scale-95',
                )}
              >
                <Settings className="h-4.5 w-4.5 shrink-0" />
              </Link>
              <div className="absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl bg-popover text-popover-foreground text-xs font-medium whitespace-nowrap shadow-md border border-border/80 backdrop-blur-md z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150">
                Administración
              </div>
            </div>
          ) : (
            <Link
              href="/admin"
              onClick={handleLinkClick}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-150',
                pathname === '/admin' || pathname.startsWith('/admin/')
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 border border-zinc-200/80 dark:border-zinc-700/70 font-semibold shadow-xs'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              <Settings
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors duration-150',
                  pathname === '/admin' || pathname.startsWith('/admin/')
                    ? 'text-zinc-900 dark:text-zinc-50'
                    : 'text-muted-foreground group-hover:text-foreground',
                )}
              />
              <span className="flex-1 truncate tracking-tight">Configuración</span>
            </Link>
          )}
        </div>
      </nav>

      {/* Tarjeta de Plan estilo Modsley */}
      {!collapsed && (
        <div className="px-3 pb-2 pt-1">
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 flex flex-col gap-2.5 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs">
                <Zap className="h-3.5 w-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-foreground truncate">Upgrade to Pro Plan</span>
                <span className="text-[10px] text-muted-foreground truncate">Pro offers quicker workflows</span>
              </div>
            </div>
            <Link
              href="/admin"
              onClick={handleLinkClick}
              className="w-full py-1.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-center text-xs font-semibold shadow-xs transition-colors"
            >
              Upgrade Now
            </Link>
          </div>
        </div>
      )}

      {/* Pie de la barra lateral: Fila de Usuario y Atajos */}
      <div className="border-t border-border/60 dark:border-white/[0.08] p-2.5 shrink-0">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="relative group flex justify-center w-full">
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Expandir barra lateral"
                aria-label="Expandir barra lateral"
                className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all cursor-pointer"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
              <div className="absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl bg-popover text-popover-foreground text-[11px] font-medium whitespace-nowrap shadow-md border border-border/80 backdrop-blur-md z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150">
                Expandir barra lateral
              </div>
            </div>
            <div className="relative group flex justify-center w-full">
              <Link
                href="/profile"
                title="Mi Perfil"
                className="h-8 w-8 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center font-bold text-xs shrink-0"
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/profile"
              onClick={handleLinkClick}
              className="flex items-center gap-2.5 min-w-0 flex-1 p-1 rounded-xl hover:bg-muted/60 transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold text-foreground truncate">{user?.name || 'Jane Doe'}</span>
                <span className="text-[10px] text-muted-foreground truncate">{user?.email || 'janedoe@gmail.com'}</span>
              </div>
            </Link>
            <div className="flex items-center gap-1 shrink-0 text-muted-foreground/60">
              <button
                type="button"
                aria-label="Atajos de teclado"
                title="Atajos de teclado: Alt+Q Buscar · Alt+V Ventas"
                className="p-1.5 rounded-lg hover:bg-muted/60 hover:text-foreground transition-colors cursor-pointer"
              >
                <Keyboard className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
