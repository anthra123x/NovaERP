import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  BusinessSector,
  BusinessWorkflowConfig,
  SECTOR_WORKFLOW_DEFAULTS,
} from '@/lib/business-workflow'

describe('Sidebar & Interface Navigation Filtering by Business Sector (Milestone 2)', () => {
  const rootDir = path.resolve(__dirname, '../../..')
  const sidebarPath = path.join(rootDir, 'src/components/layout/sidebar.tsx')
  const dashboardPath = path.join(rootDir, 'src/app/dashboard/page.tsx')
  const insightsPath = path.join(rootDir, 'src/app/dashboard/business-insights.tsx')
  const shortcutsPath = path.join(rootDir, 'src/lib/keyboard-shortcuts.ts')
  const creditsPath = path.join(rootDir, 'src/app/credits/page.tsx')
  const creditsNewPath = path.join(rootDir, 'src/app/credits/new/page.tsx')

  const baseNavigation = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Ventas', href: '/sales' },
    { name: 'Créditos', href: '/credits' },
    { name: 'Inventario', href: '/inventory' },
    { name: 'Clientes', href: '/clients' },
  ]

  function filterNavigation(workflow: Pick<BusinessWorkflowConfig, 'sector' | 'allowCreditSales'>) {
    const isCreditDisabled = workflow.sector === 'restaurant_gastronomy' || workflow.allowCreditSales === false
    return baseNavigation.filter((item) => !(item.href === '/credits' && isCreditDisabled))
  }

  /* =========================================================================
   * 1. Dynamic Navigation Filtering for Restaurant & Gastronomy
   * ========================================================================= */
  describe('1. Restaurant & Gastronomy Navigation Isolation', () => {
    it('omits "Créditos" from navigation when sector is restaurant_gastronomy', () => {
      const gastronomyWorkflow = {
        sector: 'restaurant_gastronomy' as BusinessSector,
        allowCreditSales: false,
      }
      const visible = filterNavigation(gastronomyWorkflow)

      expect(visible.map((i) => i.name)).toEqual(['Dashboard', 'Ventas', 'Inventario', 'Clientes'])
      expect(visible.some((i) => i.href === '/credits')).toBe(false)
      expect(visible.length).toBe(4)
    })

    it('omits "Créditos" even if allowCreditSales was somehow set to true for restaurant_gastronomy', () => {
      // Defensive guarantee: restaurant_gastronomy must never show credits regardless of toggle
      const defensiveGastronomy = {
        sector: 'restaurant_gastronomy' as BusinessSector,
        allowCreditSales: true,
      }
      const visible = filterNavigation(defensiveGastronomy)

      expect(visible.some((i) => i.href === '/credits')).toBe(false)
    })

    it('omits "Créditos" when allowCreditSales is explicitly false for any sector', () => {
      const retailNoCredit = {
        sector: 'retail_general' as BusinessSector,
        allowCreditSales: false,
      }
      const visible = filterNavigation(retailNoCredit)

      expect(visible.some((i) => i.href === '/credits')).toBe(false)
      expect(visible.length).toBe(4)
    })
  })

  /* =========================================================================
   * 2. Backward Compatibility for Existing 7 Sectors
   * ========================================================================= */
  describe('2. Preservation of Navigation for Existing Sectors', () => {
    const existingSectors: BusinessSector[] = [
      'retail_general',
      'technology_repair',
      'fashion_apparel',
      'grocery_supermarket',
      'hardware_construction',
      'pharmacy_health',
      'services_workshop',
    ]

    existingSectors.forEach((sector) => {
      it(`preserves "Créditos" in navigation for ${sector} when allowCreditSales is true`, () => {
        const workflow = {
          sector,
          allowCreditSales: true,
        }
        const visible = filterNavigation(workflow)

        expect(visible.map((i) => i.name)).toEqual([
          'Dashboard',
          'Ventas',
          'Créditos',
          'Inventario',
          'Clientes',
        ])
        expect(visible.some((i) => i.href === '/credits')).toBe(true)
        expect(visible.length).toBe(5)
      })
    })

    it('default SECTOR_WORKFLOW_DEFAULTS for restaurant_gastronomy sets allowCreditSales to false', () => {
      expect(SECTOR_WORKFLOW_DEFAULTS.restaurant_gastronomy.allowCreditSales).toBe(false)
    })
  })

  /* =========================================================================
   * 3. Static Code Contracts in Sidebar (`sidebar.tsx`)
   * ========================================================================= */
  describe('3. Code Contracts in src/components/layout/sidebar.tsx', () => {
    it('declares isCreditDisabled checking restaurant_gastronomy and allowCreditSales === false', () => {
      const source = fs.readFileSync(sidebarPath, 'utf8')

      expect(source).toMatch(
        /const\s+isCreditDisabled\s*=\s*workflow\.sector\s*===\s*['"]restaurant_gastronomy['"]\s*\|\|\s*workflow\.allowCreditSales\s*===\s*false/,
      )
      expect(source).toMatch(
        /const\s+visibleNavigation\s*=\s*navigation\.filter\(\s*\(item\)\s*=>\s*!\(item\.href\s*===\s*['"]\/credits['"]\s*&&\s*isCreditDisabled\)\s*\)/,
      )
    })

    it('maps visibleNavigation in both expanded and collapsed rendering branches', () => {
      const source = fs.readFileSync(sidebarPath, 'utf8')

      expect(source).toContain('{visibleNavigation.map((item) => {')
      expect(source).not.toContain('{navigation.map((item) => {')
    })
  })

  /* =========================================================================
   * 4. Dashboard Metric Matrix Contracts (`page.tsx`)
   * ========================================================================= */
  describe('4. Dashboard Page Metric Contracts (Celda D1 & Responsive Grid)', () => {
    const source = fs.readFileSync(dashboardPath, 'utf8')

    it('destructures workflow from useBusinessWorkflow() and computes isCreditDisabled', () => {
      expect(source).toMatch(/const\s+\{\s*config:\s*workflow,\s*profile\s*\}\s*=\s*useBusinessWorkflow\(\)/)
      expect(source).toMatch(
        /const\s+isCreditDisabled\s*=\s*workflow\.sector\s*===\s*['"]restaurant_gastronomy['"]\s*\|\|\s*!workflow\.allowCreditSales/,
      )
    })

    it('renders [D1] COBRO CONTADO with incomeToday and link to /sales when credits are disabled', () => {
      expect(source).toContain('[D1] COBRO CONTADO')
      expect(source).toContain('Recaudado en caja hoy')
      expect(source).toContain('<Link href="/sales" className="font-bold text-primary hover:underline">')
      expect(source).toContain('formatCurrency(incomeToday)')
    })

    it('retains [D1] CARTERA CXC when credits are enabled', () => {
      expect(source).toContain('[D1] CARTERA CXC')
      expect(source).toContain('formatCurrency(pendingCreditTotal)')
      expect(source).toContain('<Link href="/credits"')
    })

    it('preserves the strict 8-cell layout and responsive classes grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8', () => {
      const occurrences = (source.match(/grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8/g) || []).length
      expect(occurrences).toBe(2)

      // Cell identifiers A1 through H1 must all be present
      const cellCodes = ['[A1]', '[B1]', '[C1]', '[D1]', '[E1]', '[F1]', '[G1]', '[H1]']
      cellCodes.forEach((code) => {
        expect(source).toContain(code)
      })
    })
  })

  /* =========================================================================
   * 5. Business Insights Contracts (`business-insights.tsx`)
   * ========================================================================= */
  describe('5. Business Insights Contracts', () => {
    const source = fs.readFileSync(insightsPath, 'utf8')

    it('renders clean liquidity card when isCreditDisabled is true', () => {
      expect(source).toContain("badge: 'OPERACIÓN DE CONTADO'")
      expect(source).toContain("title: 'Sin créditos habilitados'")
      expect(source).toContain("message: 'Las ventas operan 100% de contado o comanda inmediata.'")
      expect(source).toContain("actionLabel: 'Historial de ventas'")
      expect(source).toContain("actionHref: '/sales'")
    })

    it('contains sector tip for restaurant_gastronomy', () => {
      expect(source).toContain('restaurant_gastronomy:')
      expect(source).toContain(
        'Optimiza la rotación de mesas y el despacho de comandas. En gastronomía, el control de mermas y tiempos de servicio asegura la rentabilidad.',
      )
    })
  })

  /* =========================================================================
   * 6. Keyboard Shortcuts Contracts (`keyboard-shortcuts.ts`)
   * ========================================================================= */
  describe('6. Keyboard Shortcuts Protection', () => {
    const source = fs.readFileSync(shortcutsPath, 'utf8')

    it('intercepts Alt + C and blocks navigation to /credits when credit is disabled', () => {
      expect(source).toContain("if (e.altKey && e.key === 'c') {")
      expect(source).toContain('const workflow = getBusinessWorkflow()')
      expect(source).toMatch(
        /if\s*\(\s*workflow\.sector\s*===\s*['"]restaurant_gastronomy['"]\s*\|\|\s*!workflow\.allowCreditSales\s*\)\s*\{\s*return\s*\}/,
      )
    })
  })

  /* =========================================================================
   * 7. Defensive Route Protection in Credits Pages
   * ========================================================================= */
  describe('7. Defensive Route Protection in Credits Pages', () => {
    const creditsSource = fs.readFileSync(creditsPath, 'utf8')
    const creditsNewSource = fs.readFileSync(creditsNewPath, 'utf8')

    it('src/app/credits/page.tsx redirects to /sales if sector is gastronomy or credit is disabled', () => {
      expect(creditsSource).toContain('getBusinessWorkflowConfig()')
      expect(creditsSource).toMatch(
        /if\s*\(\s*workflow\.sector\s*===\s*['"]restaurant_gastronomy['"]\s*\|\|\s*!workflow\.allowCreditSales\s*\)\s*\{\s*redirect\(['"]\/sales['"]\)\s*\}/,
      )
    })

    it('src/app/credits/new/page.tsx defensively redirects to /sales', () => {
      expect(creditsNewSource).toContain("redirect('/sales')")
      expect(creditsNewSource).toContain("router.replace('/sales')")
    })
  })
})
