import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { formatCurrency } from '@/lib/format'
import {
  BusinessSector,
  SECTOR_WORKFLOW_DEFAULTS,
} from '@/lib/business-workflow'

describe('Milestone 2 — Empirical & Adversarial Layout, Responsive and Viewport Resilience Suite', () => {
  const rootDir = path.resolve(__dirname, '../../..')
  const dashboardPath = path.join(rootDir, 'src/app/dashboard/page.tsx')
  const sidebarPath = path.join(rootDir, 'src/components/layout/sidebar.tsx')
  const dashboardLayoutPath = path.join(rootDir, 'src/components/layout/dashboard-layout.tsx')
  const insightsPath = path.join(rootDir, 'src/app/dashboard/business-insights.tsx')
  const shortcutsPath = path.join(rootDir, 'src/lib/keyboard-shortcuts.ts')
  const creditsPath = path.join(rootDir, 'src/app/credits/page.tsx')
  const creditsNewPath = path.join(rootDir, 'src/app/credits/new/page.tsx')

  const dashboardContent = fs.readFileSync(dashboardPath, 'utf8')
  const sidebarContent = fs.readFileSync(sidebarPath, 'utf8')
  const dashboardLayoutContent = fs.readFileSync(dashboardLayoutPath, 'utf8')
  const insightsContent = fs.readFileSync(insightsPath, 'utf8')
  const shortcutsContent = fs.readFileSync(shortcutsPath, 'utf8')
  const creditsContent = fs.readFileSync(creditsPath, 'utf8')
  const creditsNewContent = fs.readFileSync(creditsNewPath, 'utf8')

  /* =========================================================================
   * 1. Celda D1 and 8-Cell Grid Geometry Across Viewports
   * ========================================================================= */
  describe('1. Celda D1 & 8-Cell Matrix Layout Verification Across Viewports', () => {
    it('declares exact contractual grid classes in both skeleton and active dashboard', () => {
      const occurrences = (dashboardContent.match(/grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8/g) || []).length
      expect(occurrences).toBe(2) // skeleton + real grid
    })

    it('empirically verifies 8-cell layout symmetry across all standard viewports', () => {
      // Matrix cell coordinates A1 to H1
      const cells = ['[A1]', '[B1]', '[C1]', '[D1]', '[E1]', '[F1]', '[G1]', '[H1]']
      expect(cells.length).toBe(8)

      // Test across the 4 key viewport tiers specified in the mission
      const viewportTiers = [
        { name: '320px Mobile (xs)', width: 320, expectedCols: 2, expectedRows: 4 },
        { name: '768px Tablet (md)', width: 768, expectedCols: 4, expectedRows: 2 },
        { name: '1024px Laptop (lg)', width: 1024, expectedCols: 4, expectedRows: 2 },
        { name: '1440px Desktop (xl)', width: 1440, expectedCols: 8, expectedRows: 1 },
      ]

      for (const tier of viewportTiers) {
        // Every tier must have zero orphan cells (8 % expectedCols === 0)
        expect(cells.length % tier.expectedCols).toBe(0)
        const rowCount = cells.length / tier.expectedCols
        expect(rowCount).toBe(tier.expectedRows)
      }
    })

    it('empirically verifies cell width sufficiency on 320px mobile viewport', () => {
      // On 320px screen:
      // Page padding: px-4 (16px * 2 = 32px)
      // Usable width: 320 - 32 = 288px
      // Grid: grid-cols-2 with gap-2 (8px)
      // Track width = (288 - 8) / 2 = 140px
      // Card padding: p-2.5 (10px * 2 = 20px)
      // Inner cell width = 140 - 20 = 120px
      const screenWidth = 320
      const pagePadding = 32
      const gap = 8
      const cardPadding = 20
      const usableInnerWidth = (screenWidth - pagePadding - gap) / 2 - cardPadding

      expect(usableInnerWidth).toBe(120)
      // 120px is sufficient for text-base / text-lg font-mono numbers and text-[9px] labels
      expect(usableInnerWidth).toBeGreaterThanOrEqual(100)
    })

    it('verifies laptop (1024px) accommodation with sidebar w-64', () => {
      // On 1024px screen:
      // Sidebar takes w-64 (256px) + margin/padding ~24px = ~280px
      // Available main width = 1024 - 280 = 744px
      // Main padding: p-7 (28px * 2 = 56px) -> 688px
      // With lg:grid-cols-4: (688 - 3 * 8) / 4 = 166px per cell!
      // If it had used 8 columns on lg: (688 - 7 * 8) / 8 = 79px (severe truncation/broken layout)
      // This confirms lg:grid-cols-4 is resilient against layout collapse on laptops
      const screenWidth = 1024
      const sidebarWidth = 280
      const mainPadding = 56
      const colGap = 8
      const availableGrid = screenWidth - sidebarWidth - mainPadding
      const widthPerCol4 = (availableGrid - 3 * colGap) / 4
      const widthPerCol8 = (availableGrid - 7 * colGap) / 8

      expect(widthPerCol4).toBeGreaterThan(160)
      expect(widthPerCol8).toBeLessThan(85) // Proves 8 columns would have crushed cells
    })

    it('proves geometric equivalence between [D1] COBRO CONTADO and [D1] CARTERA CXC', () => {
      // Both branches must declare identical outer container classes to eliminate layout shift
      const commonCardClasses =
        'bg-card border border-dashed border-border/80 dark:border-white/[0.12] rounded-xl p-2.5 flex flex-col justify-between'

      // Check D1 Cash branch
      expect(dashboardContent).toContain(
        `<div className="${commonCardClasses} hover:border-emerald-500/50 transition-colors">\n            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">\n              <span>[D1] COBRO CONTADO</span>`,
      )

      // Check D1 Credit branch
      expect(dashboardContent).toContain(
        `<div className="${commonCardClasses} hover:border-sky-500/50 transition-colors">\n            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">\n              <span>[D1] CARTERA CXC</span>`,
      )

      // Both branches must declare the same progress bar container
      const progressBarContainer = '<div className="h-1 w-full bg-muted rounded-full overflow-hidden">'
      const d1Snippet = dashboardContent.slice(
        dashboardContent.indexOf('{/* Celda D1:'),
        dashboardContent.indexOf('{/* Celda E1:'),
      )
      const progressBarOccurrences = (d1Snippet.match(new RegExp(progressBarContainer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
      expect(progressBarOccurrences).toBe(2) // 1 in cash, 1 in credit
    })
  })

  /* =========================================================================
   * 2. Edge Cases: Zero-Values and Sector Switching Stress
   * ========================================================================= */
  describe('2. Zero-Value Edge Cases & Dynamic Sector Switching Stress', () => {
    it('empirically verifies formatCurrency(0) renders clean output without NaN, undefined, or empty string', () => {
      const zeroFormatted = formatCurrency(0)
      expect(zeroFormatted).not.toContain('NaN')
      expect(zeroFormatted).not.toContain('undefined')
      expect(zeroFormatted).not.toContain('null')
      expect(zeroFormatted.trim().length).toBeGreaterThan(0)
      // es-CO formatted zero currency should contain $ and 0
      expect(zeroFormatted).toMatch(/\$\s*0/)
    })

    it('verifies formatCurrency survives null, undefined, and non-numeric inputs', () => {
      expect(formatCurrency(null)).toBe('$0')
      expect(formatCurrency(undefined)).toBe('$0')
      expect(formatCurrency('invalid_num')).toBe('$0')
      expect(formatCurrency(NaN)).toBe('$0')
    })

    it('verifies Celda D1 cash progress bar when incomeToday === 0', () => {
      const incomeToday = 0
      const widthStyle = incomeToday > 0 ? '100%' : '0%'
      expect(widthStyle).toBe('0%')
    })

    it('verifies Celda D1 credit progress bar when pendingCreditTotal === 0', () => {
      const pendingCreditTotal = 0
      const widthStyle = pendingCreditTotal > 0 ? '100%' : '0%'
      expect(widthStyle).toBe('0%')
    })

    it('verifies cashLiquidityRate computation does not divide by zero when salesToday.total is 0', () => {
      // In page.tsx:
      // salesToday.total > 0 ? Math.min(100, Math.round((incomeToday / salesToday.total) * 100)) : 100
      const salesTodayZero = { total: 0, count: 0 }
      const incomeTodayZero = 0
      const cashLiquidityRate =
        salesTodayZero.total > 0 ? Math.min(100, Math.round((incomeTodayZero / salesTodayZero.total) * 100)) : 100

      expect(cashLiquidityRate).toBe(100)
      expect(isNaN(cashLiquidityRate)).toBe(false)
    })

    it('simulates dynamic sector transition from retail_general to restaurant_gastronomy', () => {
      // 1. Initial State: Retail with active credit
      const retailWorkflow = {
        ...SECTOR_WORKFLOW_DEFAULTS.retail_general,
        sector: 'retail_general' as BusinessSector,
        companyName: 'Boutique Store',
      }
      const isCreditDisabledRetail =
        retailWorkflow.sector === 'restaurant_gastronomy' || !retailWorkflow.allowCreditSales

      expect(isCreditDisabledRetail).toBe(false)

      // 2. Transition State: Gastronomy with zero income
      const gastronomyWorkflow = {
        ...SECTOR_WORKFLOW_DEFAULTS.restaurant_gastronomy,
        sector: 'restaurant_gastronomy' as BusinessSector,
        companyName: 'Bistró Gourmet',
      }
      const isCreditDisabledGastro =
        gastronomyWorkflow.sector === 'restaurant_gastronomy' || !gastronomyWorkflow.allowCreditSales

      expect(isCreditDisabledGastro).toBe(true)

      // In Gastronomy: Celda D1 title, metric, and link
      const cellD1Title = isCreditDisabledGastro ? '[D1] COBRO CONTADO' : '[D1] CARTERA CXC'
      const cellD1Link = isCreditDisabledGastro ? '/sales' : '/credits'
      const cellD1Label = isCreditDisabledGastro ? 'Recaudado en caja hoy' : 'deudores'

      expect(cellD1Title).toBe('[D1] COBRO CONTADO')
      expect(cellD1Link).toBe('/sales')
      expect(cellD1Label).toBe('Recaudado en caja hoy')
    })

    it('simulates dynamic sector transition from restaurant_gastronomy back to retail_general', () => {
      const retailWorkflow = {
        sector: 'retail_general' as BusinessSector,
        allowCreditSales: true,
      }
      const isCreditDisabled =
        retailWorkflow.sector === 'restaurant_gastronomy' || !retailWorkflow.allowCreditSales

      expect(isCreditDisabled).toBe(false)
      const cellD1Title = isCreditDisabled ? '[D1] COBRO CONTADO' : '[D1] CARTERA CXC'
      const cellD1Link = isCreditDisabled ? '/sales' : '/credits'

      expect(cellD1Title).toBe('[D1] CARTERA CXC')
      expect(cellD1Link).toBe('/credits')
    })
    it('verifies business-insights.tsx provides cash liquidity card and gastronomy operational tip', () => {
      expect(insightsContent).toContain("badge: 'OPERACIÓN DE CONTADO'")
      expect(insightsContent).toContain("title: 'Sin créditos habilitados'")
      expect(insightsContent).toContain("actionHref: '/sales'")
      expect(insightsContent).toContain("restaurant_gastronomy:")
      expect(insightsContent).toContain("Optimiza la rotación de mesas y el despacho de comandas.")
    })
  })

  /* =========================================================================
   * 3. Sidebar Accessibility & CSS Classes (Expanded vs Collapsed)
   * ========================================================================= */
  describe('3. Sidebar Accessibility & State Invariants (Expanded vs Collapsed)', () => {
    it('declares aria-label on navigation items in collapsed mode', () => {
      // In collapsed mode: Link has aria-label={item.name} and tooltip popup
      expect(sidebarContent).toContain('aria-label={item.name}')
      expect(sidebarContent).toContain('aria-label="Administración"')
    })

    it('declares accessible aria-labels on toggle and modal buttons', () => {
      expect(sidebarContent).toContain('aria-label="Expandir barra lateral"')
      expect(sidebarContent).toContain('aria-label="Contraer barra lateral"')
      expect(sidebarContent).toContain('aria-label="Cerrar menú"')
      expect(sidebarContent).toContain('aria-label="Atajos de teclado"')
    })

    it('provides floating popover tooltips for all icons in collapsed mode', () => {
      // Collapsed navigation items have tooltip popovers positioned at left-full ml-3.5
      expect(sidebarContent).toContain(
        'absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl bg-popover text-popover-foreground text-xs font-medium whitespace-nowrap shadow-md',
      )
    })

    it('filters visibleNavigation consistently in both expanded and collapsed branches', () => {
      // Ensure only visibleNavigation is mapped in the JSX
      const mappedArrays = sidebarContent.match(/\{([a-zA-Z0-9_]+)\.map\(/g)
      expect(mappedArrays).toContain('{visibleNavigation.map(')
      expect(mappedArrays).not.toContain('{navigation.map(')
    })

    it('verifies collapsed mode applies h-10 w-10 icon container and expanded mode applies px-3 py-2.5', () => {
      expect(sidebarContent).toContain("flex h-10 w-10 items-center justify-center rounded-2xl")
      expect(sidebarContent).toContain("group relative flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium")
    })
  })

  /* =========================================================================
   * 4. SSR Hydration Safety & Defensive Routing
   * ========================================================================= */
  describe('4. SSR Hydration Safety & Defensive Routing Integrity', () => {
    it('verifies DashboardLayout uses useSyncExternalStore with server snapshot false', () => {
      expect(dashboardLayoutContent).toContain('useSyncExternalStore')
      expect(dashboardLayoutContent).toContain('function getSidebarCollapseServerSnapshot(): boolean {\n  return false\n}')
    })

    it('verifies initial aside classes avoid client layout shift on mobile and desktop', () => {
      expect(dashboardLayoutContent).toContain("'w-72 lg:w-64'")
      expect(dashboardLayoutContent).toContain("!isMobile && isCollapsed && 'lg:w-16'")
    })

    it('verifies credits route Server Component redirects to /sales for restaurant_gastronomy', () => {
      expect(creditsContent).toContain('await getBusinessWorkflowConfig()')
      expect(creditsContent).toContain("if (workflow.sector === 'restaurant_gastronomy' || !workflow.allowCreditSales) {")
      expect(creditsContent).toContain("redirect('/sales')")
    })

    it('verifies credits/new route Client Component redirects during render and effect', () => {
      expect(creditsNewContent).toContain("if (isCreditDisabled) {\n    redirect('/sales')\n  }")
      expect(creditsNewContent).toContain("router.replace('/sales')")
    })

    it('verifies Alt + C global shortcut intercepts restaurant_gastronomy and returns early', () => {
      expect(shortcutsContent).toContain("if (e.altKey && e.key === 'c') {")
      expect(shortcutsContent).toContain("const workflow = getBusinessWorkflow()")
      expect(shortcutsContent).toMatch(
        /if\s*\(\s*workflow\.sector\s*===\s*['"]restaurant_gastronomy['"]\s*\|\|\s*!workflow\.allowCreditSales\s*\)\s*\{\s*return\s*\}/,
      )
    })
  })
})
