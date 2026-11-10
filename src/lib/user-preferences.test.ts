import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  DEFAULT_PREFERENCES,
  getUserPreferences,
  saveUserPreferences,
  applyTheme,
  PREFERENCES_STORAGE_KEY,
} from './user-preferences'

describe('user-preferences - Theme default & persistence', () => {
  const storageMap = new Map<string, string>()
  const classSet = new Set<string>()

  const originalWindow = globalThis.window
  const originalDocument = globalThis.document
  const originalLocalStorage = globalThis.localStorage

  beforeEach(() => {
    storageMap.clear()
    classSet.clear()

    const mockLocalStorage = {
      getItem: (k: string) => storageMap.get(k) ?? null,
      setItem: (k: string, v: string) => storageMap.set(k, String(v)),
      removeItem: (k: string) => storageMap.delete(k),
      clear: () => storageMap.clear(),
      length: 0,
      key: () => null,
    }

    const mockDocument = {
      documentElement: {
        classList: {
          add: (...classes: string[]) => classes.forEach((c) => classSet.add(c)),
          remove: (...classes: string[]) => classes.forEach((c) => classSet.delete(c)),
          contains: (c: string) => classSet.has(c),
        },
        className: '',
      },
    }

    const mockWindow = {
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      matchMedia: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
      localStorage: mockLocalStorage,
    }

    globalThis.localStorage = mockLocalStorage as unknown as Storage
    globalThis.document = mockDocument as unknown as Document
    globalThis.window = mockWindow as unknown as Window & typeof globalThis
  })

  afterEach(() => {
    globalThis.window = originalWindow
    globalThis.document = originalDocument
    globalThis.localStorage = originalLocalStorage
    vi.restoreAllMocks()
  })

  it('el tema predefinido del sistema es siempre oscuro (dark)', () => {
    expect(DEFAULT_PREFERENCES.theme).toBe('dark')
    const prefs = getUserPreferences()
    expect(prefs.theme).toBe('dark')
  })

  it('applyTheme("dark") agrega la clase "dark" al elemento raíz html', () => {
    classSet.delete('dark')
    applyTheme('dark')
    expect(classSet.has('dark')).toBe(true)
  })

  it('applyTheme("light") remueve la clase "dark" del elemento raíz html', () => {
    classSet.add('dark')
    applyTheme('light')
    expect(classSet.has('dark')).toBe(false)
  })

  it('applyTheme("system") evalúa prefers-color-scheme adecuadamente', () => {
    // Caso 1: Sistema operativo en modo claro
    globalThis.window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    classSet.add('dark')
    applyTheme('system')
    expect(classSet.has('dark')).toBe(false)

    // Caso 2: Sistema operativo en modo oscuro
    globalThis.window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    applyTheme('system')
    expect(classSet.has('dark')).toBe(true)
  })

  it('cuando el usuario define el tema claro, se persiste y se notifica el cambio', () => {
    const updated = saveUserPreferences({ theme: 'light' })

    expect(updated.theme).toBe('light')
    expect(classSet.has('dark')).toBe(false)
    expect(storageMap.has(PREFERENCES_STORAGE_KEY)).toBe(true)
    expect(JSON.parse(storageMap.get(PREFERENCES_STORAGE_KEY)!).theme).toBe('light')
    expect(globalThis.window.dispatchEvent).toHaveBeenCalledTimes(1)
  })

  it('cuando el usuario cierra sesión tras definir tema claro, el tema claro permanece aplicado', () => {
    // 1. Usuario define tema claro durante su sesión activa
    saveUserPreferences({ theme: 'light' })
    expect(classSet.has('dark')).toBe(false)

    // 2. Simulación de cierre de sesión: las preferencias locales persisten intactas
    const storedAfterLogout = getUserPreferences()
    expect(storedAfterLogout.theme).toBe('light')

    // 3. Al reingresar/cargar la vista de login, applyTheme mantiene el tema claro
    applyTheme(storedAfterLogout.theme)
    expect(classSet.has('dark')).toBe(false)
  })

  it('un usuario nuevo sin preferencias almacenadas recibe siempre tema oscuro', () => {
    storageMap.clear()
    const freshPrefs = getUserPreferences()
    expect(freshPrefs.theme).toBe('dark')

    applyTheme(freshPrefs.theme)
    expect(classSet.has('dark')).toBe(true)
  })

  it('layout.tsx define la clase "dark" en el tag html y ejecuta el script inline correspondiente', () => {
    const layoutPath = path.resolve(__dirname, '../app/layout.tsx')
    const layoutContent = fs.readFileSync(layoutPath, 'utf8')

    expect(layoutContent).toContain('antialiased dark`}')
    expect(layoutContent).toContain("isLight")
    expect(layoutContent).toContain("document.documentElement.classList.add('dark')")
    expect(layoutContent).toContain("document.documentElement.classList.remove('dark')")
  })

  it('login/page.tsx cuenta con selector de tema interactivo', () => {
    const loginPath = path.resolve(__dirname, '../app/login/page.tsx')
    const loginContent = fs.readFileSync(loginPath, 'utf8')

    expect(loginContent).toContain('toggleTheme')
    expect(loginContent).toContain('aria-label="Cambiar tema visual"')
  })
})
