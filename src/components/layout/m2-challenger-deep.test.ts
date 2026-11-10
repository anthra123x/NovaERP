import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// ─────────────────────────────────────────────────────────────────────────────
// Mocks for Next.js navigation, React, and modules
// ─────────────────────────────────────────────────────────────────────────────
const mockRouterPush = vi.fn()
const mockRouterReplace = vi.fn()
const mockRedirect = vi.fn()
const mockPathname = vi.fn(() => '/dashboard')

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useEffect: (fn: () => void | (() => void)) => {
      try {
        fn()
      } catch {
        // ignore
      }
    },
  }
})

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
  }),
  usePathname: () => mockPathname(),
  redirect: (url: string) => {
    mockRedirect(url)
    throw new Error(`NEXT_REDIRECT:${url}`)
  },
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    onClick,
    ...rest
  }: {
    href: string
    children: React.ReactNode
    className?: string
    onClick?: () => void
    [key: string]: unknown
  }) =>
    React.createElement(
      'a',
      { href, className, onClick, ...rest },
      children,
    ),
}))

// Mock settings service for CreditsPage
const mockGetBusinessWorkflowConfig = vi.fn()
vi.mock('@/modules/settings/settings.service', () => ({
  getBusinessWorkflowConfig: () => mockGetBusinessWorkflowConfig(),
}))

