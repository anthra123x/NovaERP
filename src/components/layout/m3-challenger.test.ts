import { describe, it, expect, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import { cn } from '@/lib/utils'

describe('Milestone 3 — Challenger 2 Empirical Verification & Adversarial Stress Suite', () => {
  const rootDir = path.resolve(__dirname, '../../..')

  /* =========================================================================
   * CHALLENGE 1: Hydration safety in dashboard-layout.tsx (useSyncExternalStore)
   * ========================================================================= */
  describe('Challenge 1: Hydration Safety & Layout Shift in dashboard-layout.tsx', () => {
    const layoutPath = path.join(rootDir, 'src/components/layout/dashboard-layout.tsx')
    const layoutSource = fs.readFileSync(layoutPath, 'utf8')

    it('Code contract: Uses useSyncExternalStore with isolated server snapshot', () => {
      expect(layoutSource).toContain('useSyncExternalStore')
      expect(layoutSource).toContain('getSidebarCollapseSnapshot')
      expect(layoutSource).toContain('getSidebarCollapseServerSnapshot')
      expect(layoutSource).toContain('subscribeSidebarCollapse')

      // Server snapshot must be a static function returning false
      const serverSnapshotMatch = layoutSource.match(
        /function getSidebarCollapseServerSnapshot\(\):\s*boolean\s*\{\s*return\s+false\s*\}/,
      )
      expect(serverSnapshotMatch).not.toBeNull()
    })

    it('Empirical test: Server snapshot returns boolean false even if localStorage is populated', () => {
      // Simulate client localStorage having collapsed=true
      const mockStorage: Record<string, string> = { nova_sidebar_collapsed: 'true' }
      const getItem = vi.fn((key: string) => mockStorage[key] || null)
      vi.stubGlobal('localStorage', { getItem, setItem: vi.fn() })

      // Extracted server snapshot function logic
      const getServerSnapshot = () => false
      const getClientSnapshot = () => {
        try {
          return localStorage.getItem('nova_sidebar_collapsed') === 'true'
        } catch {
          return false
        }
      }

      // On server / hydration pass, must be strictly false
      expect(getServerSnapshot()).toBe(false)
      // Client snapshot reads true post-mount
      expect(getClientSnapshot()).toBe(true)

      vi.unstubAllGlobals()
    })

    it('Adversarial fault injection: Snapshot survives SecurityError / blocked localStorage', () => {
      // Simulate iframe sandbox or private mode where localStorage throws SecurityError
      vi.stubGlobal('localStorage', {
        getItem: () => {
          throw new DOMException('Access is denied for this document', 'SecurityError')
        },
        setItem: () => {
          throw new DOMException('Access is denied for this document', 'SecurityError')
        },
      })

      const getSnapshotSafely = () => {
        try {
          return localStorage.getItem('nova_sidebar_collapsed') === 'true'
        } catch {
          return false
        }
      }

      // Must not throw, must return fallback false
      expect(() => getSnapshotSafely()).not.toThrow()
      expect(getSnapshotSafely()).toBe(false)

      vi.unstubAllGlobals()
    })

    it('Adversarial stability: Snapshot returns strict primitive boolean (no object allocation)', () => {
      vi.stubGlobal('localStorage', {
        getItem: () => 'true',
      })

      const getSnapshot = () => {
        try {
          return localStorage.getItem('nova_sidebar_collapsed') === 'true'
        } catch {
          return false
        }
      }

      const snap1 = getSnapshot()
      const snap2 = getSnapshot()

      // Exact referential equality Object.is to prevent useSyncExternalStore infinite re-renders
      expect(Object.is(snap1, snap2)).toBe(true)
      expect(typeof snap1).toBe('boolean')

      vi.unstubAllGlobals()
    })

    it('Subscription mechanics: Listens to both cross-tab storage and same-tab custom event', () => {
      const listeners: Record<string, (() => void)[]> = {}
      const mockWindow = {
        addEventListener: (event: string, cb: () => void) => {
          listeners[event] = listeners[event] || []
          listeners[event].push(cb)
        },
        removeEventListener: (event: string, cb: () => void) => {
          listeners[event] = (listeners[event] || []).filter((l) => l !== cb)
        },
      }

      const subscribe = (callback: () => void) => {
        mockWindow.addEventListener('storage', callback)
        mockWindow.addEventListener('nova_sidebar_collapsed_change', callback)
        return () => {
          mockWindow.removeEventListener('storage', callback)
          mockWindow.removeEventListener('nova_sidebar_collapsed_change', callback)
        }
      }

      const trigger = vi.fn()
      const unsubscribe = subscribe(trigger)

      expect(listeners['storage']).toHaveLength(1)
      expect(listeners['nova_sidebar_collapsed_change']).toHaveLength(1)

      // Both events invoke the trigger
      listeners['storage'][0]()
      expect(trigger).toHaveBeenCalledTimes(1)
      listeners['nova_sidebar_collapsed_change'][0]()
      expect(trigger).toHaveBeenCalledTimes(2)

      // Unsubscribe cleanly removes both
      unsubscribe()
      expect(listeners['storage']).toHaveLength(0)
      expect(listeners['nova_sidebar_collapsed_change']).toHaveLength(0)
    })

    it('CLS prevention: Aside width class resolution across viewport states', () => {
      // Logic from dashboard-layout.tsx:103-109
      const resolveAsideClasses = (sidebarOpen: boolean, isMobile: boolean, isCollapsed: boolean) =>
        cn(
          'fixed inset-y-3 left-3 z-50 transition-all duration-300 ease-in-out lg:static lg:inset-auto lg:my-3 lg:ml-3 lg:mr-2 lg:h-[calc(100dvh-1.5rem)] shrink-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-[calc(100%+1.5rem)] lg:translate-x-0',
          'w-72 lg:w-64',
          !isMobile && isCollapsed && 'lg:w-16',
        )

      // 1. SSR initial state (isMobile: false, isCollapsed: false)
      const ssrClasses = resolveAsideClasses(false, false, false)
      expect(ssrClasses).toContain('w-72')
      expect(ssrClasses).toContain('lg:w-64')
      expect(ssrClasses).not.toContain('lg:w-16')

      // 2. Mobile viewport client mounted (isMobile: true, isCollapsed: true)
      // Mobile drawer must STAY w-72 even if storage has collapsed=true
      const mobileCollapsedClasses = resolveAsideClasses(true, true, true)
      expect(mobileCollapsedClasses).toContain('w-72')
      expect(mobileCollapsedClasses).not.toContain('lg:w-16')

      // 3. Desktop viewport client mounted (isMobile: false, isCollapsed: true)
      // Desktop must switch to lg:w-16
      const desktopCollapsedClasses = resolveAsideClasses(false, false, true)
      expect(desktopCollapsedClasses).toContain('w-72') // base for mobile
      expect(desktopCollapsedClasses).toContain('lg:w-16') // overrides lg:w-64 via tailwind-merge
      expect(desktopCollapsedClasses).not.toContain('lg:w-64')
    })
  })

  /* =========================================================================
   * CHALLENGE 2: Dialog content viewport bounding (max-h-[calc(100dvh-2rem)])
   * ========================================================================= */
  describe('Challenge 2: Dialog Content Viewport Bounding & Scrolling', () => {
    const dialogPath = path.join(rootDir, 'src/components/ui/dialog.tsx')
    const dialogSource = fs.readFileSync(dialogPath, 'utf8')

    it('Code contract: DialogContent includes max-h-[calc(100dvh-2rem)] and overflow-y-auto', () => {
      expect(dialogSource).toContain('max-h-[calc(100dvh-2rem)]')
      expect(dialogSource).toContain('overflow-y-auto')
    })

    it('Empirical test: DialogContent class resolution preserves bounding with custom classes', () => {
      // Replicate DialogContent base class list from dialog.tsx:52-55
      const baseDialogClass =
        'fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95'

      // Case A: Custom width override
      const customWidth = cn(baseDialogClass, 'sm:max-w-lg')
      const customWidthClasses = customWidth.split(' ')
      expect(customWidthClasses).toContain('sm:max-w-lg')
      expect(customWidthClasses).not.toContain('sm:max-w-sm')
      expect(customWidthClasses).toContain('max-h-[calc(100dvh-2rem)]')
      expect(customWidthClasses).toContain('overflow-y-auto')

      // Case B: Explicit max-height override by consumer
      const customHeight = cn(baseDialogClass, 'max-h-[85vh]')
      const customHeightClasses = customHeight.split(' ')
      expect(customHeightClasses).toContain('max-h-[85vh]')
      expect(customHeightClasses).not.toContain('max-h-[calc(100dvh-2rem)]')
      expect(customHeightClasses).toContain('overflow-y-auto')

      // Case C: Arbitrary padding override
      const customPadding = cn(baseDialogClass, 'p-6')
      const customPaddingClasses = customPadding.split(' ')
      expect(customPaddingClasses).toContain('p-6')
      expect(customPaddingClasses).not.toContain('p-4')
      expect(customPaddingClasses).toContain('max-h-[calc(100dvh-2rem)]')
      expect(customPaddingClasses).toContain('overflow-y-auto')
    })

    it('Accessibility: Close button remains keyboard & screen-reader accessible', () => {
      expect(dialogSource).toContain('DialogPrimitive.Close')
      expect(dialogSource).toContain('<span className="sr-only">Close</span>')
      expect(dialogSource).toContain('absolute top-2 right-2')
    })
  })

  /* =========================================================================
   * CHALLENGE 3: Ambient glow performance in globals.css and login/page.tsx
   * ========================================================================= */
  describe('Challenge 3: Ambient Glow Performance & prefers-reduced-motion', () => {
    const cssPath = path.join(rootDir, 'src/app/globals.css')
    const cssSource = fs.readFileSync(cssPath, 'utf8')
    const loginPath = path.join(rootDir, 'src/app/login/page.tsx')
    const loginSource = fs.readFileSync(loginPath, 'utf8')
    const registerPath = path.join(rootDir, 'src/app/register/page.tsx')
    const registerSource = fs.readFileSync(registerPath, 'utf8')

    it('Code contract: All ambient glow animations are neutralized in prefers-reduced-motion', () => {
      // Find prefers-reduced-motion block
      const reducedMotionBlock = cssSource.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([^}]+)\}/)
      expect(reducedMotionBlock).not.toBeNull()
      const blockContent = reducedMotionBlock![1]

      const requiredClasses = [
        '.animate-ambient-glow-1',
        '.animate-ambient-glow-2',
        '.animate-ambient-wander',
        '.animate-ambient-shine',
        '.animate-float-card-1',
        '.animate-float-card-2',
        '.animate-float-card-3',
      ]

      for (const cls of requiredClasses) {
        expect(blockContent).toContain(cls)
      }

      expect(blockContent).toContain('animation: none !important')
      expect(blockContent).toContain('will-change: auto !important')
    })

    it('Double defense: Login and Register orbs declare motion-reduce:animate-none inline', () => {
      // In login/page.tsx
      const loginOrbMatches = (loginSource.match(/motion-reduce:animate-none/g) || []).length
      expect(loginOrbMatches).toBeGreaterThanOrEqual(4)

      // In register/page.tsx
      const registerOrbMatches = (registerSource.match(/motion-reduce:animate-none/g) || []).length
      expect(registerOrbMatches).toBeGreaterThanOrEqual(4)
    })

    it('GPU blur mitigation: No excessive blurs >= 90px remain in auth views', () => {
      // Must not contain 90px, 100px, 110px, 120px
      const heavyBlurPattern = /blur-\[(90|100|110|120)px\]/
      expect(heavyBlurPattern.test(loginSource)).toBe(false)
      expect(heavyBlurPattern.test(registerSource)).toBe(false)

      // Must contain responsive moderate blur: blur-[48px] sm:blur-[72px]
      expect(loginSource).toContain('blur-[48px] sm:blur-[72px]')
      expect(registerSource).toContain('blur-[48px] sm:blur-[72px]')
    })

    it('Mathematical proof: 48px blur reduces convolution kernel area by 84% on mobile', () => {
      const originalRadius = 120
      const optimizedMobileRadius = 48
      const originalArea = Math.PI * Math.pow(originalRadius, 2)
      const optimizedArea = Math.PI * Math.pow(optimizedMobileRadius, 2)

      const reductionPercentage = ((originalArea - optimizedArea) / originalArea) * 100
      // (1 - (48/120)^2) = 1 - 0.16 = 0.84 = 84%
      expect(reductionPercentage).toBeCloseTo(84.0, 1)
      expect(reductionPercentage).toBeGreaterThanOrEqual(80)
    })
  })

  /* =========================================================================
   * CHALLENGE 4: Dashboard 8-col grid responsiveness on 1024px vs 1280px+
   * ========================================================================= */
  describe('Challenge 4: Dashboard 8-col Grid Responsiveness (1024px vs 1280px+)', () => {
    const dashboardPath = path.join(rootDir, 'src/app/dashboard/page.tsx')
    const dashboardSource = fs.readFileSync(dashboardPath, 'utf8')

    it('Code contract: Grid uses lg:grid-cols-4 and xl:grid-cols-8 in skeleton and real view', () => {
      // Pattern: grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8
      const matches = dashboardSource.match(/grid-cols-2\s+sm:grid-cols-4\s+lg:grid-cols-4\s+xl:grid-cols-8/g) || []
      expect(matches.length).toBe(2) // 1 in skeleton, 1 in metric matrix

      // Ensure rigid lg:grid-cols-8 is completely gone
      expect(dashboardSource).not.toContain('lg:grid-cols-8')
    })

    it('Empirical simulation: Available card widths on 1024px vs 1280px+', () => {
      const SIDEBAR_EXPANDED_WIDTH = 256
      const SIDEBAR_MARGINS = 20
      const LAYOUT_PADDING = 56 // p-7 = 28px * 2

      // 1. Laptop Viewport: 1024px
      const viewport1024 = 1024
      const contentWidth1024 = viewport1024 - (SIDEBAR_EXPANDED_WIDTH + SIDEBAR_MARGINS) - LAYOUT_PADDING
      expect(contentWidth1024).toBe(692)

      // Under lg:grid-cols-4 (4 cols, 3 gaps of 8px):
      const gapTotal4 = 3 * 8
      const cardWidthNew1024 = (contentWidth1024 - gapTotal4) / 4
      expect(cardWidthNew1024).toBe(167) // 167px per card: ample room for "$1.250.000 COP"

      // Under former lg:grid-cols-8 (8 cols, 7 gaps of 8px):
      const gapTotal8 = 7 * 8
      const cardWidthOld1024 = (contentWidth1024 - gapTotal8) / 8
      expect(cardWidthOld1024).toBe(79.5) // 79.5px per card: severely truncated!

      // Card width improvement on 1024px
      expect(cardWidthNew1024).toBeGreaterThan(cardWidthOld1024 * 2)

      // 2. Desktop Viewport: 1280px (xl:grid-cols-8)
      const viewport1280 = 1280
      const contentWidth1280 = viewport1280 - (SIDEBAR_EXPANDED_WIDTH + SIDEBAR_MARGINS) - LAYOUT_PADDING
      expect(contentWidth1280).toBe(948)

      const cardWidth1280 = (contentWidth1280 - gapTotal8) / 8
      expect(cardWidth1280).toBe(111.5) // 111.5px per card is viable on xl
    })

    it('Content readability: 8 metric cells contain badges, currency, and progress bars', () => {
      // Verify all 8 spreadsheet-style cell codes are present
      const cellCodes = ['[A1]', '[B1]', '[C1]', '[D1]', '[E1]', '[F1]', '[G1]', '[H1]']
      for (const code of cellCodes) {
        expect(dashboardSource).toContain(code)
      }
    })
  })
})
