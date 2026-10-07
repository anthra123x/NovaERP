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
} from 'lucide-react'
import { useBusinessWorkflow } from '@/lib/use-business-workflow'

// Módulos principales de navegación
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

export function Sidebar({ collapsed = false, onToggleCollapse, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const { config: workflow } = useBusinessWorkflow()

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
    <div className="flex h-full w-full flex-col bg-card/95 dark:bg-card/95 text-foreground select-none rounded-3xl border border-dashed border-border/80 dark:border-white/[0.10] shadow-sm backdrop-blur-xl overflow-visible transition-all duration-300">
      {/* Header superior: h-16 alineado con el Header principal */}
      <div
        className={cn(
          'flex h-16 items-center border-b border-dashed border-border/60 dark:border-white/[0.08] shrink-0 transition-all duration-200',
          collapsed ? 'justify-center px-1' : 'justify-between px-3.5',
        )}
      >
        {!collapsed ? (
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Emblema circular en modo expandido */}
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/60 text-foreground border border-dashed border-border/80 overflow-hidden shadow-2xs">
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
                  className="h-4.5 w-4.5 text-foreground stroke-[2.2]"
                >
                  <path d="M5 19V5L15 19V5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="19" cy="5" r="2.2" fill="#10b981" />
                </svg>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="truncate text-xs font-bold text-foreground tracking-tight uppercase">
                {workflow.companyName || 'Nova ERP'}
              </span>
              <span className="truncate text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {workflow.slogan ? workflow.slogan : 'Sistema Activo'}
              </span>
            </div>
          </div>
        ) : (
          /* Emblema circular estilo cápsula dock (Logo oficial de Nova ERP) */
          <div className="relative group flex justify-center w-full">
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Expandir barra lateral"
              aria-label="Expandir barra lateral"
              className="group/btn relative flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 text-foreground border border-dashed border-border/80 hover:bg-muted hover:border-primary/40 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer shadow-2xs"
            >
              {workflow.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={workflow.logoUrl}
                  alt={workflow.companyName || 'Logo'}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-foreground stroke-[2.2] transition-transform duration-200 group-hover/btn:scale-110"
                >
                  <path d="M5 19V5L15 19V5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="19" cy="5" r="2.2" fill="#10b981" />
                </svg>
              )}
            </button>
            <div className="absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl bg-popover text-popover-foreground text-xs font-medium whitespace-nowrap shadow-md border border-dashed border-border/80 backdrop-blur-md z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150">
              {workflow.companyName || 'Nova ERP'} &bull; Click para expandir
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

      {/* Navegación de módulos principales */}
      <nav
        className={cn(
          'flex-1 overflow-y-auto overflow-x-visible py-3',
          collapsed ? 'px-2 space-y-2 flex flex-col items-center' : 'px-3 space-y-1',
        )}
      >
        {navigation.map((item) => {
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
                      ? 'bg-primary/10 text-primary border border-dashed border-primary/40 shadow-2xs font-semibold'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:scale-105 active:scale-95',
                  )}
                >
                  <item.icon className="h-4.5 w-4.5 shrink-0" />
                  {active && (
                    <span
                      className="absolute -right-1 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_4px_var(--color-primary)]"
                      aria-hidden="true"
                    />
                  )}
                </Link>

                <div className="absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl bg-popover text-popover-foreground text-xs font-medium whitespace-nowrap shadow-md border border-dashed border-border/80 backdrop-blur-md z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150">
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
                  ? 'bg-primary/10 text-primary border border-dashed border-primary/40 font-semibold'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              <item.icon
                className={cn(
                  'h-4.5 w-4.5 shrink-0 transition-colors duration-150',
                  active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                )}
              />
              <span className="flex-1 truncate tracking-tight">{item.name}</span>
              {active && (
                <span
                  className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_4px_var(--color-primary)] shrink-0"
                  aria-hidden="true"
                />
              )}
            </Link>
          )
        })}

        {/* Separador y enlace de Administración */}
        <div
          className={cn(
            'border-t border-dashed border-border/60 dark:border-white/[0.08] pt-2 mt-2 w-full',
            collapsed && 'flex justify-center',
          )}
        >
          {collapsed ? (
            <div className="relative group flex justify-center w-full">
              <Link
                href="/admin"
                onClick={handleLinkClick}
                aria-label="Administración"
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-200 cursor-pointer relative',
                  pathname === '/admin' || pathname.startsWith('/admin/')
                    ? 'bg-primary/10 text-primary border border-dashed border-primary/40 shadow-2xs font-semibold'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:scale-105 active:scale-95',
                )}
              >
                <Settings className="h-4.5 w-4.5 shrink-0" />
                {(pathname === '/admin' || pathname.startsWith('/admin/')) && (
                  <span
                    className="absolute -right-1 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_4px_var(--color-primary)]"
                    aria-hidden="true"
                  />
                )}
              </Link>
              <div className="absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl bg-popover text-popover-foreground text-xs font-medium whitespace-nowrap shadow-md border border-dashed border-border/80 backdrop-blur-md z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150">
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
                  ? 'bg-primary/10 text-primary border border-dashed border-primary/40 font-semibold'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              <Settings
                className={cn(
                  'h-4.5 w-4.5 shrink-0 transition-colors duration-150',
                  pathname === '/admin' || pathname.startsWith('/admin/')
                    ? 'text-primary'
                    : 'text-muted-foreground group-hover:text-foreground',
                )}
              />
              <span className="flex-1 truncate tracking-tight">Administración</span>
              {(pathname === '/admin' || pathname.startsWith('/admin/')) && (
                <span
                  className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_4px_var(--color-primary)] shrink-0"
                  aria-hidden="true"
                />
              )}
            </Link>
          )}
        </div>
      </nav>

      {/* Pie de la barra lateral: atajos y toggle */}
      <div className="border-t border-dashed border-border/60 dark:border-white/[0.08] p-2 shrink-0">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1.5">
            <div className="relative group flex justify-center w-full">
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Expandir barra lateral"
                aria-label="Expandir barra lateral"
                className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-all cursor-pointer"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
              <div className="absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl bg-popover text-popover-foreground text-[11px] font-medium whitespace-nowrap shadow-md border border-dashed border-border/80 backdrop-blur-md z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150">
                Expandir barra lateral
              </div>
            </div>
            <div className="relative group flex justify-center w-full">
              <button
                type="button"
                title="Atajos de teclado"
                aria-label="Atajos de teclado"
                className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              >
                <Keyboard className="h-3.5 w-3.5" />
              </button>
              <div className="absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl bg-popover text-popover-foreground text-[11px] font-mono whitespace-nowrap shadow-md border border-dashed border-border/80 backdrop-blur-md z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150">
                Alt+Q: Buscar · Alt+V: Ventas
              </div>
            </div>
          </div>
        ) : (
          <div className="px-2 py-1 text-[10.5px] text-muted-foreground/70 flex items-center justify-between font-mono">
            <div className="flex items-center gap-1.5">
              <Keyboard className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
              <span>Alt+Q buscar &bull; Alt+V ventas</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
