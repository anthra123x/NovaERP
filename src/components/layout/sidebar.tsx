'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  Receipt,
  BarChart3,
  MessageSquare,
  Users2,
  Megaphone,
  HandCoins,
  Users,
  Layers,
  ShoppingBag,
  ShieldCheck,
  CreditCard,
  Cpu,
  Headphones,
  HelpCircle,
  Settings,
  Keyboard,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  ChevronsUpDown,
  ChevronDown,
} from 'lucide-react'
import { useBusinessWorkflow } from '@/lib/use-business-workflow'

// Módulos principales de navegación exclusivos de Nova ERP
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Products', href: '/inventory', icon: Package },
  { name: 'Transactions', href: '/sales', icon: Receipt },
  { name: 'Reports & Analytics', href: '/reports', icon: BarChart3 },
  { name: 'Messages', href: '/web/messages', icon: MessageSquare },
  { name: 'Team Performance', href: '/admin/users', icon: Users2 },
  { name: 'Campaigns', href: '/web', icon: Megaphone },
  { name: 'Créditos', href: '/credits', icon: HandCoins },
]

const customerNavigation = [
  { name: 'Customer List', href: '/clients', icon: Users },
  { name: 'Channels', href: '/web', icon: Layers },
  { name: 'Order Management', href: '/web/orders', icon: ShoppingBag },
]

const managementNavigation = [
  { name: 'Roles & Permissions', href: '/admin/users', icon: ShieldCheck },
  { name: 'Billing & Subscription', href: '/admin', icon: CreditCard },
  { name: 'Integrations', href: '/admin/settings', icon: Cpu },
]

