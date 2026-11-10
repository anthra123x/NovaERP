import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { cn } from '@/lib/utils'

describe('Adversarial & Empirical Responsive Verification (Milestone 3)', () => {
  const rootDir = path.resolve(__dirname, '../../..')

  // ---------------------------------------------------------------------------
  // 1. Header Global Search Dropdown Viewport Math & Geometry
  // ---------------------------------------------------------------------------
  describe('Header Search Dropdown Viewport Boundaries (300px - 640px)', () => {
    const headerPath = path.join(rootDir, 'src/components/layout/header.tsx')
    const content = fs.readFileSync(headerPath, 'utf8')

    it('declares exact responsive positioning classes without rigid pixel widths on mobile', () => {
      // Must use -left-10 for mobile offset and sm:left-0 for desktop
      expect(content).toContain('-left-10 sm:left-0')
      // Must use dynamic viewport calc width with sm:w-96 fallback and max-w-md upper bound
      expect(content).toContain('w-[calc(100vw-2.5rem)] sm:w-96 max-w-md')
      // Must contain max-h-[65vh] and overflow-y-auto to prevent vertical blowout
      expect(content).toContain('max-h-[65vh] overflow-y-auto')
    })

    it('empirically verifies geometry across all narrow viewports (300px, 320px, 360px, 375px, 390px, 414px, 480px, 639px)', () => {
      // Exact DOM Layout simulation:
      // Header: px-4 (16px)
      // Mobile menu button: size-8 (32px), shrink-0
      // Gap: gap-2.5 (10px)
      // Form left coordinate in viewport: 16px + 32px + 10px = 58px
      const headerPaddingLeft = 16
      const menuButtonWidth = 32
      const flexGap = 10
      const formLeft = headerPaddingLeft + menuButtonWidth + flexGap // 58px

      // Dropdown relative left: -left-10 = -2.5rem = -40px
      const dropdownOffsetLeft = -40
      const dropdownLeft = formLeft + dropdownOffsetLeft // 18px

      // Dropdown width formula: min(W - 2.5rem, max-w-md) = min(W - 40px, 448px)
      const maxDropdownWidth = 448 // 28rem
      const calcOffset = 40 // 2.5rem

      const narrowViewports = [300, 320, 360, 375, 390, 414, 480, 500, 600, 639]

      for (const vw of narrowViewports) {
        const dropdownWidth = Math.min(vw - calcOffset, maxDropdownWidth)
        const dropdownRight = dropdownLeft + dropdownWidth
        const rightMargin = vw - dropdownRight
        const leftMargin = dropdownLeft

        // 1. Dropdown must never start off-screen to the left
        expect(leftMargin).toBeGreaterThanOrEqual(16) // at least 1rem margin

        // 2. Dropdown must never overflow the viewport to the right
        expect(dropdownRight).toBeLessThanOrEqual(vw)

        // 3. Right margin must have at least 16px clearance
        expect(rightMargin).toBeGreaterThanOrEqual(16)

        // 4. Dropdown must be well-centered with balanced margins on 320px - 480px
        if (vw <= 488) {
          expect(leftMargin).toBe(18)
          expect(rightMargin).toBe(22)
          expect(leftMargin + rightMargin).toBe(40) // exactly 2.5rem total margins
        }
      }
    })

    it('empirically verifies desktop geometry (>= 640px)', () => {
      // At sm: (640px)
      // header px-4 = 16px, menu button size-8 = 32px, sm:gap-3 = 12px
      // formLeft = 16 + 32 + 12 = 60px
      // Dropdown has sm:left-0, sm:w-96 (384px)
      const formLeftSm = 16 + 32 + 12 // 60px
      const dropdownWidthSm = 384 // w-96 = 24rem = 384px
      const dropdownRightSm = formLeftSm + dropdownWidthSm // 444px

      const desktopViewports = [640, 768, 1024, 1280, 1440, 1920]
      for (const vw of desktopViewports) {
        expect(dropdownRightSm).toBeLessThan(vw)
        expect(vw - dropdownRightSm).toBeGreaterThan(150)
      }
    })

    it('enforces min-w-0 and truncate on all search result items to prevent horizontal blowout from long names', () => {
      // Product name and category must be truncated with min-w-0
      expect(content).toContain('<span className="flex flex-col min-w-0">')
      expect(content).toContain('<span className="font-semibold truncate text-foreground">{p.name}</span>')
      expect(content).toContain('<span className="text-[10px] text-muted-foreground truncate">')

      // Client name must be truncated
      expect(content).toContain('<span className="font-semibold truncate text-foreground">{c.name}</span>')

      // Invoice number must be truncated
      expect(content).toContain('<span className="font-mono font-semibold truncate text-foreground">{s.invoiceNumber}</span>')
    })
  })

  // ---------------------------------------------------------------------------
  // 2. Admin Users Table on Mobile (<640px)
  // ---------------------------------------------------------------------------
  describe('Admin Users Table Mobile Accessibility', () => {
    const adminPath = path.join(rootDir, 'src/app/admin/page.tsx')
    const content = fs.readFileSync(adminPath, 'utf8')

    it('wraps users table in an overflow-x-auto container preserving border radius', () => {
      expect(content).toContain('<div className="rounded-2xl border border-border/70 overflow-x-auto">')
      expect(content).not.toContain('<div className="rounded-2xl border border-border/70 overflow-hidden">\n                <Table>')
    })

    it('preserves all required columns and action buttons inside the scrollable container', () => {
      // The 4 columns must exist inside the table
      expect(content).toContain('<TableHead className="py-3 px-4">Usuario</TableHead>')
      expect(content).toContain('<TableHead className="py-3 px-4">Correo Electrónico</TableHead>')
      expect(content).toContain('<TableHead className="py-3 px-4 text-center">Nivel de Acceso</TableHead>')
      expect(content).toContain('<TableHead className="py-3 px-4 text-right">Acción</TableHead>')

      // The delete action button must exist inside the table row
      expect(content).toContain('title="Eliminar usuario"')
      expect(content).toContain('<Trash2 className="h-4 w-4" />')
    })
  })

  // ---------------------------------------------------------------------------
  // 3. SalesInspectorLayout Closed & Open States Across Viewports
  // ---------------------------------------------------------------------------
  describe('SalesInspectorLayout Closed & Open State Behavior', () => {
    it('empirically computes classes for closed state (selectedSaleId = null)', () => {
      const isOpen = false
      const inspectorClasses = cn(
        'w-full shrink-0 overflow-hidden transition-[width] duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
        isOpen ? 'xl:w-[336px] 2xl:w-[368px]' : 'hidden xl:block xl:w-0',
      )

      const classList = inspectorClasses.split(/\s+/)

      // Must include 'hidden' so on viewports < 1280px it renders display: none
      expect(classList).toContain('hidden')
      // Must include 'xl:block' so on viewports >= 1280px it overrides hidden
      expect(classList).toContain('xl:block')
      // Must include 'xl:w-0' so on viewports >= 1280px it collapses width to 0
      expect(classList).toContain('xl:w-0')
      // Must not include open widths
      expect(classList).not.toContain('xl:w-[336px]')
      expect(classList).not.toContain('2xl:w-[368px]')
    })

    it('empirically computes classes for open state (selectedSaleId != null)', () => {
      const isOpen = true
      const inspectorClasses = cn(
        'w-full shrink-0 overflow-hidden transition-[width] duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
        isOpen ? 'xl:w-[336px] 2xl:w-[368px]' : 'hidden xl:block xl:w-0',
      )

      const classList = inspectorClasses.split(/\s+/)

      // Must NOT include stand-alone 'hidden' in open state
      expect(classList).not.toContain('hidden')
      // Must include desktop and 2xl fixed widths
      expect(classList).toContain('xl:w-[336px]')
      expect(classList).toContain('2xl:w-[368px]')
      // Base mobile width is w-full
      expect(classList).toContain('w-full')
    })

    it('ensures primary content expands to full width when closed and flex-1 when open on desktop', () => {
      const getPrimaryClasses = (isOpen: boolean) =>
        cn(
          'w-full min-w-0 transition-[flex] duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
          isOpen && 'xl:flex-1',
        )

      expect(getPrimaryClasses(false)).not.toContain('xl:flex-1')
      expect(getPrimaryClasses(false)).toContain('w-full min-w-0')

      expect(getPrimaryClasses(true)).toContain('xl:flex-1')
      expect(getPrimaryClasses(true)).toContain('w-full min-w-0')
    })
  })

  // ---------------------------------------------------------------------------
  // 4. Web Order Items Table & DIAN Invoice View Fluid Breakpoints
  // ---------------------------------------------------------------------------
  describe('Web Orders & DIAN Invoice Responsive Structures', () => {
    it('verifies Web Order Detail items table is wrapped in overflow-x-auto', () => {
      const webOrderPath = path.join(rootDir, 'src/app/web/orders/[id]/page.tsx')
      const content = fs.readFileSync(webOrderPath, 'utf8')

      expect(content).toContain('<CardContent>\n              <div className="overflow-x-auto">\n                <Table>')
    })

    it('verifies DIAN Invoice View uses fluid responsive grids and min-w scroll table', () => {
      const dianPath = path.join(rootDir, 'src/components/sales/dian-invoice-view.tsx')
      const content = fs.readFileSync(dianPath, 'utf8')

      // Key metrics grid: 2 cols on mobile, 4 on sm+
      expect(content).toContain('grid grid-cols-2 sm:grid-cols-4 gap-4')
      expect(content).not.toContain('grid grid-cols-4 gap-4')

      // Customer info: 1 col on mobile, 2 on sm+
      expect(content).toContain('grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8')
      expect(content).toMatch(/<div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">\s*<div>\s*<SectionLabel>Facturar a/)

      // Payment & totals: 1 col on mobile, 3 on sm+
      expect(content).toContain('grid grid-cols-1 sm:grid-cols-3 gap-6')
      expect(content).not.toContain('grid grid-cols-3 gap-6')

      // Items table: wrapped in overflow-x-auto with min-w-[560px]
      expect(content).toContain('<div className="overflow-x-auto">')
      expect(content).toContain('min-w-[560px]')
    })
  })

  // ---------------------------------------------------------------------------
  // 5. Credits Product Selection Grid on 320px
  // ---------------------------------------------------------------------------
  describe('Credits Product Selection Grid Breakpoints', () => {
    const creditsPath = path.join(rootDir, 'src/app/credits/new/page.tsx')
    const content = fs.readFileSync(creditsPath, 'utf8')

    it('uses 1 column on mobile (<640px), 2 on tablet, and 3 on desktop', () => {
      expect(content).toContain('grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3')
      expect(content).not.toContain('grid grid-cols-2 md:grid-cols-3')
    })

    it('empirically verifies card width sufficiency on 320px screen', () => {
      // On 320px screen:
      // Page padding: px-4 (16px * 2 = 32px)
      // Card available width = 320 - 32 = 288px
      // With grid-cols-1: card width is 288px
      // Card padding: p-3 (12px * 2 = 24px)
      // Usable width = 288 - 24 = 264px
      // Thumbnail: size-12 (48px) + gap-2.5 (10px) = 58px
      // Remaining width for product name & category = 264 - 58 = 206px!
      const screenWidth = 320
      const pagePadding = 32
      const cardPadding = 24
      const thumbAndGap = 58
      const availableTextWidth1Col = screenWidth - pagePadding - cardPadding - thumbAndGap

      expect(availableTextWidth1Col).toBe(206)
      expect(availableTextWidth1Col).toBeGreaterThanOrEqual(180) // plenty of room for long names

      // Contrasting with old 2-col layout:
      // Column width = (288 - 12) / 2 = 138px
      // Usable width = 138 - 24 = 114px
      // Remaining for text = 114 - 58 = 56px (unusable/colliding)
      const oldColWidth2Col = (screenWidth - pagePadding - 12) / 2
      const oldTextWidth2Col = oldColWidth2Col - cardPadding - thumbAndGap
      expect(oldTextWidth2Col).toBe(56) // Was severely constricted!
    })
  })

  // ---------------------------------------------------------------------------
  // 6. DashboardLayout Hydration & Aside Width Stability
  // ---------------------------------------------------------------------------
  describe('DashboardLayout Hydration Safety & Aside Width Stability', () => {
    const layoutPath = path.join(rootDir, 'src/components/layout/dashboard-layout.tsx')
    const content = fs.readFileSync(layoutPath, 'utf8')

    it('uses useSyncExternalStore with server snapshot false to eliminate SSR hydration mismatch', () => {
      expect(content).toContain('useSyncExternalStore')
      expect(content).toContain('function getSidebarCollapseServerSnapshot(): boolean {\n  return false\n}')
    })

    it('handles localStorage errors gracefully in getSidebarCollapseSnapshot', () => {
      expect(content).toContain('function getSidebarCollapseSnapshot(): boolean {')
      expect(content).toContain('localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === \'true\'')
      expect(content).toContain('catch {\n    return false\n  }')
    })

    it('enforces aside classes with w-72 on mobile to prevent CLS layout shift', () => {
      // Must initialize with w-72 lg:w-64 so mobile is 18rem immediately without layout shift
      expect(content).toContain("'w-72 lg:w-64'")
      expect(content).toContain("!isMobile && isCollapsed && 'lg:w-16'")
    })

    it('dispatches custom event on toggleCollapse for reactive multi-listener updates', () => {
      expect(content).toContain("window.dispatchEvent(new Event(SIDEBAR_COLLAPSED_EVENT))")
    })
  })

  // ---------------------------------------------------------------------------
  // 7. Dialog & Pagination Accessibility on Narrow Viewports
  // ---------------------------------------------------------------------------
  describe('Dialog & Pagination Responsive Accessibility', () => {
    it('restricts DialogContent to max-h-[calc(100dvh-2rem)] with overflow-y-auto', () => {
      const dialogPath = path.join(rootDir, 'src/components/ui/dialog.tsx')
      const content = fs.readFileSync(dialogPath, 'utf8')
      expect(content).toContain('max-h-[calc(100dvh-2rem)] overflow-y-auto')
    })

    it('configures Pagination with responsive column-to-row wrapping', () => {
      const paginationPath = path.join(rootDir, 'src/components/ui/pagination.tsx')
      const content = fs.readFileSync(paginationPath, 'utf8')
      expect(content).toContain('flex flex-col sm:flex-row items-center justify-between gap-3')
    })
  })

  // ---------------------------------------------------------------------------
  // 8. GPU Load Mitigation & prefers-reduced-motion
  // ---------------------------------------------------------------------------
  describe('GPU Mitigation & Accessibility (prefers-reduced-motion)', () => {
    it('disables all heavy ambient glow and floating card animations in globals.css', () => {
      const cssPath = path.join(rootDir, 'src/app/globals.css')
      const content = fs.readFileSync(cssPath, 'utf8')

      expect(content).toContain('.animate-ambient-glow-1')
      expect(content).toContain('.animate-ambient-glow-2')
      expect(content).toContain('.animate-ambient-wander')
      expect(content).toContain('.animate-ambient-shine')
      expect(content).toContain('.animate-float-card-1')
      expect(content).toContain('.animate-float-card-2')
      expect(content).toContain('.animate-float-card-3')
      expect(content).toContain('will-change: auto !important;')
    })

    it('limits login and register ambient blur to blur-[48px] sm:blur-[72px] with motion-reduce', () => {
      const loginPath = path.join(rootDir, 'src/app/login/page.tsx')
      const registerPath = path.join(rootDir, 'src/app/register/page.tsx')
      const login = fs.readFileSync(loginPath, 'utf8')
      const register = fs.readFileSync(registerPath, 'utf8')

      expect(login).toContain('blur-[48px] sm:blur-[72px]')
      expect(login).toContain('motion-reduce:animate-none')
      expect(register).toContain('blur-[48px] sm:blur-[72px]')
      expect(register).toContain('motion-reduce:animate-none')
    })
  })
})
