import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Responsive Layout & Frontend Optimization Verification', () => {
  const rootDir = path.resolve(__dirname, '../../..')

  it('Header Global Search dropdown has responsive viewport bounds on mobile (<380px)', () => {
    const headerPath = path.join(rootDir, 'src/components/layout/header.tsx')
    const content = fs.readFileSync(headerPath, 'utf8')

    // Dropdown must not force a rigid 320px width on screens < 380px with left-0
    expect(content).toContain('-left-10 sm:left-0')
    expect(content).toContain('w-[calc(100vw-2.5rem)] sm:w-96 max-w-md')
  })

  it('Admin users table wrapper uses overflow-x-auto instead of overflow-hidden', () => {
    const adminPath = path.join(rootDir, 'src/app/admin/page.tsx')
    const content = fs.readFileSync(adminPath, 'utf8')

    expect(content).toContain('rounded-2xl border border-border/70 overflow-x-auto')
    expect(content).not.toContain('rounded-2xl border border-border/70 overflow-hidden')
  })

  it('SalesInspectorLayout hides inactive panel on screens < 1280px to eliminate ghost height', () => {
    const layoutPath = path.join(rootDir, 'src/components/sales/sales-inspector-layout.tsx')
    const content = fs.readFileSync(layoutPath, 'utf8')

    expect(content).toContain("isOpen ? 'xl:w-[336px] 2xl:w-[368px]' : 'hidden xl:block xl:w-0'")
  })

  it('Web Order Detail page wraps the items table with overflow-x-auto', () => {
    const webOrderPath = path.join(rootDir, 'src/app/web/orders/[id]/page.tsx')
    const content = fs.readFileSync(webOrderPath, 'utf8')

    expect(content).toMatch(/<CardContent>\s*<div className="overflow-x-auto">\s*<Table>/)
  })

  it('DIAN invoice view uses fluid responsive breakpoints and overflow scroll wrapper', () => {
    const dianPath = path.join(rootDir, 'src/components/sales/dian-invoice-view.tsx')
    const content = fs.readFileSync(dianPath, 'utf8')

    expect(content).toContain('grid grid-cols-2 sm:grid-cols-4 gap-4')
    expect(content).toContain('grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8')
    expect(content).toContain('grid grid-cols-1 sm:grid-cols-3 gap-6')
    expect(content).toContain('<div className="overflow-x-auto">')
    expect(content).toContain('min-w-[560px]')
  })

  it('DashboardLayout avoids synchronous localStorage reading on SSR to prevent hydration mismatch', () => {
    const dashboardLayoutPath = path.join(rootDir, 'src/components/layout/dashboard-layout.tsx')
    const content = fs.readFileSync(dashboardLayoutPath, 'utf8')

    // useSyncExternalStore must provide server snapshot of false to prevent hydration mismatch
    expect(content).toContain('useSyncExternalStore')
    expect(content).toContain('getSidebarCollapseServerSnapshot(): boolean {\n  return false')
    // aside must include mobile drawer width w-72 and desktop w-64
    expect(content).toContain("'w-72 lg:w-64'")
  })

  it('Dashboard metric grid adapts to lg:grid-cols-4 xl:grid-cols-8 for laptops', () => {
    const dashboardPath = path.join(rootDir, 'src/app/dashboard/page.tsx')
    const content = fs.readFileSync(dashboardPath, 'utf8')

    // Both skeleton and real metric matrix must use lg:grid-cols-4 xl:grid-cols-8
    const occurrences = (content.match(/grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8/g) || []).length
    expect(occurrences).toBe(2)
  })

  it('Credits product grid starts at 1 column on 320px mobile displays', () => {
    const creditsPath = path.join(rootDir, 'src/app/credits/new/page.tsx')
    const content = fs.readFileSync(creditsPath, 'utf8')

    expect(content).toContain('grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3')
  })

  it('DialogContent constrains maximum viewport height and enables vertical scroll', () => {
    const dialogPath = path.join(rootDir, 'src/components/ui/dialog.tsx')
    const content = fs.readFileSync(dialogPath, 'utf8')

    expect(content).toContain('max-h-[calc(100dvh-2rem)] overflow-y-auto')
  })

  it('Pagination applies responsive column-to-row wrapping for mobile viewports', () => {
    const paginationPath = path.join(rootDir, 'src/components/ui/pagination.tsx')
    const content = fs.readFileSync(paginationPath, 'utf8')

    expect(content).toContain('flex flex-col sm:flex-row items-center justify-between gap-3')
  })

  it('Globals CSS suppresses ambient glow animations when prefers-reduced-motion is active', () => {
    const cssPath = path.join(rootDir, 'src/app/globals.css')
    const content = fs.readFileSync(cssPath, 'utf8')

    expect(content).toContain('.animate-ambient-glow-1')
    expect(content).toContain('.animate-ambient-glow-2')
    expect(content).toContain('.animate-ambient-wander')
    expect(content).toContain('.animate-ambient-shine')
    expect(content).toContain('will-change: auto !important;')
  })

  it('Authentication views reduce excessive blur radius and declare motion-reduce:animate-none', () => {
    const loginPath = path.join(rootDir, 'src/app/login/page.tsx')
    const registerPath = path.join(rootDir, 'src/app/register/page.tsx')
    const loginContent = fs.readFileSync(loginPath, 'utf8')
    const registerContent = fs.readFileSync(registerPath, 'utf8')

    expect(loginContent).toContain('blur-[48px] sm:blur-[72px]')
    expect(loginContent).toContain('motion-reduce:animate-none')
    expect(registerContent).toContain('blur-[48px] sm:blur-[72px]')
    expect(registerContent).toContain('motion-reduce:animate-none')
  })
})