const settingsNavigation = [
  { name: 'Customer Support', href: '/assistant', icon: Headphones },
  { name: 'Help Center', href: '/admin/settings', icon: HelpCircle },
  { name: 'System Settings', href: '/admin', icon: Settings },
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
  const { config: workflow } = useBusinessWorkflow()

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
    <div className="flex h-full w-full flex-col bg-white dark:bg-zinc-950 text-foreground select-none overflow-hidden transition-all duration-300 no-scrollbar">
      {/* 1. Header superior del Workspace / Agencia (Captura: Logo negro con S + Spark Pixel Team) */}
      <div
        className={cn(
          'flex h-16 items-center border-b border-zinc-100 dark:border-zinc-800/80 shrink-0 transition-all duration-200',
          collapsed ? 'justify-center px-1' : 'justify-between px-4',
        )}
      >
        {!collapsed ? (
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Emblema negro con monograma 'S' blanco estilizado de la captura */}
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs overflow-hidden">
              {workflow.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={workflow.logoUrl}
                  alt={workflow.companyName || 'Logo'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                >
                  <path
                    d="M17 7.5C17 5.567 15.433 4 13.5 4H10C7.79086 4 6 5.79086 6 8C6 10.2091 7.79086 12 10 12H14C16.2091 12 18 13.7909 18 16C18 18.2091 16.2091 20 14 20H10.5C8.567 20 7 18.433 7 16.5"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>

            <div className="flex flex-col min-w-0 flex-1">
              <span className="truncate text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                Agency
              </span>
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-xs font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  {workflow.companyName && workflow.companyName !== 'Nova ERP' ? workflow.companyName : 'Spark Pixel Team'}
                </span>
                <ChevronsUpDown className="h-3 w-3 text-zinc-400 shrink-0" />
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
              className="group/btn relative flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer shadow-2xs"
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
                  className="h-5 w-5"
                >
                  <path
                    d="M17 7.5C17 5.567 15.433 4 13.5 4H10C7.79086 4 6 5.79086 6 8C6 10.2091 7.79086 12 10 12H14C16.2091 12 18 13.7909 18 16C18 18.2091 16.2091 20 14 20H10.5C8.567 20 7 18.433 7 16.5"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
            <div className="absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl bg-popover text-popover-foreground text-xs font-medium whitespace-nowrap shadow-md border border-border/80 backdrop-blur-md z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150">
              {workflow.companyName || 'Spark Pixel Team'} &bull; Click para expandir
            </div>
          </div>
        )}

        {!collapsed && (
          <div className="flex items-center gap-1 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity">
            {/* Botón de cerrar en móvil */}
            {onMobileClose && (
              <button
                type="button"
                onClick={onMobileClose}
                title="Cerrar menú"
                aria-label="Cerrar menú"
                className="lg:hidden flex items-center justify-center h-7 w-7 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
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
                className="hidden lg:flex items-center justify-center h-7 w-7 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Navegación por Grupos (Exacto como en la captura de pantalla) */}
      <nav
        className={cn(
          'flex-1 py-1.5 no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          collapsed
            ? 'px-2 space-y-1.5 flex flex-col items-center overflow-visible'
            : 'px-3 space-y-2.5 overflow-y-auto overflow-x-hidden',
        )}
      >
        {/* GRUPO 1: Main Menu */}
        <div className="space-y-0.5 w-full">
          {!collapsed && (
            <div className="px-3 pt-0.5 pb-1 text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
              Main Menu
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
                      'flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-150 cursor-pointer relative',
                      active
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 font-semibold'
                        : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100',
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
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
                    ? 'bg-zinc-100/90 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 font-semibold'
                    : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50/80 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-100',
                )}
              >
                <item.icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-colors duration-150',
                    active ? 'text-zinc-950 dark:text-zinc-50' : 'text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200',
                  )}
                />
                <span className="flex-1 truncate tracking-tight text-[12.5px]">{item.name}</span>
              </Link>
            )
          })}
        </div>

        {/* GRUPO 2: Customers */}
        {!collapsed && (
          <div className="space-y-0.5 w-full">
            <div className="px-3 pt-0.5 pb-1 text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
              Customers
            </div>
            {customerNavigation.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={handleLinkClick}
                  className={cn(
                    'group relative flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150',
                    active
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 font-semibold'
                      : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100',
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0 text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200" />
                  <span className="flex-1 truncate tracking-tight text-[12.5px]">{item.name}</span>
                </Link>
              )
            })}
          </div>
        )}

        {/* GRUPO 3: Management */}
        {!collapsed && (
          <div className="space-y-0.5 w-full">
            <div className="px-3 pt-0.5 pb-1 text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
              Management
            </div>
            {managementNavigation.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={handleLinkClick}
                  className={cn(
                    'group relative flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150',
                    active
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 font-semibold'
                      : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100',
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0 text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200" />
                  <span className="flex-1 truncate tracking-tight text-[12.5px]">{item.name}</span>
                </Link>
              )
            })}
          </div>
        )}

        {/* GRUPO 4: Settings */}
        <div className="space-y-0.5 w-full">
          {!collapsed && (
            <div className="px-3 pt-0.5 pb-1 text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
              Settings
            </div>
          )}
          {settingsNavigation.map((item) => {
            const active = isActive(item.href)
            if (collapsed) {
              return (
                <div key={item.name} className="relative group flex justify-center w-full">
                  <Link
                    href={item.href}
                    onClick={handleLinkClick}
                    aria-label="Administración"
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-150 cursor-pointer relative',
                      active
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 font-semibold'
                        : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100',
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
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
                aria-label="Administración"
                className={cn(
                  'group relative flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150',
                  active
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 font-semibold'
                    : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0 text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200" />
                <span className="flex-1 truncate tracking-tight text-[12.5px]">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Pie de la barra lateral: Fila de Usuario (Estilo exacto de la captura: Salung Prastyo / Sales Operator) */}
      <div className="border-t border-zinc-100 dark:border-zinc-800/80 p-2.5 shrink-0 bg-white dark:bg-zinc-950">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="relative group flex justify-center w-full">
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Expandir barra lateral"
                aria-label="Expandir barra lateral"
                className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-all cursor-pointer"
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
                className="h-8 w-8 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-zinc-200/80"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80"
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/40">
            <Link
              href="/profile"
              onClick={handleLinkClick}
              className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-85 transition-opacity"
            >
              <div className="h-8 w-8 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-zinc-200/80">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80"
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {user?.name || 'Salung Prastyo'}
                </span>
                <span className="text-[10px] text-zinc-400 font-medium truncate">
                  Sales Operator
                </span>
              </div>
            </Link>
            <div className="flex items-center gap-1 shrink-0 text-zinc-400">
              <button
                type="button"
                aria-label="Atajos de teclado"
                title="Atajos de teclado: Alt+Q Buscar · Alt+V Ventas"
                className="p-1 rounded-lg hover:bg-zinc-200/60 hover:text-zinc-700 transition-colors cursor-pointer"
              >
                <Keyboard className="h-3.5 w-3.5" />
              </button>
              <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
