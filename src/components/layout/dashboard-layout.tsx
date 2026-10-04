'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { AiFloatingChat } from '@/components/assistant/ai-floating-chat'
import { useKeyboardShortcuts } from '@/lib/keyboard-shortcuts'
import { cn } from '@/lib/utils'
import {
  getUserPreferences,
  applyTheme,
  applyTableDensity,
  PREFERENCES_CHANGED_EVENT,
  type UserPreferences,
} from '@/lib/user-preferences'

interface DashboardLayoutProps {
  children: React.ReactNode
  user: {
    name: string
    email: string
  }
}

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'nova_sidebar_collapsed'

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  useKeyboardShortcuts()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  // Detectar mobile para asegurar que en pantallas pequeñas el menú móvil no colapse a sólo iconos
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Sincronizar preferencias visuales del usuario (tema y densidad)
  useEffect(() => {
    const prefs = getUserPreferences()
    applyTheme(prefs.theme)
    applyTableDensity(prefs.tableDensity)

    const handler = (e: CustomEvent<UserPreferences>) => {
      if (e.detail?.theme) applyTheme(e.detail.theme)
      if (e.detail?.tableDensity) applyTableDensity(e.detail.tableDensity)
    }

    window.addEventListener(PREFERENCES_CHANGED_EVENT, handler as EventListener)
    return () => window.removeEventListener(PREFERENCES_CHANGED_EVENT, handler as EventListener)
  }, [])

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(next))
      } catch {
        // Ignorar
      }
      return next
    })
  }

  return (
    <div className="flex h-dvh bg-[#f0f2f5] dark:bg-[#07090e] text-foreground overflow-hidden">
      {/* Overlay para móviles */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Contenedor del Sidebar con estética Capsule Dock flotante (referencia Imagen 1) */}
      <aside
        className={cn(
          'fixed inset-y-3 left-3 z-50 transition-all duration-300 ease-in-out lg:static lg:inset-auto lg:my-3 lg:ml-3 lg:mr-2 lg:h-[calc(100dvh-1.5rem)] shrink-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-[calc(100%+1.5rem)] lg:translate-x-0',
          !isMobile && isCollapsed ? 'w-16 lg:w-16' : 'w-64 lg:w-64',
          isMobile && 'w-72',
        )}
      >
        <Sidebar
          user={user}
          collapsed={!isMobile && isCollapsed}
          onToggleCollapse={toggleCollapse}
          onMobileClose={() => setSidebarOpen(false)}
        />
      </aside>

      {/* Área Principal de Contenido con estética de panel flotante integrado */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 lg:my-3 lg:mr-3 lg:h-[calc(100dvh-1.5rem)] lg:rounded-3xl lg:border lg:border-border/70 lg:bg-background/95 lg:shadow-xs">
        <Header user={user} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7">
          <div className="mx-auto max-w-[1600px] w-full">{children}</div>
        </main>
      </div>

      {/* Asistente IA Flotante */}
      <AiFloatingChat />
    </div>
  )
}