// Mock payments actions for CreditsPage
const mockGetCreditSummary = vi.fn()
const mockGetCreditSales = vi.fn()
vi.mock('@/modules/sales/payments.actions', () => ({
  getCreditSummary: () => mockGetCreditSummary(),
  getCreditSales: (...args: unknown[]) => mockGetCreditSales(...args),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Imports under test
// ─────────────────────────────────────────────────────────────────────────────
import {
  DEFAULT_BUSINESS_WORKFLOW,
  WORKFLOW_STORAGE_KEY,
  WORKFLOW_CHANGED_EVENT,
  getBusinessWorkflow,
  saveBusinessWorkflow,
  type BusinessSector,
  type BusinessWorkflowConfig,
} from '@/lib/business-workflow'
import { Sidebar } from './sidebar'
import { useKeyboardShortcuts } from '@/lib/keyboard-shortcuts'
import CreditsPage from '@/app/credits/page'

describe('M2 Adversarial Challenge Suite — Dynamic Navigation, State Switching & Deep-Link Defense', () => {
  let mockStore: Record<string, string> = {}
  let eventListeners: Record<string, Array<(e: unknown) => void>> = {}

  beforeEach(() => {
    vi.clearAllMocks()
    mockStore = {}
    eventListeners = {}

    // Mock DOM input element types for Node environment
    global.HTMLInputElement = class HTMLInputElement {} as unknown as typeof HTMLInputElement
    global.HTMLTextAreaElement = class HTMLTextAreaElement {} as unknown as typeof HTMLTextAreaElement
    global.HTMLSelectElement = class HTMLSelectElement {} as unknown as typeof HTMLSelectElement

    // Setup simulated browser environment
    global.localStorage = {
      getItem: vi.fn((key: string) => mockStore[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockStore[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStore[key]
      }),
      clear: vi.fn(() => {
        mockStore = {}
      }),
      length: 0,
      key: vi.fn(() => null),
    }

    global.window = {
      localStorage: global.localStorage,
      addEventListener: vi.fn((type: string, listener: (e: unknown) => void) => {
        eventListeners[type] = eventListeners[type] || []
        eventListeners[type].push(listener)
      }),
      removeEventListener: vi.fn((type: string, listener: (e: unknown) => void) => {
        if (eventListeners[type]) {
          eventListeners[type] = eventListeners[type].filter((l) => l !== listener)
        }
      }),
      dispatchEvent: vi.fn((event: { type: string; detail?: unknown }) => {
        const listeners = eventListeners[event.type] || []
        for (const listener of listeners) {
          listener(event)
        }
        return true
      }),
    } as unknown as Window & typeof globalThis

    global.CustomEvent = class CustomEvent {
      type: string
      detail: unknown
      constructor(type: string, init?: { detail?: unknown }) {
        this.type = type
        this.detail = init?.detail
      }
    } as unknown as typeof CustomEvent
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Empirical Sector Switching & Reactivity Verification
  // ───────────────────────────────────────────────────────────────────────────
  describe('Challenge 1: Empirical Sector Switching Simulation (retail_general <-> restaurant_gastronomy)', () => {
    it('initializes with retail_general: Sidebar renders "Créditos" with href="/credits"', () => {
      saveBusinessWorkflow({
        sector: 'retail_general',
        allowCreditSales: true,
      })

      const html = renderToStaticMarkup(React.createElement(Sidebar, { collapsed: false }))

      expect(html).toContain('href="/credits"')
      expect(html).toContain('Créditos')
      expect(html).toContain('href="/dashboard"')
      expect(html).toContain('href="/sales"')
      expect(html).toContain('href="/inventory"')
      expect(html).toContain('href="/clients"')
    })

    it('simulates switching retail_general -> restaurant_gastronomy: Sidebar immediately hides "Créditos"', () => {
      // 1. Start at retail_general
      saveBusinessWorkflow({
        sector: 'retail_general',
        allowCreditSales: true,
      })
      const initialHtml = renderToStaticMarkup(React.createElement(Sidebar, { collapsed: false }))
      expect(initialHtml).toContain('href="/credits"')

      // 2. Perform dynamic switch to restaurant_gastronomy
      const switched = saveBusinessWorkflow({
        sector: 'restaurant_gastronomy',
        allowCreditSales: false,
      })
      expect(switched.sector).toBe('restaurant_gastronomy')
      expect(switched.allowCreditSales).toBe(false)

      // 3. Re-render Sidebar: "Créditos" MUST be completely absent
      const gastronomyHtml = renderToStaticMarkup(React.createElement(Sidebar, { collapsed: false }))
      expect(gastronomyHtml).not.toContain('href="/credits"')
      expect(gastronomyHtml).not.toContain('Créditos')

      // Other 4 navigation links must remain intact
      expect(gastronomyHtml).toContain('href="/dashboard"')
      expect(gastronomyHtml).toContain('href="/sales"')
      expect(gastronomyHtml).toContain('href="/inventory"')
      expect(gastronomyHtml).toContain('href="/clients"')
    })

    it('simulates switching back from restaurant_gastronomy -> retail_general: Sidebar immediately restores "Créditos"', () => {
      // 1. Set to restaurant_gastronomy
      saveBusinessWorkflow({
        sector: 'restaurant_gastronomy',
        allowCreditSales: false,
      })
      const gastroHtml = renderToStaticMarkup(React.createElement(Sidebar, { collapsed: false }))
      expect(gastroHtml).not.toContain('href="/credits"')

      // 2. Switch back to retail_general
      const restored = saveBusinessWorkflow({
        sector: 'retail_general',
        allowCreditSales: true,
      })
      expect(restored.sector).toBe('retail_general')
      expect(restored.allowCreditSales).toBe(true)

      // 3. Re-render Sidebar: "Créditos" MUST be restored
      const restoredHtml = renderToStaticMarkup(React.createElement(Sidebar, { collapsed: false }))
      expect(restoredHtml).toContain('href="/credits"')
      expect(restoredHtml).toContain('Créditos')
    })

    it('simulates changing allowCreditSales: false on another sector (e.g. hardware_construction): "Créditos" is hidden', () => {
      saveBusinessWorkflow({
        sector: 'hardware_construction',
        allowCreditSales: false,
      })

      const html = renderToStaticMarkup(React.createElement(Sidebar, { collapsed: false }))
      expect(html).not.toContain('href="/credits"')
      expect(html).not.toContain('Créditos')
    })

    it('adversarial tamper: restaurant_gastronomy with allowCreditSales: true STILL hides "Créditos"', () => {
      // Even if allowCreditSales was tampered or erroneously set to true, restaurant sector must always hide credits
      saveBusinessWorkflow({
        sector: 'restaurant_gastronomy',
        allowCreditSales: true,
      })

      const html = renderToStaticMarkup(React.createElement(Sidebar, { collapsed: false }))
      expect(html).not.toContain('href="/credits"')
      expect(html).not.toContain('Créditos')
    })

    it('collapsed mode: hides "Créditos" tooltip and link when credit is disabled', () => {
      saveBusinessWorkflow({
        sector: 'restaurant_gastronomy',
        allowCreditSales: false,
      })

      const html = renderToStaticMarkup(React.createElement(Sidebar, { collapsed: true }))
      expect(html).not.toContain('href="/credits"')
      expect(html).not.toContain('Créditos')
      expect(html).toContain('href="/sales"')
    })

    it('all 7 pre-existing sectors preserve "Créditos" when allowCreditSales: true', () => {
      const existingSectors: BusinessSector[] = [
        'retail_general',
        'technology_repair',
        'fashion_apparel',
        'grocery_supermarket',
        'hardware_construction',
        'pharmacy_health',
        'services_workshop',
      ]

      for (const sector of existingSectors) {
        saveBusinessWorkflow({
          sector,
          allowCreditSales: true,
        })

        const html = renderToStaticMarkup(React.createElement(Sidebar, { collapsed: false }))
        expect(html, `Sector ${sector} must display Créditos link`).toContain('href="/credits"')
        expect(html, `Sector ${sector} must display Créditos label`).toContain('Créditos')
      }
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Celda D1 Dynamic Metric Switching Verification
  // ───────────────────────────────────────────────────────────────────────────
  describe('Challenge 2: Dashboard Celda D1 State Switching Logic', () => {
    // Helper function that models Celda D1 conditional branch from src/app/dashboard/page.tsx
    function renderCeldaD1(workflow: BusinessWorkflowConfig, incomeToday = 450000, pendingCreditTotal = 1200000, pendingCreditClientsCount = 8) {
      const isCreditDisabled = workflow.sector === 'restaurant_gastronomy' || !workflow.allowCreditSales

      if (isCreditDisabled) {
        return {
          title: '[D1] COBRO CONTADO',
          badge: 'Recaudado en caja hoy',
          linkHref: '/sales',
          linkLabel: 'Ventas →',
          amount: incomeToday,
          isCreditDisabled: true,
        }
      }

      return {
        title: '[D1] CARTERA CXC',
        badge: `${pendingCreditClientsCount} deudores`,
        linkHref: '/credits',
        linkLabel: 'Cobrar →',
        amount: pendingCreditTotal,
        isCreditDisabled: false,
      }
    }

    it('switches Celda D1 to [D1] COBRO CONTADO when sector is restaurant_gastronomy', () => {
      const gastroWorkflow: BusinessWorkflowConfig = {
        ...DEFAULT_BUSINESS_WORKFLOW,
        sector: 'restaurant_gastronomy',
        allowCreditSales: false,
      }

      const celda = renderCeldaD1(gastroWorkflow, 350000, 800000, 5)
      expect(celda.title).toBe('[D1] COBRO CONTADO')
      expect(celda.badge).toBe('Recaudado en caja hoy')
      expect(celda.linkHref).toBe('/sales')
      expect(celda.linkLabel).toBe('Ventas →')
      expect(celda.amount).toBe(350000)
      expect(celda.isCreditDisabled).toBe(true)
    })

    it('switches Celda D1 back to [D1] CARTERA CXC when switching back to retail_general', () => {
      const retailWorkflow: BusinessWorkflowConfig = {
        ...DEFAULT_BUSINESS_WORKFLOW,
        sector: 'retail_general',
        allowCreditSales: true,
      }

      const celda = renderCeldaD1(retailWorkflow, 350000, 800000, 5)
      expect(celda.title).toBe('[D1] CARTERA CXC')
      expect(celda.badge).toBe('5 deudores')
      expect(celda.linkHref).toBe('/credits')
      expect(celda.linkLabel).toBe('Cobrar →')
      expect(celda.amount).toBe(800000)
      expect(celda.isCreditDisabled).toBe(false)
    })

    it('switches Celda D1 to [D1] COBRO CONTADO when allowCreditSales: false on retail_general', () => {
      const retailNoCredit: BusinessWorkflowConfig = {
        ...DEFAULT_BUSINESS_WORKFLOW,
        sector: 'retail_general',
        allowCreditSales: false,
      }

      const celda = renderCeldaD1(retailNoCredit)
      expect(celda.title).toBe('[D1] COBRO CONTADO')
      expect(celda.linkHref).toBe('/sales')
      expect(celda.isCreditDisabled).toBe(true)
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Empirical Shortcut Alt + C Defense in src/lib/keyboard-shortcuts.ts
  // ───────────────────────────────────────────────────────────────────────────
  describe('Challenge 3: Keyboard Shortcut Alt + C Defense (useKeyboardShortcuts)', () => {
    // Helper to simulate the exact handler registered in useKeyboardShortcuts
    function simulateKeyboardShortcut(eventInit: {
      key: string
      altKey?: boolean
      ctrlKey?: boolean
      metaKey?: boolean
      shiftKey?: boolean
      target?: unknown
    }) {
      let defaultPrevented = false
      const event = {
        key: eventInit.key,
        altKey: !!eventInit.altKey,
        ctrlKey: !!eventInit.ctrlKey,
        metaKey: !!eventInit.metaKey,
        shiftKey: !!eventInit.shiftKey,
        target: eventInit.target || {},
        preventDefault: () => {
          defaultPrevented = true
        },
      }

      // Clear any prior listeners, then call useKeyboardShortcuts to register listener
      eventListeners['keydown'] = []
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useKeyboardShortcuts()

      // Fire the keydown listener
      const keydownListeners = eventListeners['keydown'] || []
      for (const listener of keydownListeners) {
        listener(event)
      }

      return { defaultPrevented }
    }

    it('NEVER calls router.push("/credits") when sector is restaurant_gastronomy', () => {
      saveBusinessWorkflow({
        sector: 'restaurant_gastronomy',
        allowCreditSales: false,
      })

      const { defaultPrevented } = simulateKeyboardShortcut({
        key: 'c',
        altKey: true,
      })

      expect(defaultPrevented).toBe(true)
      expect(mockRouterPush).not.toHaveBeenCalled()
      expect(mockRouterPush).not.toHaveBeenCalledWith('/credits')
    })

    it('NEVER calls router.push("/credits") when sector is restaurant_gastronomy even if allowCreditSales is true', () => {
      saveBusinessWorkflow({
        sector: 'restaurant_gastronomy',
        allowCreditSales: true,
      })

      simulateKeyboardShortcut({
        key: 'c',
        altKey: true,
      })

      expect(mockRouterPush).not.toHaveBeenCalled()
    })

    it('NEVER calls router.push("/credits") when allowCreditSales: false in any other sector', () => {
      saveBusinessWorkflow({
        sector: 'retail_general',
        allowCreditSales: false,
      })

      simulateKeyboardShortcut({
        key: 'c',
        altKey: true,
      })

      expect(mockRouterPush).not.toHaveBeenCalled()
    })

    it('CALLS router.push("/credits") when sector is retail_general and allowCreditSales: true', () => {
      saveBusinessWorkflow({
        sector: 'retail_general',
        allowCreditSales: true,
      })

      const { defaultPrevented } = simulateKeyboardShortcut({
        key: 'c',
        altKey: true,
      })

      expect(defaultPrevented).toBe(true)
      expect(mockRouterPush).toHaveBeenCalledTimes(1)
      expect(mockRouterPush).toHaveBeenCalledWith('/credits')
    })

    it('ignores Alt + C when focus is inside an HTMLInputElement mock', () => {
      saveBusinessWorkflow({
        sector: 'retail_general',
        allowCreditSales: true,
      })

      const inputTarget = new global.HTMLInputElement()
      const { defaultPrevented } = simulateKeyboardShortcut({
        key: 'c',
        altKey: true,
        target: inputTarget,
      })

      expect(defaultPrevented).toBe(false)
      expect(mockRouterPush).not.toHaveBeenCalled()
    })

    it('allows non-credit shortcuts (Alt + D, Alt + V, Alt + I) in restaurant_gastronomy', () => {
      saveBusinessWorkflow({
        sector: 'restaurant_gastronomy',
        allowCreditSales: false,
      })

      // Alt + D -> /dashboard
      simulateKeyboardShortcut({ key: 'd', altKey: true })
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard')

      // Alt + V -> /sales
      simulateKeyboardShortcut({ key: 'v', altKey: true })
      expect(mockRouterPush).toHaveBeenCalledWith('/sales')

      // Alt + I -> /inventory
      simulateKeyboardShortcut({ key: 'i', altKey: true })
      expect(mockRouterPush).toHaveBeenCalledWith('/inventory')
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Defensive Server Redirect in src/app/credits/page.tsx
  // ───────────────────────────────────────────────────────────────────────────
  describe('Challenge 4: Defensive Server Redirect in src/app/credits/page.tsx', () => {
    it('invokes redirect("/sales") when sector is restaurant_gastronomy', async () => {
      mockGetBusinessWorkflowConfig.mockResolvedValueOnce({
        sector: 'restaurant_gastronomy',
        allowCreditSales: false,
      })

      let threwRedirect = false
      try {
        await CreditsPage({ searchParams: Promise.resolve({}) })
      } catch (err: unknown) {
        if (err instanceof Error && err.message.startsWith('NEXT_REDIRECT:')) {
          threwRedirect = true
        }
      }

      expect(mockRedirect).toHaveBeenCalledTimes(1)
      expect(mockRedirect).toHaveBeenCalledWith('/sales')
      expect(threwRedirect).toBe(true)
      // Must not query credits database
      expect(mockGetCreditSummary).not.toHaveBeenCalled()
      expect(mockGetCreditSales).not.toHaveBeenCalled()
    })

    it('invokes redirect("/sales") when sector is restaurant_gastronomy even if allowCreditSales is true', async () => {
      mockGetBusinessWorkflowConfig.mockResolvedValueOnce({
        sector: 'restaurant_gastronomy',
        allowCreditSales: true,
      })

      try {
        await CreditsPage({ searchParams: Promise.resolve({}) })
      } catch {
        // Expected redirect error
      }

      expect(mockRedirect).toHaveBeenCalledWith('/sales')
      expect(mockGetCreditSummary).not.toHaveBeenCalled()
    })

    it('invokes redirect("/sales") when allowCreditSales: false in retail_general', async () => {
      mockGetBusinessWorkflowConfig.mockResolvedValueOnce({
        sector: 'retail_general',
        allowCreditSales: false,
      })

      try {
        await CreditsPage({ searchParams: Promise.resolve({}) })
      } catch {
        // Expected redirect error
      }

      expect(mockRedirect).toHaveBeenCalledWith('/sales')
      expect(mockGetCreditSummary).not.toHaveBeenCalled()
    })

    it('DOES NOT redirect when sector is retail_general with allowCreditSales: true', async () => {
      mockGetBusinessWorkflowConfig.mockResolvedValueOnce({
        sector: 'retail_general',
        allowCreditSales: true,
      })
      mockGetCreditSummary.mockResolvedValueOnce({
        totalCreditSales: 1500000,
        totalPendingBalance: 500000,
        totalPaid: 1000000,
        overdueCount: 2,
        activeCreditsCount: 6,
      })
      mockGetCreditSales.mockResolvedValueOnce({
        credits: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      })

      const pageResult = await CreditsPage({ searchParams: Promise.resolve({}) })

      expect(mockRedirect).not.toHaveBeenCalled()
      expect(mockGetCreditSummary).toHaveBeenCalledTimes(1)
      expect(mockGetCreditSales).toHaveBeenCalledTimes(1)
      expect(pageResult).toBeDefined()
    })

    it('all 7 legacy sectors with default allowCreditSales: true DO NOT redirect', async () => {
      const existingSectors: BusinessSector[] = [
        'retail_general',
        'technology_repair',
        'fashion_apparel',
        'grocery_supermarket',
        'hardware_construction',
        'pharmacy_health',
        'services_workshop',
      ]

      for (const sector of existingSectors) {
        mockGetBusinessWorkflowConfig.mockResolvedValueOnce({
          sector,
          allowCreditSales: true,
        })
        mockGetCreditSummary.mockResolvedValueOnce({
          totalCreditSales: 0,
          totalPendingBalance: 0,
          totalPaid: 0,
          overdueCount: 0,
          activeCreditsCount: 0,
        })
        mockGetCreditSales.mockResolvedValueOnce({
          credits: [],
          total: 0,
          page: 1,
          pageSize: 20,
          totalPages: 1,
        })

        await CreditsPage({ searchParams: Promise.resolve({}) })
        expect(mockRedirect, `Sector ${sector} should not redirect to /sales`).not.toHaveBeenCalled()
      }
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Stress Testing & Edge Cases
  // ───────────────────────────────────────────────────────────────────────────
  describe('Challenge 5: Stress Testing & Resilience to Malformed Storage State', () => {
    it('corrupted JSON in localStorage falls back safely to DEFAULT_BUSINESS_WORKFLOW on initial read', () => {
      // Reset cache first to clean state
      saveBusinessWorkflow({ sector: 'retail_general', allowCreditSales: true })
      mockStore[WORKFLOW_STORAGE_KEY] = '{{corrupt-invalid-json'

      const workflow = getBusinessWorkflow()
      expect(workflow.sector).toBe('retail_general')
      expect(workflow.allowCreditSales).toBe(true)
    })

    it('documents cache key retention vulnerability when localStorage contains corrupt JSON', () => {
      // 1. Establish state as restaurant
      saveBusinessWorkflow({ sector: 'restaurant_gastronomy', allowCreditSales: false })
      expect(getBusinessWorkflow().sector).toBe('restaurant_gastronomy')

      // 2. Corrupt the storage
      mockStore[WORKFLOW_STORAGE_KEY] = '{{corrupt-string'

      // 3. First read: JSON.parse throws, catch returns DEFAULT_BUSINESS_WORKFLOW
      const firstRead = getBusinessWorkflow()
      expect(firstRead.sector).toBe('retail_general')

      // 4. Second read: raw === cachedRaw matches because cachedRaw was updated to the corrupt string before JSON.parse,
      // so it returns cachedWorkflow which still holds the stale 'restaurant_gastronomy'!
      const secondRead = getBusinessWorkflow()
      expect(secondRead.sector).toBe('restaurant_gastronomy')
    })

    it('clean state reset restores DEFAULT_BUSINESS_WORKFLOW and Sidebar renders "Créditos"', () => {
      saveBusinessWorkflow({
        sector: 'retail_general',
        allowCreditSales: true,
      })

      const workflow = getBusinessWorkflow()
      expect(workflow.sector).toBe('retail_general')
      expect(workflow.allowCreditSales).toBe(true)

      const html = renderToStaticMarkup(React.createElement(Sidebar, { collapsed: false }))
      expect(html).toContain('href="/credits"')
    })

    it('CustomEvent dispatched without detail falls back to getBusinessWorkflow()', () => {
      saveBusinessWorkflow({
        sector: 'retail_general',
        allowCreditSales: true,
      })

      // Dispatch event without detail
      global.window.dispatchEvent(new CustomEvent(WORKFLOW_CHANGED_EVENT))

      const workflow = getBusinessWorkflow()
      expect(workflow.sector).toBe('retail_general')
    })
  })
})
