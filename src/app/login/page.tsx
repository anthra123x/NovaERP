'use client'

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClientSupabase } from '@/lib/supabase'
import { ensureUserExists, requestPasswordReset } from '@/modules/auth/auth.actions'
import {
  LogIn,
  AlertCircle,
  Loader2,
  ArrowRight,
  KeyRound,
  MailCheck,
  Eye,
  EyeOff,
  Lock,
  Mail,
  X,
  Plus,
  Minus,
  Sliders,
  Headphones,
  Calendar,
  Layers,
  ShoppingBag,
  DollarSign,
  Store,
  UtensilsCrossed,
  Wrench,
  Hammer,
  Pill,
  Check,
  Cpu,
  Receipt,
  Users,
} from 'lucide-react'

const NAV_SECTIONS = [
  { id: 'modulos', label: 'Módulos' },
  { id: 'sectores', label: 'Sectores' },
  { id: 'diferenciales', label: 'Diferenciales' },
  { id: 'precios', label: 'Precios' },
  { id: 'faq', label: 'FAQ' },
] as const

type NavSectionId = (typeof NAV_SECTIONS)[number]['id']

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function RevealSection({
  id,
  className = '',
  children,
}: {
  id?: string
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const checkInOrAboveView = () => {
      const rect = el.getBoundingClientRect()
      if (rect.top <= window.innerHeight * 0.95) {
        setVisible(true)
        return true
      }
      return false
    }

    if (checkInOrAboveView()) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.boundingClientRect.top <= window.innerHeight * 0.95) {
            setVisible(true)
            observer.disconnect()
            break
          }
        }
      },
      { threshold: 0.04, rootMargin: '0px 0px -36px 0px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={ref}
      id={id}
      data-visible={visible ? 'true' : 'false'}
      className={`landing-reveal ${className}`}
    >
      {children}
    </section>
  )
}

export default function LoginPage() {
  // Estados de autenticación y modales
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [recover, setRecover] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoveryLoading, setRecoveryLoading] = useState(false)
  const [recoveryMessage, setRecoveryMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Estados interactivos de la Landing Page
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [annualBilling, setAnnualBilling] = useState(true)
  const [activeSector, setActiveSector] = useState<'retail' | 'restaurant' | 'tech' | 'hardware' | 'pharmacy'>('retail')

  // Navegación flotante entre secciones y scroll-spy
  const [navState, setNavState] = useState<{
    active: NavSectionId | null
    clip: { left: number; right: number } | null
  }>({ active: null, clip: null })
  const navRef = useRef<HTMLElement | null>(null)
  const navItemRefs = useRef<Partial<Record<NavSectionId, HTMLAnchorElement | null>>>({})
  const scrollAnimFrameRef = useRef<number | null>(null)
  const scrollTargetLockRef = useRef<{ id: NavSectionId; until: number } | null>(null)

  const measureClipFor = useCallback((sectionId: NavSectionId): { left: number; right: number } | null => {
    if (!navRef.current) return null
    const itemEl = navItemRefs.current[sectionId]
    if (!itemEl) return null
    const navRect = navRef.current.getBoundingClientRect()
    const itemRect = itemEl.getBoundingClientRect()
    if (navRect.width === 0) return null
    return {
      left: Math.max(0, Math.round(itemRect.left - navRect.left)),
      right: Math.max(0, Math.round(navRect.right - itemRect.right)),
    }
  }, [])

  // Comprobar si la URL trae ?login=true o #login para abrir el diálogo automáticamente
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get('login') === 'true' || window.location.hash === '#login') {
          setIsLoginModalOpen(true)
        }
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  // Scroll-spy continuo y observador de redimensionamiento para la barra flotante
  useEffect(() => {
    let rafId = 0

    const updateActiveFromScroll = () => {
      rafId = 0
      const lock = scrollTargetLockRef.current
      if (lock && performance.now() < lock.until) return
      if (lock) scrollTargetLockRef.current = null

      const focusY = window.scrollY + Math.min(260, window.innerHeight * 0.34)
      let current: NavSectionId | null = null

      for (const { id } of NAV_SECTIONS) {
        const sectionEl = document.getElementById(id)
        if (!sectionEl) continue
        const top = sectionEl.getBoundingClientRect().top + window.scrollY
        if (top <= focusY) {
          current = id
        }
      }

      const nextClip = current ? measureClipFor(current) : null
      setNavState((prev) => {
        const resolvedClip = current ? (nextClip ?? prev.clip) : prev.clip
        if (
          prev.active === current &&
          prev.clip?.left === resolvedClip?.left &&
          prev.clip?.right === resolvedClip?.right
        ) {
          return prev
        }
        return { active: current, clip: resolvedClip }
      })
    }

    const onScroll = () => {
      if (rafId) return
      rafId = window.requestAnimationFrame(updateActiveFromScroll)
    }

    rafId = window.requestAnimationFrame(updateActiveFromScroll)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    const navEl = navRef.current
    const resizeObserver =
      navEl && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            onScroll()
          })
        : null
    if (navEl && resizeObserver) resizeObserver.observe(navEl)

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      resizeObserver?.disconnect()
    }
  }, [measureClipFor])

  useEffect(() => {
    return () => {
      if (scrollAnimFrameRef.current) {
        window.cancelAnimationFrame(scrollAnimFrameRef.current)
      }
    }
  }, [])

  const handleSectionNavigate = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, sectionId: NavSectionId) => {
      e.preventDefault()
      const targetEl = document.getElementById(sectionId)
      if (!targetEl) return

      const nextClip = measureClipFor(sectionId)
      setNavState((prev) => ({
        active: sectionId,
        clip: nextClip ?? prev.clip,
      }))

      const headerOffset = 72
      const targetY = Math.max(0, targetEl.getBoundingClientRect().top + window.scrollY - headerOffset)

      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', `#${sectionId}`)
      }

      if (scrollAnimFrameRef.current) {
        window.cancelAnimationFrame(scrollAnimFrameRef.current)
        scrollAnimFrameRef.current = null
      }

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        scrollTargetLockRef.current = null
        window.scrollTo(0, targetY)
        return
      }

      const startY = window.scrollY
      const distance = targetY - startY
      if (Math.abs(distance) < 4) {
        scrollTargetLockRef.current = null
        window.scrollTo(0, targetY)
        return
      }

      const duration = Math.min(680, Math.max(420, Math.abs(distance) * 0.25))
      scrollTargetLockRef.current = { id: sectionId, until: performance.now() + duration + 80 }
      const startTime = performance.now()

      const cleanupListeners = () => {
        window.removeEventListener('wheel', cancelAnimation)
        window.removeEventListener('touchstart', cancelAnimation)
        window.removeEventListener('mousedown', cancelAnimation)
        window.removeEventListener('keydown', onKeyInterrupt)
      }

      const cancelAnimation = () => {
        if (scrollAnimFrameRef.current) {
          window.cancelAnimationFrame(scrollAnimFrameRef.current)
          scrollAnimFrameRef.current = null
        }
        scrollTargetLockRef.current = null
        cleanupListeners()
      }

      const onKeyInterrupt = (ev: KeyboardEvent) => {
        if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(ev.key)) {
          cancelAnimation()
        }
      }

      window.addEventListener('wheel', cancelAnimation, { passive: true, once: true })
      window.addEventListener('touchstart', cancelAnimation, { passive: true, once: true })
      window.addEventListener('mousedown', cancelAnimation, { passive: true, once: true })
      window.addEventListener('keydown', onKeyInterrupt, { passive: true })

      const step = (now: number) => {
        const elapsed = now - startTime
        const progress = Math.min(1, elapsed / duration)
        const eased = easeInOutCubic(progress)
        window.scrollTo(0, startY + distance * eased)

        if (progress < 1) {
          scrollAnimFrameRef.current = window.requestAnimationFrame(step)
        } else {
          scrollAnimFrameRef.current = null
          scrollTargetLockRef.current = null
          cleanupListeners()
        }
      }

      scrollAnimFrameRef.current = window.requestAnimationFrame(step)
    },
    [measureClipFor],
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      const supabase = createClientSupabase()
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Correo o contraseña incorrectos.')
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('El correo no ha sido confirmado. Revisa tu bandeja de entrada.')
        } else {
          setError(signInError.message || 'Error al iniciar sesión.')
        }
        setIsLoading(false)
        return
      }

      if (data?.user) {
        const userName = data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Usuario'
        await ensureUserExists(data.user.email || email, userName)
        window.location.href = '/dashboard'
      }
    } catch {
      setError('Ocurrió un error inesperado al conectar con el servidor.')
      setIsLoading(false)
    }
  }

  async function handlePasswordReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setRecoveryLoading(true)
    setRecoveryMessage('')
    setError('')

    const result = await requestPasswordReset(recoveryEmail)
    setRecoveryLoading(false)

    if (result?.error) {
      setError(result.error)
      return
    }

    setRecoveryMessage(
      result?.success || 'Si el correo está registrado, recibirás un enlace seguro para restablecer tu contraseña.',
    )
  }

  // Datos interactivos por sector comercial
  const sectorData = {
    retail: {
      name: 'Retail & Mostrador',
      title: 'Comercio General, Calzado & Tiendas Físicas',
      desc: 'Cobro veloz con código de barras, sincronización de stock multi-bodega y tickets térmicos automáticos.',
      stat1: '$18.450.000',
      stat1Label: 'Ventas Hoy (COP)',
      stat2: '1.420 SKU',
      stat2Label: 'Stock Activo',
      stat3: '38.5%',
      stat3Label: 'Margen Bruto',
      workflow: ['Escaneo de barras', 'Cálculo de cambio y datáfono', 'Factura DIAN + QR'],
    },
    restaurant: {
      name: 'Restaurantes & Bares',
      title: 'Gastronomía, Cafeterías & Comandas',
      desc: 'Gestión de mesas en vivo, comanda directa a cocina, división de cuentas y control de insumos por receta.',
      stat1: '$8.920.000',
      stat1Label: 'Comandas Hoy (COP)',
      stat2: '16 / 18',
      stat2Label: 'Mesas Activas',
      stat3: '34 min',
      stat3Label: 'Rotación Media',
      workflow: ['Asignación de mesa', 'Comanda a cocina', 'Cuenta dividida y cierre'],
    },
    tech: {
      name: 'Servicio Técnico & Taller',
      title: 'Reparaciones, Telefonía & Repuestos',
      desc: 'Seguimiento de órdenes por IMEI o serial, mano de obra por técnico, repuestos descontados de bodega y garantía.',
      stat1: '$12.300.000',
      stat1Label: 'Facturación Taller',
      stat2: '24 órdenes',
      stat2Label: 'En Diagnóstico',
      stat3: '99.4%',
      stat3Label: 'Entregas a Tiempo',
      workflow: ['Ingreso por IMEI/Serial', 'Reserva de repuestos', 'Entrega y garantía'],
    },
    hardware: {
      name: 'Ferreterías & Materiales',
      title: 'Ferreterías, Eléctricos & Construcción',
      desc: 'Manejo de bultos, fracciones, metros y despachos a crédito para contratistas con control riguroso de cartera.',
      stat1: '$24.600.000',
      stat1Label: 'Despachos Volumen',
      stat2: '$9.450.000',
      stat2Label: 'Cartera Activa',
      stat3: '100%',
      stat3Label: 'Bodega Auditada',
      workflow: ['Cotización por volumen', 'Despacho multi-bodega', 'Abono o factura crédito'],
    },
    pharmacy: {
      name: 'Droguerías & Farmacias',
      title: 'Medicamentos, Salud & Cuidado Personal',
      desc: 'Control estricto de fechas de vencimiento, números de lote, dispensación ágil y facturación electrónica instantánea.',
      stat1: '$14.150.000',
      stat1Label: 'Dispensación Diaria',
      stat2: '0 alertas',
      stat2Label: 'Lotes Vencidos',
      stat3: '$42.500',
      stat3Label: 'Ticket Promedio',
      workflow: ['Validación de lote', 'Control de vencimiento', 'Factura electrónica'],
    },
  }

  const currentSector = sectorData[activeSector]

  return (
    <div className="relative min-h-dvh w-full bg-[#07080a] text-zinc-100 font-sans overflow-x-hidden selection:bg-[#a3e635] selection:text-black">
      {/* ======================================================== */}
      {/* CAPA DE AMBIENTE: FONDOS OBSIDIAN Y GRADIENTES VERDES    */}
      {/* Cumple con las especificaciones de rendimiento y tests M3 */}
      {/* ======================================================== */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />
      <div className="absolute -top-32 -left-24 w-[560px] h-[560px] rounded-full blur-[48px] sm:blur-[72px] pointer-events-none animate-ambient-glow-1 motion-reduce:animate-none bg-gradient-to-tr from-[#a3e635]/20 via-[#84cc16]/12 to-transparent" />
      <div className="absolute top-[28%] -right-24 w-[620px] h-[620px] rounded-full blur-[48px] sm:blur-[72px] pointer-events-none animate-ambient-glow-2 motion-reduce:animate-none bg-gradient-to-bl from-[#a3e635]/18 via-emerald-500/10 to-transparent" />
      <div className="absolute top-[60%] -left-20 w-[480px] h-[480px] rounded-full blur-[48px] sm:blur-[72px] pointer-events-none animate-ambient-wander motion-reduce:animate-none bg-gradient-to-r from-[#a3e635]/12 via-teal-500/8 to-transparent" />
      <div className="absolute bottom-16 right-1/4 w-[400px] h-[400px] rounded-full blur-[48px] sm:blur-[72px] pointer-events-none animate-ambient-shine motion-reduce:animate-none bg-[#a3e635]/12" />

      {/* ======================================================== */}
      {/* 1. NAVEGACIÓN SUPERIOR: TOTALMENTE TRANSPARENTE Y FLOTANTE */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-40 w-full bg-transparent border-none pt-5 sm:pt-7 pointer-events-none">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-12 flex items-center justify-between">
          {/* Brand flotante minimalista */}
          <Link href="/" className="pointer-events-auto flex items-center gap-1.5 group cursor-pointer py-1">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-white font-sans drop-shadow-md">
              nova erp<span className="text-[#a3e635]">.</span>
            </span>
          </Link>

          {/* Menú de navegación en texto flotante libre, sin contenedor */}
          <nav
            ref={navRef}
            aria-label="Secciones principales"
            className="pointer-events-auto relative hidden md:flex items-center gap-8 py-1.5 text-sm font-medium"
          >
            {NAV_SECTIONS.map((item) => {
              const isActive = navState.active === item.id
              return (
                <a
                  key={item.id}
                  ref={(el) => {
                    navItemRefs.current[item.id] = el
                  }}
                  href={`#${item.id}`}
                  onClick={(e) => handleSectionNavigate(e, item.id)}
                  aria-current={isActive ? 'location' : undefined}
                  className={`nav-floating-link relative py-1 drop-shadow-[0_2px_12px_rgba(7,8,10,0.95)] cursor-pointer select-none ${
                    isActive ? 'text-[#a3e635]' : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  {item.label}
                </a>
              )
            })}

            {/* Indicador deslizable inferior sin caja contenedora */}
            <span
              aria-hidden="true"
              className="nav-floating-indicator pointer-events-none absolute -bottom-1 left-0 right-0 h-3 flex items-center"
              style={{
                opacity: navState.active && navState.clip ? 1 : 0,
                clipPath: navState.clip
                  ? `inset(0 ${navState.clip.right}px 0 ${navState.clip.left}px)`
                  : 'inset(0 100% 0 0)',
              }}
            >
              <span className="w-full h-[2px] bg-gradient-to-r from-[#a3e635] via-[#d9f99d] to-[#a3e635] shadow-[0_0_10px_rgba(163,230,53,0.85)]" />
            </span>
          </nav>

          {/* Acciones de la derecha en cápsulas flotantes */}
          <div className="pointer-events-auto flex items-center gap-3 sm:gap-4">
            <Link
              href="/register"
              className="h-11 px-6 rounded-full bg-[#a3e635] text-black text-sm font-semibold hover:bg-[#bef264] transition-[background-color,box-shadow,transform] duration-150 active:scale-[0.97] shadow-[0_0_24px_rgba(163,230,53,0.35)] flex items-center justify-center cursor-pointer"
            >
              Probar Gratis
            </Link>

            <button
              type="button"
              onClick={() => {
                setRecover(false)
                setError('')
                setIsLoginModalOpen(true)
              }}
              className="h-11 px-5 rounded-full bg-[#0c0e12]/80 backdrop-blur-xl border border-white/10 text-sm font-medium text-zinc-300 hover:text-white hover:border-zinc-700 transition-[color,border-color,transform] duration-150 active:scale-[0.97] flex items-center gap-2 shadow-md cursor-pointer"
            >
              <LogIn className="h-4 w-4 text-zinc-400" />
              <span>Iniciar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. HERO SECTION: 2 COLUMNAS AMPLIO                       */}
      {/* ======================================================== */}
      <section className="relative pt-10 sm:pt-16 pb-16 sm:pb-24">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-14 items-center">
            {/* Columna Izquierda: Copywriting Editorial */}
            <div className="lg:col-span-6 space-y-7 text-left">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.08] drop-shadow-sm">
                Solución Versátil Para Tu Operación Diaria
              </h1>

              <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl leading-relaxed">
                Controla ventas POS, inventarios multialmacén y facturación electrónica DIAN con analítica en tiempo real sin fricción técnica.
              </p>

              <div className="pt-3 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <Link
                  href="/register"
                  className="h-14 px-9 rounded-full bg-[#a3e635] text-black text-base font-semibold hover:bg-[#bef264] transition-all flex items-center gap-3 shadow-[0_0_30px_rgba(163,230,53,0.35)] cursor-pointer"
                >
                  <ShoppingBag className="h-5 w-5 text-black" />
                  <span>Comenzar Ahora</span>
                </Link>

                <div className="hidden sm:block h-9 w-px bg-zinc-800" />

                <div className="text-left space-y-0.5">
                  <p className="text-sm font-semibold text-white">100% en la Nube</p>
                  <p className="text-xs text-zinc-400">Facturación DIAN Inmediata</p>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Escaparate de Tarjetas Flotantes en Capas */}
            <div className="lg:col-span-6 relative w-full max-w-xl mx-auto lg:max-w-none">
              <div className="relative min-h-[520px] sm:min-h-[580px] flex items-center justify-center">
                {/* 1. Tarjeta Oscura Superior Izquierda Flotante */}
                <div className="absolute top-2 left-0 sm:left-2 w-[300px] sm:w-[350px] rounded-3xl bg-[#0c0e12]/90 backdrop-blur-2xl text-white p-6 shadow-[0_30px_70px_rgba(0,0,0,0.9)] border border-white/10 z-20 -rotate-2 hover:rotate-0 transition-transform duration-300">
                  <div className="flex items-center justify-between text-xs text-zinc-400 pb-3">
                    <span className="font-mono text-xs uppercase tracking-wider text-zinc-500">Balance Operativo</span>
                    <div className="flex items-center gap-1 font-mono text-[11px] text-zinc-500">
                      <span>••••</span>
                      <span>4289</span>
                    </div>
                  </div>

                  <div className="py-3">
                    <span className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-white">
                      $984,556.34
                    </span>
                    <span className="text-xs font-mono text-zinc-400 block mt-1">COP en Caja & Bancos</span>
                  </div>

                  <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="text-zinc-500 block text-[10px]">VENCE</span>
                      <span className="text-zinc-200 font-semibold">12/28</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px]">TITULAR</span>
                      <span className="text-zinc-200 font-semibold">NOVA ERP POS</span>
                    </div>
                    <div className="flex -space-x-2">
                      <div className="w-6 h-6 rounded-full bg-[#a3e635] opacity-90 shadow-[0_0_8px_#a3e635]" />
                      <div className="w-6 h-6 rounded-full bg-emerald-500 opacity-80" />
                    </div>
                  </div>
                </div>

                {/* 2. Tarjeta Superior Derecha Flotante */}
                <div className="absolute top-0 right-0 sm:right-2 w-[240px] sm:w-[280px] rounded-3xl bg-[#0f1117]/90 backdrop-blur-2xl text-white p-5 shadow-[0_25px_60px_rgba(0,0,0,0.85)] border border-white/10 z-10 translate-x-2 sm:translate-x-0 -translate-y-2 hover:translate-y-0 transition-transform duration-300">
                  <div className="flex items-center justify-between pb-2">
                    <div>
                      <span className="text-sm font-bold text-white block">Ventas Semanales</span>
                      <span className="text-xs font-mono text-[#a3e635] font-semibold">+24.5% crecimiento</span>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-[#a3e635]/20 flex items-center justify-center text-[#a3e635]">
                      <ShoppingBag className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="h-16 w-full pt-2">
                    <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible">
                      <path
                        d="M0 32 Q 25 35, 40 22 T 75 14 T 100 6"
                        fill="none"
                        stroke="#a3e635"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M0 32 Q 25 35, 40 22 T 75 14 T 100 6 L 100 40 L 0 40 Z"
                        fill="url(#limeGradientDark)"
                        opacity="0.3"
                      />
                      <defs>
                        <linearGradient id="limeGradientDark" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a3e635" />
                          <stop offset="100%" stopColor="#a3e635" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <circle cx="100" cy="6" r="3.5" fill="#a3e635" className="filter drop-shadow-[0_0_6px_#a3e635]" />
                    </svg>
                  </div>
                </div>

                {/* 3. Badge Circular Flotante */}
                <div className="absolute top-[38%] left-[45%] -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[#a3e635] shadow-[0_0_24px_rgba(163,230,53,0.5)] flex items-center justify-center text-black font-bold z-30 ring-4 ring-[#07080a]">
                  <DollarSign className="h-6 w-6 text-black" />
                </div>

                {/* 4. Tarjeta Inferior Ancha Flotante */}
                <div className="absolute bottom-2 inset-x-0 sm:inset-x-4 rounded-3xl bg-[#0c0e12]/90 backdrop-blur-2xl text-white p-6 shadow-[0_30px_70px_rgba(0,0,0,0.95)] border border-white/10 z-20">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                    <div className="sm:col-span-5 flex items-center gap-4">
                      <div className="relative w-20 h-20 shrink-0">
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                          <circle cx="18" cy="18" r="14" fill="none" stroke="#1f222a" strokeWidth="4.5" />
                          <circle
                            cx="18"
                            cy="18"
                            r="14"
                            fill="none"
                            stroke="#a3e635"
                            strokeWidth="4.5"
                            strokeDasharray="48 100"
                            strokeDashoffset="0"
                          />
                          <circle
                            cx="18"
                            cy="18"
                            r="14"
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="4.5"
                            strokeDasharray="26 100"
                            strokeDashoffset="-48"
                          />
                          <circle
                            cx="18"
                            cy="18"
                            r="14"
                            fill="none"
                            stroke="#52525b"
                            strokeWidth="4.5"
                            strokeDasharray="14 100"
                            strokeDashoffset="-74"
                          />
                        </svg>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <span className="font-bold text-white block text-sm">Canales de Venta</span>
                        <div className="flex items-center gap-1.5 text-zinc-300">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#a3e635]" />
                          <span>POS (55%)</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-300">
                          <span className="w-2.5 h-2.5 rounded-full bg-white" />
                          <span>Web (30%)</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
                          <span>B2B (15%)</span>
                        </div>
                      </div>
                    </div>

                    <div className="hidden sm:block sm:col-span-1 h-14 w-px bg-zinc-800 mx-auto" />

                    <div className="sm:col-span-6 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white text-sm">Actividad Semanal</span>
                        <span className="text-xs font-mono text-zinc-400">Lun - Dom</span>
                      </div>

                      <div className="h-16 flex items-end justify-between gap-2 pt-2">
                        {[
                          { day: 'L', h: '45%', peak: false },
                          { day: 'M', h: '70%', peak: false },
                          { day: 'M', h: '55%', peak: false },
                          { day: 'J', h: '85%', peak: true },
                          { day: 'V', h: '60%', peak: false },
                          { day: 'S', h: '95%', peak: true },
                          { day: 'D', h: '40%', peak: false },
                        ].map((bar, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div
                              style={{ height: bar.h }}
                              className={`w-full rounded-sm transition-all ${
                                bar.peak
                                  ? 'bg-[#a3e635] shadow-[0_0_10px_rgba(163,230,53,0.4)]'
                                  : 'bg-zinc-800 hover:bg-zinc-700'
                              }`}
                            />
                            <span className="text-[10px] font-mono text-zinc-400">{bar.day}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2B. PORTABILIDAD MULTIDISPOSITIVO (MACBOOK + MÓVIL)      */}
      {/* ======================================================== */}
      <RevealSection className="py-16 sm:py-24 relative">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-12 items-center">
            {/* Columna Izquierda: Propuesta Editorial Limpia sin CTAs Redundantes */}
            <div className="landing-reveal-child landing-reveal-stagger-1 lg:col-span-5 space-y-6 text-left">
              <h2 className="text-4xl sm:text-5xl lg:text-[54px] font-bold tracking-tight text-white leading-[1.08]">
                Opera Sin Ataduras.
                <br />
                En Toda Pantalla.
                <br />
                <span className="text-[#a3e635]">Siempre Portátil.</span>
              </h2>

              <p className="text-base sm:text-lg text-zinc-400 max-w-lg leading-relaxed">
                Lleva tu punto de venta, inventarios y facturación electrónica DIAN contigo. Accede desde portátil, tablet o celular con sincronización en vivo en la nube sin instalar programas.
              </p>
            </div>

            {/* Columna Derecha: Chasis MacBook Pro + Smartphone Pro Superpuesto */}
            <div className="landing-reveal-child landing-reveal-stagger-2 lg:col-span-7 relative">
              <div className="relative sm:pr-12 sm:pb-6">
                {/* Halo ambiental sutil detrás de los equipos */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_60%_55%,rgba(163,230,53,0.13),transparent_68%)]"
                />

                {/* Dispositivo 1: Laptop Estilo MacBook Pro */}
                <div className="relative z-10 w-full sm:w-[90%]">
                  {/* Carcasa de pantalla con bisel delgado y radios fijos en px */}
                  <div className="rounded-t-[16px] bg-gradient-to-b from-[#232834] to-[#12151c] p-[5px] sm:p-[7px] ring-1 ring-white/20 shadow-[0_30px_80px_rgba(0,0,0,0.95)]">
                    <div className="relative rounded-[10px] bg-[#090b10] border border-white/10 overflow-hidden">
                      {/* Muesca superior de cámara MacBook */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-2.5 bg-[#12151c] rounded-b-[6px] border-x border-b border-white/10 flex items-center justify-center z-20">
                        <span className="w-1 h-1 rounded-full bg-zinc-600" />
                      </div>

                      {/* Reflejo sutil diagonal de cristal */}
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.015] to-white/[0.045] pointer-events-none z-10"
                      />

                      {/* Interfaz Nova ERP Desktop */}
                      <div className="grid grid-cols-12 min-h-[260px] sm:min-h-[320px]">
                        {/* Sidebar de escritorio */}
                        <div className="hidden sm:flex sm:col-span-3 bg-[#0d1017] border-r border-white/[0.07] p-3.5 pt-5 flex-col justify-between">
                          <div className="space-y-4">
                            <span className="text-[13px] font-black tracking-tight text-white block">
                              nova erp<span className="text-[#a3e635]">.</span>
                            </span>
                            <div className="space-y-1 text-[10px] font-medium">
                              <div className="px-2.5 py-1.5 rounded-[6px] bg-[#a3e635]/15 text-[#a3e635] font-semibold border border-[#a3e635]/20">
                                Panel General
                              </div>
                              <div className="px-2.5 py-1 text-zinc-400">POS Mostrador</div>
                              <div className="px-2.5 py-1 text-zinc-500">Inventario</div>
                              <div className="px-2.5 py-1 text-zinc-500">Pedidos Web</div>
                              <div className="px-2.5 py-1 text-zinc-500">Facturación DIAN</div>
                              <div className="px-2.5 py-1 text-zinc-500">Clientes</div>
                            </div>
                          </div>
                          <div className="px-2.5 py-1.5 rounded-[6px] bg-[#131720] border border-white/[0.08] text-[9px] font-mono text-zinc-400 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#a3e635]" />
                            <span>Sede Centro</span>
                          </div>
                        </div>

                        {/* Contenido principal de escritorio */}
                        <div className="col-span-12 sm:col-span-9 p-4 sm:p-5 pt-5 space-y-3.5">
                          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/[0.07]">
                            <div>
                              <span className="text-xs font-semibold text-white block">Resumen Operativo</span>
                              <span className="text-[9px] font-mono text-zinc-500">Actualización automática en nube</span>
                            </div>
                            <span className="px-2.5 py-1 rounded-[6px] bg-[#a3e635]/10 border border-[#a3e635]/25 text-[#a3e635] font-mono text-[9px] font-semibold">
                              Nube Activa
                            </span>
                          </div>

                          {/* 3 KPIs con bordes limpios en px */}
                          <div className="grid grid-cols-3 gap-2.5">
                            <div className="rounded-[8px] bg-[#11141d] border border-white/[0.08] p-2.5 sm:p-3 space-y-1">
                              <span className="text-[9px] text-zinc-400 block">Ventas Hoy</span>
                              <span className="text-sm sm:text-base font-bold font-mono text-white block">$4.85M</span>
                              <span className="text-[9px] font-mono text-[#a3e635]">+18.4%</span>
                            </div>
                            <div className="rounded-[8px] bg-[#11141d] border border-white/[0.08] p-2.5 sm:p-3 space-y-1">
                              <span className="text-[9px] text-zinc-400 block">Facturas DIAN</span>
                              <span className="text-sm sm:text-base font-bold font-mono text-white block">148</span>
                              <span className="text-[9px] font-mono text-emerald-400">Timbradas</span>
                            </div>
                            <div className="rounded-[8px] bg-[#11141d] border border-white/[0.08] p-2.5 sm:p-3 space-y-1">
                              <span className="text-[9px] text-zinc-400 block">Margen Neto</span>
                              <span className="text-sm sm:text-base font-bold font-mono text-[#a3e635] block">38.4%</span>
                              <span className="text-[9px] font-mono text-zinc-400">Saludable</span>
                            </div>
                          </div>

                          {/* Gráfica SVG + Flujo de Actividad dejando margen limpio derecho */}
                          <div className="rounded-[8px] bg-[#11141d] border border-white/[0.08] p-3 sm:p-3.5 sm:pr-24 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-semibold text-zinc-200">Flujo Semanal Consolidado</span>
                              <span className="text-[9px] font-mono text-[#a3e635]">+24.8%</span>
                            </div>

                            <div className="h-14 w-full">
                              <svg viewBox="0 0 240 50" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                                <defs>
                                  <linearGradient id="laptopChartGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#a3e635" stopOpacity="0.35" />
                                    <stop offset="100%" stopColor="#a3e635" stopOpacity="0" />
                                  </linearGradient>
                                </defs>
                                <path
                                  d="M0 40 C 30 38, 45 24, 80 28 C 115 32, 130 14, 165 18 C 195 21, 215 8, 240 6 L 240 50 L 0 50 Z"
                                  fill="url(#laptopChartGrad)"
                                />
                                <path
                                  d="M0 40 C 30 38, 45 24, 80 28 C 115 32, 130 14, 165 18 C 195 21, 215 8, 240 6"
                                  fill="none"
                                  stroke="#a3e635"
                                  strokeWidth="2.2"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/[0.06] text-[9px]">
                              <div className="flex items-center justify-between text-zinc-400">
                                <span>POS Mostrador</span>
                                <span className="font-mono text-zinc-200">$3.20M</span>
                              </div>
                              <div className="flex items-center justify-between text-zinc-400">
                                <span>Catálogo Web</span>
                                <span className="font-mono text-[#a3e635]">$1.65M</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Base metálica anodizada inferior de la MacBook */}
                  <div className="relative mx-auto w-[108%] -ml-[4%] h-3.5 sm:h-4 rounded-b-[12px] rounded-t-[2px] bg-gradient-to-b from-[#3b414f] via-[#252a34] to-[#12151b] border-t border-white/25 shadow-[0_18px_36px_rgba(0,0,0,0.9)] flex justify-center">
                    <div className="w-16 sm:w-24 h-1.5 rounded-b-[5px] bg-[#161920] border-x border-b border-white/10" />
                  </div>
                  <div className="mx-auto w-[94%] h-3 bg-black/70 blur-md rounded-full -mt-1 pointer-events-none" />
                </div>

                {/* Dispositivo 2: Smartphone Estilizado en Primer Plano */}
                <div className="relative sm:absolute ml-auto -mt-14 mr-2 sm:mt-0 sm:mr-0 sm:bottom-0 sm:right-0 w-[164px] sm:w-[178px] lg:w-[190px] z-20">
                  {/* Botones laterales hardware */}
                  <span aria-hidden="true" className="absolute -left-[2px] top-16 w-[2px] h-5 rounded-l bg-zinc-500/70" />
                  <span aria-hidden="true" className="absolute -left-[2px] top-24 w-[2px] h-7 rounded-l bg-zinc-500/70" />
                  <span aria-hidden="true" className="absolute -right-[2px] top-20 w-[2px] h-9 rounded-r bg-zinc-500/70" />

                  {/* Chasis exterior titanio/grafito */}
                  <div className="rounded-[30px] bg-gradient-to-b from-[#323846] via-[#1c202a] to-[#101218] p-[5px] ring-1 ring-white/25 shadow-[0_28px_70px_rgba(0,0,0,0.98),-14px_12px_40px_rgba(0,0,0,0.85)]">
                    <div className="rounded-[25px] bg-[#080a0e] border border-white/10 px-3 pt-2 pb-2 space-y-2.5 overflow-hidden">
                      {/* Barra de estado + Dynamic Island */}
                      <div className="flex items-center justify-between text-[8px] font-mono text-zinc-300 px-0.5">
                        <span>9:41</span>
                        <div className="w-12 h-3 rounded-full bg-black border border-white/10 flex items-center justify-end pr-1">
                          <span className="w-1 h-1 rounded-full bg-zinc-700" />
                        </div>
                        <span className="inline-flex items-center gap-0.5 text-[#a3e635]">5G</span>
                      </div>

                      {/* Header App Móvil */}
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-[11px] font-black tracking-tight text-white">
                          nova erp<span className="text-[#a3e635]">.</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-[8px] font-mono text-[#a3e635]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#a3e635] animate-pulse" />
                          En Vivo
                        </span>
                      </div>

                      {/* Tarjeta destacada móvil en lima */}
                      <div className="rounded-[10px] bg-[#a3e635] text-black p-2.5 space-y-1 shadow-[0_6px_18px_rgba(163,230,53,0.25)]">
                        <span className="text-[8px] font-mono uppercase tracking-wider text-black/70 font-semibold block">
                          Caja Móvil Hoy
                        </span>
                        <span className="text-lg font-extrabold font-mono tracking-tight block leading-none">
                          $3.48M
                        </span>
                        <span className="text-[9px] font-mono font-semibold text-black/80 block">
                          +24.5% vs ayer
                        </span>
                      </div>

                      {/* Gráfica vertical estilizada */}
                      <div className="rounded-[8px] bg-[#11141d] border border-white/[0.08] p-2.5 space-y-2">
                        <div className="flex items-center justify-between text-[8px]">
                          <span className="text-zinc-300 font-semibold">Ventas por Hora</span>
                          <span className="text-[#a3e635] font-mono">POS</span>
                        </div>
                        <div className="h-11 flex items-end justify-between gap-1.5">
                          {[
                            { h: '40%', peak: false },
                            { h: '62%', peak: false },
                            { h: '52%', peak: false },
                            { h: '78%', peak: true },
                            { h: '65%', peak: false },
                            { h: '95%', peak: true },
                          ].map((b, i) => (
                            <div key={i} className="flex-1 h-full flex items-end">
                              <div
                                style={{ height: b.h }}
                                className={`w-full rounded-t-[3px] ${
                                  b.peak ? 'bg-[#a3e635]' : 'bg-zinc-700/80'
                                }`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Movimientos recientes compactos */}
                      <div className="space-y-1.5 pt-0.5">
                        {[
                          { label: 'POS Caja #1', val: '+$185K' },
                          { label: 'Pedido Web', val: '+$420K' },
                        ].map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between px-2 py-1.5 rounded-[6px] bg-[#11141d] border border-white/[0.06] text-[9px]"
                          >
                            <span className="text-zinc-300 truncate">{item.label}</span>
                            <span className="font-mono font-bold text-[#a3e635]">{item.val}</span>
                          </div>
                        ))}
                      </div>

                      {/* Barra Home inferior */}
                      <div className="pt-0.5 flex justify-center">
                        <span className="w-12 h-[3px] rounded-full bg-zinc-600/80" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </RevealSection>

      {/* ======================================================== */}
      {/* 3. CINTA EDITORIAL DE ESCALA OPERATIVA                   */}
      {/* ======================================================== */}
      <RevealSection className="py-8 sm:py-12 relative">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-12">
          <div className="border-y border-white/[0.07] py-9 sm:py-11 grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            <div className="space-y-1.5 text-left">
              <span className="text-3xl sm:text-4xl font-bold font-mono text-white tracking-tight block">+1.2M</span>
              <span className="text-xs sm:text-sm text-zinc-400 block">Transacciones procesadas</span>
            </div>
            <div className="space-y-1.5 text-left">
              <span className="text-3xl sm:text-4xl font-bold font-mono text-[#a3e635] tracking-tight block">99.98%</span>
              <span className="text-xs sm:text-sm text-zinc-400 block">Disponibilidad garantizada</span>
            </div>
            <div className="space-y-1.5 text-left">
              <span className="text-3xl sm:text-4xl font-bold font-mono text-white tracking-tight block">&lt; 2s</span>
              <span className="text-xs sm:text-sm text-zinc-400 block">Timbrado electrónico DIAN</span>
            </div>
            <div className="space-y-1.5 text-left">
              <span className="text-3xl sm:text-4xl font-bold font-mono text-white tracking-tight block">1.400+</span>
              <span className="text-xs sm:text-sm text-zinc-400 block">Puntos de venta conectados</span>
            </div>
          </div>
        </div>
      </RevealSection>

      {/* ======================================================== */}
      {/* 4. MÓDULOS CORE: BENTO ASIMÉTRICO CON INTERFAZ REAL      */}
      {/* ======================================================== */}
      <RevealSection id="modulos" className="py-20 sm:py-28 relative">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-12 space-y-12">
          <div className="max-w-2xl space-y-3 text-left">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.08]">
              Cada Área de Tu Negocio.
              <br />
              <span className="text-zinc-400">Conectada Sin Fricciones.</span>
            </h2>
            <p className="text-base text-zinc-400 max-w-xl leading-relaxed">
              Módulos diseñados para responder en mostrador, bodega y contabilidad desde la misma fuente de datos.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Celda 1 (7 cols): POS Mostrador con Ticket Real */}
            <div className="landing-reveal-child landing-reveal-stagger-1 landing-card-hover lg:col-span-7 rounded-[20px] bg-[#0c0e12]/90 border border-white/10 p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.65)] hover:border-[#a3e635]/35 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-6 space-y-3.5 text-left">
                <div className="inline-flex items-center gap-2 text-xs font-mono text-[#a3e635]">
                  <ShoppingBag className="h-4 w-4" />
                  <span>Punto de Venta POS</span>
                </div>
                <h3 className="text-2xl font-bold text-white tracking-tight">Cobro en Menos de 10 Segundos</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Atajos de teclado F8/F10, lector de código de barras, cálculo de cambio y pagos mixtos entre efectivo, Nequi y datáfono.
                </p>
              </div>

              {/* Mini Preview de Ticket POS */}
              <div className="md:col-span-6 rounded-[12px] bg-[#07080a] border border-white/10 p-4 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-[11px] text-zinc-400 pb-2 border-b border-white/[0.07]">
                  <span>CAJA #01 · POS-0842</span>
                  <span className="text-[#a3e635]">F10</span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-zinc-200">
                    <span>2x Café Origen 500g</span>
                    <span>$56.000</span>
                  </div>
                  <div className="flex justify-between text-zinc-200">
                    <span>1x Filtro Cerámica V60</span>
                    <span>$28.000</span>
                  </div>
                </div>
                <div className="pt-2.5 border-t border-white/[0.07] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-500 block">TOTAL A PAGAR</span>
                    <span className="text-base font-bold text-white">$84.000 COP</span>
                  </div>
                  <span className="px-3 py-1.5 rounded-[8px] bg-[#a3e635] text-black text-[11px] font-bold">
                    Cobrar
                  </span>
                </div>
              </div>
            </div>

            {/* Celda 2 (5 cols): Facturación DIAN con Validación CUFE */}
            <div className="landing-reveal-child landing-reveal-stagger-2 landing-card-hover lg:col-span-5 rounded-[20px] bg-[#0c0e12]/90 border border-white/10 p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.65)] hover:border-emerald-400/35 flex flex-col justify-between space-y-6">
              <div className="space-y-3 text-left">
                <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400">
                  <Receipt className="h-4 w-4" />
                  <span>Facturación Electrónica DIAN</span>
                </div>
                <h3 className="text-2xl font-bold text-white tracking-tight">XML Firmado y CUFE al Instante</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Emisión directa con código QR válido ante la DIAN, notas crédito y envío automático sin costos ocultos por documento.
                </p>
              </div>

              <div className="rounded-[12px] bg-[#07080a] border border-emerald-500/20 px-4 py-3 flex items-center justify-between gap-3 font-mono text-[11px]">
                <div className="truncate">
                  <span className="text-zinc-500 block text-[10px]">CUFE VALIDADO</span>
                  <span className="text-zinc-200 truncate block">8f31c0a4e9...9a4d7b</span>
                </div>
                <span className="shrink-0 px-2.5 py-1 rounded-[6px] bg-[#a3e635]/15 text-[#a3e635] font-semibold text-[10px]">
                  1.3s OK
                </span>
              </div>
            </div>

            {/* Celda 3 (4 cols): Inventario Multi-Bodega & Reserva Atómica */}
            <div className="landing-reveal-child landing-reveal-stagger-3 landing-card-hover lg:col-span-4 rounded-[20px] bg-[#0c0e12]/90 border border-white/10 p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.65)] hover:border-[#a3e635]/35 flex flex-col justify-between space-y-6">
              <div className="space-y-2.5 text-left">
                <div className="inline-flex items-center gap-2 text-xs font-mono text-[#a3e635]">
                  <Layers className="h-4 w-4" />
                  <span>Inventario &amp; Web</span>
                </div>
                <h3 className="text-xl font-bold text-white">Reserva Atómica de Stock</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Los pedidos de tu catálogo web reservan unidades al confirmar, evitando ventas duplicadas en mostrador.
                </p>
              </div>

              <div className="rounded-[12px] bg-[#07080a] border border-white/[0.08] p-3.5 space-y-2.5 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Bodega Principal</span>
                  <span className="text-white font-bold">142 u.</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-900 overflow-hidden">
                  <div className="h-full w-[78%] rounded-full bg-[#a3e635]" />
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-zinc-500">Reserva Pedido #ORD-1084</span>
                  <span className="text-[#a3e635]">-4 u.</span>
                </div>
              </div>
            </div>

            {/* Celda 4 (4 cols): Cartera & Abonos PDF */}
            <div className="landing-reveal-child landing-reveal-stagger-4 landing-card-hover lg:col-span-4 rounded-[20px] bg-[#0c0e12]/90 border border-white/10 p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.65)] hover:border-teal-400/35 flex flex-col justify-between space-y-6">
              <div className="space-y-2.5 text-left">
                <div className="inline-flex items-center gap-2 text-xs font-mono text-teal-400">
                  <Users className="h-4 w-4" />
                  <span>Cartera &amp; Créditos</span>
                </div>
                <h3 className="text-xl font-bold text-white">Abonos y Estados en PDF</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Controla cupos de crédito, registra abonos parciales con recibo de caja y descarga extractos listos para enviar.
                </p>
              </div>

              <div className="rounded-[12px] bg-[#07080a] border border-white/[0.08] p-3.5 flex items-center justify-between font-mono">
                <div>
                  <span className="text-[10px] text-zinc-500 block">SALDO CLIENTE</span>
                  <span className="text-sm font-bold text-white">$1.450.000</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-teal-400 block">ABONO HOY</span>
                  <span className="text-xs font-semibold text-[#a3e635]">+$450.000</span>
                </div>
              </div>
            </div>

            {/* Celda 5 (4 cols): Asistente IA Operativo */}
            <div className="landing-reveal-child landing-reveal-stagger-5 landing-card-hover lg:col-span-4 rounded-[20px] bg-gradient-to-b from-[#a3e635]/[0.07] to-[#0c0e12]/95 border border-[#a3e635]/25 p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.65)] hover:border-[#a3e635]/50 flex flex-col justify-between space-y-6">
              <div className="space-y-2.5 text-left">
                <div className="inline-flex items-center gap-2 text-xs font-mono text-[#a3e635]">
                  <Cpu className="h-4 w-4" />
                  <span>Asistente IA</span>
                </div>
                <h3 className="text-xl font-bold text-white">Analítica por Lenguaje Natural</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Pregunta por rentabilidad, rotación de inventario o cartera pendiente usando cifras reales de tu operación.
                </p>
              </div>

              <div className="rounded-[12px] bg-[#07080a] border border-white/10 p-3.5 space-y-1.5 text-[11px]">
                <span className="text-zinc-400 block">“¿Cuál fue mi margen neto hoy?”</span>
                <span className="font-mono font-semibold text-[#a3e635] block">
                  38.5% (+$1.42M utilidad neta)
                </span>
              </div>
            </div>
          </div>
        </div>
      </RevealSection>

      {/* ======================================================== */}
      {/* 5. SECTORES: WORKSPACE INTERACTIVO CON RAIL IZQUIERDO    */}
      {/* ======================================================== */}
      <RevealSection id="sectores" className="py-20 sm:py-28 relative">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-start">
            {/* Rail Izquierdo: Título + Selector Vertical */}
            <div className="landing-reveal-child landing-reveal-stagger-1 lg:col-span-4 space-y-6 text-left">
              <div className="space-y-2.5">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
                  Flujos Calibrados a Tu Rubro
                </h2>
                <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
                  Cada comercio maneja reglas distintas. Elige un sector para ver cómo Nova ERP adapta su flujo diario.
                </p>
              </div>

              <div className="border-l border-white/10 space-y-1">
                {(
                  [
                    { id: 'retail', code: '01', label: 'Retail & Comercio', icon: Store },
                    { id: 'restaurant', code: '02', label: 'Restaurantes & Bares', icon: UtensilsCrossed },
                    { id: 'tech', code: '03', label: 'Servicio Técnico', icon: Wrench },
                    { id: 'hardware', code: '04', label: 'Ferreterías', icon: Hammer },
                    { id: 'pharmacy', code: '05', label: 'Droguerías', icon: Pill },
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon
                  const active = activeSector === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveSector(tab.id)}
                      className={`w-full text-left pl-5 pr-4 py-3 -ml-px border-l-2 transition-[color,border-color,background-color] duration-150 flex items-center justify-between cursor-pointer ${
                        active
                          ? 'border-[#a3e635] bg-white/[0.04] text-white'
                          : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      <span className="flex items-center gap-3 text-sm font-medium">
                        <Icon className={`h-4 w-4 ${active ? 'text-[#a3e635]' : 'text-zinc-500'}`} />
                        <span>{tab.label}</span>
                      </span>
                      <span className={`font-mono text-xs ${active ? 'text-[#a3e635]' : 'text-zinc-600'}`}>
                        {tab.code}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Panel Derecho: Ficha Operativa Dinámica */}
            <div className="landing-reveal-child landing-reveal-stagger-2 lg:col-span-8 rounded-[24px] bg-[#0c0e12]/90 backdrop-blur-xl border border-white/10 p-7 sm:p-10 shadow-[0_25px_60px_rgba(0,0,0,0.8)]">
              <div key={activeSector} className="space-y-8 animate-sector-swap">
                <div className="space-y-3 text-left">
                  <span className="text-xs font-mono text-[#a3e635] block">{currentSector.name}</span>
                  <h3 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
                    {currentSector.title}
                  </h3>
                  <p className="text-base text-zinc-400 leading-relaxed max-w-2xl">
                    {currentSector.desc}
                  </p>
                </div>

                {/* Ruta Operativa del Sector */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {currentSector.workflow.map((step, i) => (
                    <div
                      key={step}
                      className="rounded-[12px] bg-[#07080a] border border-white/[0.08] p-4 flex items-center gap-3"
                    >
                      <span className="w-6 h-6 rounded-[6px] bg-[#a3e635]/15 text-[#a3e635] font-mono text-xs font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-xs sm:text-sm font-medium text-zinc-200">{step}</span>
                    </div>
                  ))}
                </div>

                {/* Indicadores Tabulares Abiertos */}
                <div className="pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
                  <div>
                    <span className="text-2xl sm:text-3xl font-bold font-mono text-white block">
                      {currentSector.stat1}
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">{currentSector.stat1Label}</span>
                  </div>
                  <div>
                    <span className="text-2xl sm:text-3xl font-bold font-mono text-[#a3e635] block">
                      {currentSector.stat2}
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">{currentSector.stat2Label}</span>
                  </div>
                  <div className="flex items-end justify-between sm:block">
                    <div>
                      <span className="text-2xl sm:text-3xl font-bold font-mono text-white block">
                        {currentSector.stat3}
                      </span>
                      <span className="text-xs text-zinc-400 font-mono">{currentSector.stat3Label}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-1">
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#a3e635] hover:underline"
                  >
                    <span>Configurar flujo para {currentSector.name}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </RevealSection>

      {/* ======================================================== */}
      {/* 6. DIFERENCIALES: MÉTRICAS Y ARQUITECTURA ABIERTA        */}
      {/* ======================================================== */}
      <RevealSection id="diferenciales" className="py-20 sm:py-28 relative">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-16 items-start">
            {/* Columna Izquierda: Métricas de Velocidad */}
            <div className="landing-reveal-child landing-reveal-stagger-1 lg:col-span-5 space-y-7 text-left">
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.08]">
                Velocidad de POS.
                <br />
                <span className="text-zinc-400">Control Contable Real.</span>
              </h2>

              <p className="text-base text-zinc-400 leading-relaxed">
                Reemplaza hojas de cálculo dispersas y cierres manuales por transacciones atómicas que actualizan caja, inventario y utilidad al instante.
              </p>

              <div className="space-y-5 pt-2">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-zinc-200">
                    <span>Agilidad en Mostrador y Facturación</span>
                    <span className="font-mono text-[#a3e635]">95%</span>
                  </div>
                  <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-[#a3e635] h-full rounded-full w-[95%]" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-zinc-200">
                    <span>Integridad de Inventario Multi-Bodega</span>
                    <span className="font-mono text-[#a3e635]">99.8%</span>
                  </div>
                  <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-[#a3e635] h-full rounded-full w-[99%]" />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-3 text-sm font-semibold text-[#a3e635] hover:gap-4 transition-[gap] duration-150"
                >
                  <span>Hablar con un especialista</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Columna Derecha: Especificaciones Abiertas con Líneas Finas */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-10">
              <div className="landing-reveal-child landing-reveal-stagger-2 border-t border-white/10 pt-5 space-y-2.5 text-left">
                <Sliders className="h-5 w-5 text-[#a3e635]" />
                <h3 className="text-lg font-bold text-white">Reglas de Negocio Flexibles</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Configura listas de precios mayoristas, impuestos, cajas y sucursales sin depender de soporte externo.
                </p>
              </div>

              <div className="landing-reveal-child landing-reveal-stagger-3 border-t border-white/10 pt-5 space-y-2.5 text-left">
                <Headphones className="h-5 w-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white">Acompañamiento Directo</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Soporte técnico en Colombia para puesta en marcha, resoluciones DIAN y migración desde Excel.
                </p>
              </div>

              <div className="landing-reveal-child landing-reveal-stagger-4 border-t border-white/10 pt-5 space-y-2.5 text-left">
                <Calendar className="h-5 w-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Normativa DIAN al Día</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Actualizaciones automáticas frente a cambios técnicos de facturación electrónica sin cobros extra.
                </p>
              </div>

              <div className="landing-reveal-child landing-reveal-stagger-5 border-t border-white/10 pt-5 space-y-2.5 text-left">
                <Layers className="h-5 w-5 text-teal-400" />
                <h3 className="text-lg font-bold text-white">Curva de Aprendizaje Mínima</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Cajeros operando desde el primer turno gracias a flujos directos y atajos de teclado claros.
                </p>
              </div>
            </div>
          </div>
        </div>
      </RevealSection>

      {/* ======================================================== */}
      {/* 7. TABLA DE PLANES EN COP (ALINEACIÓN EDITORIAL)         */}
      {/* ======================================================== */}
      <RevealSection id="precios" className="py-20 sm:py-28 relative">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-12 space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2 text-left">
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
                Tarifas Claras en COP
              </h2>
              <p className="text-base text-zinc-400">
                Sin permanencia ni cobros adicionales por cada factura electrónica emitida.
              </p>
            </div>

            {/* Toggle Mensual / Anual */}
            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-xs font-semibold transition-colors ${!annualBilling ? 'text-white' : 'text-zinc-500'}`}>
                Mensual
              </span>
              <button
                type="button"
                onClick={() => setAnnualBilling(!annualBilling)}
                className="w-12 h-7 rounded-full bg-zinc-900 border border-zinc-700 p-1 flex items-center cursor-pointer transition-colors"
                aria-label="Alternar periodicidad de pago"
              >
                <div
                  className={`w-5 h-5 rounded-full bg-[#a3e635] transition-transform duration-200 ${
                    annualBilling ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold transition-colors ${annualBilling ? 'text-white' : 'text-zinc-500'}`}>
                  Anual
                </span>
                <span className="text-xs font-mono font-semibold text-[#a3e635]">-20%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Starter */}
            <div className="landing-reveal-child landing-reveal-stagger-1 landing-card-hover rounded-[20px] bg-[#0c0e12]/80 border border-white/10 p-8 flex flex-col justify-between space-y-8">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-zinc-300">Starter</span>
                  <span className="text-[11px] font-mono text-zinc-500">1 Sede</span>
                </div>
                <div className="space-y-1">
                  <span className="text-4xl font-bold font-mono text-white tracking-tight">
                    {annualBilling ? '$63.200' : '$79.000'}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono block">COP / mes</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Para puntos de venta independientes que buscan agilidad en caja y cumplimiento DIAN.
                </p>

                <div className="pt-5 border-t border-white/[0.07] space-y-3 text-xs text-zinc-300">
                  <div className="flex items-center gap-2.5">
                    <Check className="h-3.5 w-3.5 text-[#a3e635] shrink-0" />
                    <span>1 Caja Registradora POS</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="h-3.5 w-3.5 text-[#a3e635] shrink-0" />
                    <span>1 Bodega de Inventario</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="h-3.5 w-3.5 text-[#a3e635] shrink-0" />
                    <span>Facturación Electrónica DIAN Ilimitada</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="h-3.5 w-3.5 text-[#a3e635] shrink-0" />
                    <span>Gestión de Clientes y Cierre Diario</span>
                  </div>
                </div>
              </div>

              <Link
                href="/register?plan=starter"
                className="w-full h-11 rounded-[12px] bg-zinc-900 border border-zinc-700 text-white text-xs font-semibold hover:border-zinc-500 transition-[border-color,transform] duration-150 active:scale-[0.98] flex items-center justify-center cursor-pointer"
              >
                Elegir Starter
              </Link>
            </div>

            {/* Pro */}
            <div className="landing-reveal-child landing-reveal-stagger-2 landing-card-hover rounded-[20px] bg-gradient-to-b from-[#a3e635]/[0.07] to-[#0c0e12]/95 border border-[#a3e635]/50 p-8 shadow-[0_24px_60px_rgba(0,0,0,0.75)] flex flex-col justify-between space-y-8">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#a3e635]">Pro</span>
                  <span className="text-[11px] font-mono text-[#a3e635]">Recomendado</span>
                </div>
                <div className="space-y-1">
                  <span className="text-4xl font-bold font-mono text-white tracking-tight">
                    {annualBilling ? '$119.200' : '$149.000'}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono block">COP / mes</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Para comercios en expansión con múltiples cajas, bodegas y tienda web sincronizada.
                </p>

                <div className="pt-5 border-t border-white/[0.08] space-y-3 text-xs text-zinc-200">
                  <div className="flex items-center gap-2.5">
                    <Check className="h-3.5 w-3.5 text-[#a3e635] shrink-0" />
                    <span className="font-semibold text-white">Hasta 3 Cajas POS simultáneas</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="h-3.5 w-3.5 text-[#a3e635] shrink-0" />
                    <span>Multi-Bodega y traslados auditados</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="h-3.5 w-3.5 text-[#a3e635] shrink-0" />
                    <span>Catálogo Web con reserva atómica</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="h-3.5 w-3.5 text-[#a3e635] shrink-0" />
                    <span>Asistente IA + Estados de Cartera PDF</span>
                  </div>
                </div>
              </div>

              <Link
                href="/register?plan=pro"
                className="w-full h-11 rounded-[12px] bg-[#a3e635] text-black text-xs font-semibold hover:bg-[#bef264] transition-[background-color,box-shadow,transform] duration-150 active:scale-[0.98] flex items-center justify-center shadow-[0_0_24px_rgba(163,230,53,0.3)] cursor-pointer"
              >
                Comenzar con Pro
              </Link>
            </div>

            {/* Enterprise */}
            <div className="landing-reveal-child landing-reveal-stagger-3 landing-card-hover rounded-[20px] bg-[#0c0e12]/80 border border-white/10 p-8 flex flex-col justify-between space-y-8">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-zinc-300">Enterprise</span>
                  <span className="text-[11px] font-mono text-zinc-500">Multi-Sucursal</span>
                </div>
                <div className="space-y-1">
                  <span className="text-4xl font-bold font-mono text-white tracking-tight">
                    {annualBilling ? '$231.200' : '$289.000'}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono block">COP / mes</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Para cadenas, distribuidoras y operaciones mayoristas de alto volumen transaccional.
                </p>

                <div className="pt-5 border-t border-white/[0.07] space-y-3 text-xs text-zinc-300">
                  <div className="flex items-center gap-2.5">
                    <Check className="h-3.5 w-3.5 text-[#a3e635] shrink-0" />
                    <span>Cajas y Sucursales Ilimitadas</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="h-3.5 w-3.5 text-[#a3e635] shrink-0" />
                    <span>API dedicada para Storefront</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="h-3.5 w-3.5 text-[#a3e635] shrink-0" />
                    <span>Onboarding guiado y soporte 24/7</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="h-3.5 w-3.5 text-[#a3e635] shrink-0" />
                    <span>SLA garantizado del 99.9%</span>
                  </div>
                </div>
              </div>

              <Link
                href="/register?plan=enterprise"
                className="w-full h-11 rounded-[12px] bg-zinc-900 border border-zinc-700 text-white text-xs font-semibold hover:border-zinc-500 transition-[border-color,transform] duration-150 active:scale-[0.98] flex items-center justify-center cursor-pointer"
              >
                Solicitar Plan Enterprise
              </Link>
            </div>
          </div>
        </div>
      </RevealSection>

      {/* ======================================================== */}
      {/* 8. FAQ EDITORIAL CON LÍNEAS FINAS + ACTIVIDAD EN VIVO    */}
      {/* ======================================================== */}
      <RevealSection id="faq" className="py-20 sm:py-28 relative">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-16 items-start">
            {/* Columna Izquierda: Acordeón Editorial Minimalista */}
            <div className="landing-reveal-child landing-reveal-stagger-1 lg:col-span-7 space-y-8 text-left">
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
                Preguntas Frecuentes
              </h2>

              <div className="border-y border-white/[0.08] divide-y divide-white/[0.08]">
                {[
                  {
                    q: '¿Qué medios de pago puedo registrar en cada caja?',
                    a: 'Nova ERP soporta cobro en efectivo con cálculo de cambio, transferencias bancarias (Bancolombia, Nequi, Daviplata), datáfonos y ventas a crédito con control de cartera.',
                  },
                  {
                    q: '¿La facturación electrónica ante la DIAN es automática?',
                    a: 'Sí. Al emitir una venta electrónica, Nova ERP genera el XML firmado, valida ante la DIAN y entrega el CUFE y código QR al instante.',
                  },
                  {
                    q: '¿Puedo controlar múltiples sucursales y bodegas?',
                    a: 'Sí. Puedes definir bodegas centrales y tiendas satélite, registrar traslados entre sedes y auditar el stock disponible por ubicación en tiempo real.',
                  },
                  {
                    q: '¿Cómo se sincroniza el inventario con los pedidos web?',
                    a: 'Al confirmar un pedido del catálogo web, el stock queda reservado atómicamente para que mostrador no venda unidades comprometidas.',
                  },
                  {
                    q: '¿Mis datos están respaldados en la nube?',
                    a: 'Tu base de datos PostgreSQL opera con copias de seguridad automáticas, cifrado SSL en tránsito y reposo, y aislamiento por sucursal.',
                  },
                ].map((item, idx) => {
                  const isOpen = openFaq === idx
                  return (
                    <div key={idx}>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => setOpenFaq(isOpen ? null : idx)}
                        className="w-full py-5 text-left flex items-center justify-between gap-4 text-base font-medium text-white hover:text-[#a3e635] cursor-pointer transition-colors duration-150"
                      >
                        <span>{item.q}</span>
                        <span className="text-zinc-400 shrink-0">
                          {isOpen ? <Minus className="h-4 w-4 text-[#a3e635]" /> : <Plus className="h-4 w-4" />}
                        </span>
                      </button>

                      <div data-open={isOpen ? 'true' : 'false'} className="faq-accordion-content">
                        <div className="faq-accordion-inner">
                          <div className="pb-5 text-sm text-zinc-400 leading-relaxed max-w-2xl">
                            {item.a}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Columna Derecha: Tarjeta de Actividad Transaccional en Vivo */}
            <div className="landing-reveal-child landing-reveal-stagger-2 lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md rounded-[22px] bg-[#0c0e12]/90 backdrop-blur-2xl p-7 shadow-[0_30px_70px_rgba(0,0,0,0.9)] border border-white/10 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                  <div>
                    <span className="text-sm font-bold text-white block">Actividad Reciente</span>
                    <span className="text-xs text-zinc-400 font-mono">Movimientos en Vivo</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-[8px] bg-[#a3e635]/10 border border-[#a3e635]/25 text-[#a3e635] font-mono text-xs font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#a3e635] animate-pulse" />
                    En Línea
                  </span>
                </div>

                <div className="space-y-2.5">
                  {[
                    {
                      label: 'Cobro POS Mostrador',
                      date: 'Hoy, 10:45 AM',
                      amount: '+$500.000',
                      positive: true,
                    },
                    {
                      label: 'Pago Proveedor Lácteos',
                      date: 'Hoy, 09:30 AM',
                      amount: '-$200.000',
                      positive: false,
                    },
                    {
                      label: 'Venta Pedido Web #184',
                      date: 'Hoy, 08:15 AM',
                      amount: '+$350.000',
                      positive: true,
                    },
                    {
                      label: 'Despacho Mayorista B2B',
                      date: 'Ayer, 05:20 PM',
                      amount: '+$1.200.000',
                      positive: true,
                    },
                  ].map((tx, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-[10px] hover:bg-white/[0.03] transition-colors">
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-8 h-8 rounded-[8px] flex items-center justify-center font-mono font-bold text-xs ${
                            tx.positive ? 'bg-[#a3e635]/15 text-[#a3e635]' : 'bg-rose-500/15 text-rose-400'
                          }`}
                        >
                          {tx.positive ? '+' : '-'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{tx.label}</p>
                          <p className="text-xs text-zinc-500 font-mono">{tx.date}</p>
                        </div>
                      </div>
                      <span
                        className={`text-sm font-mono font-bold ${
                          tx.positive ? 'text-[#a3e635]' : 'text-zinc-400'
                        }`}
                      >
                        {tx.amount}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Total Facturado Hoy</span>
                  <span className="font-mono font-bold text-white text-base">$1.850.000 COP</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </RevealSection>

      {/* ======================================================== */}
      {/* 9. FOOTER EDITORIAL CON ACCESO DIRECTO                   */}
      {/* ======================================================== */}
      <footer className="pt-16 pb-12 bg-transparent border-t border-white/10 text-xs text-zinc-400">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-12 space-y-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 text-left">
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Empieza Hoy en la Nube.
              </h3>
              <p className="text-sm text-zinc-400">
                Activa tu punto de venta y facturación DIAN en cuestión de minutos.
              </p>
            </div>

            <Link
              href="/register"
              className="h-12 px-7 rounded-full bg-[#a3e635] text-black text-sm font-semibold hover:bg-[#bef264] transition-[background-color,box-shadow,transform] duration-150 active:scale-[0.97] inline-flex items-center gap-2 shadow-[0_0_24px_rgba(163,230,53,0.35)] shrink-0 self-start md:self-auto cursor-pointer"
            >
              <span>Crear Cuenta Gratis</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <span className="text-xl font-black tracking-tight text-white font-sans">
                nova erp<span className="text-[#a3e635]">.</span>
              </span>
              <span className="text-zinc-600 font-mono">|</span>
              <span className="font-mono text-zinc-400 text-xs">Sistema de Gestión Comercial &amp; POS</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-zinc-400 text-xs font-medium">
              {NAV_SECTIONS.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => handleSectionNavigate(e, item.id)}
                  className="hover:text-white transition-colors"
                >
                  {item.label}
                </a>
              ))}
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="hover:text-white font-medium cursor-pointer"
              >
                Acceso al Sistema
              </button>
            </div>

            <div className="text-center sm:text-right text-xs text-zinc-500 font-mono">
              Copyright © {new Date().getFullYear()} anthra123x. Todos los derechos reservados.
            </div>
          </div>
        </div>
      </footer>

      {/* ======================================================== */}
      {/* 14. MODAL DE INICIO DE SESIÓN Y RECUPERACIÓN (SUPABASE)  */}
      {/* ======================================================== */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in-0 duration-200">
          <div
            className="relative w-full max-w-md rounded-3xl bg-[#0c0e12] border border-white/10 p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-150 text-white"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            {/* Botón de cierre */}
            <button
              type="button"
              onClick={() => {
                setIsLoginModalOpen(false)
                setError('')
                setRecoveryMessage('')
              }}
              className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Cabecera del modal */}
            <div className="space-y-2 text-left">
              <span className="text-2xl font-black tracking-tight text-white font-sans">
                nova erp<span className="text-[#a3e635]">.</span>
              </span>
              <h2 id="modal-title" className="text-xl font-bold tracking-tight text-white">
                {recover ? 'Recuperar Contraseña' : 'Acceso a Nova ERP'}
              </h2>
              <p className="text-xs text-zinc-400">
                {recover
                  ? 'Ingresa tu correo para recibir un enlace de restablecimiento seguro.'
                  : 'Ingresa tus credenciales para ingresar a tu terminal de operaciones.'}
              </p>
            </div>

            {/* Mensajes de error o éxito */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {recoveryMessage && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-xs text-emerald-200 flex items-center gap-2">
                <MailCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{recoveryMessage}</span>
              </div>
            )}

            {/* Formulario de Recuperación o Inicio de Sesión */}
            {recover ? (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="recovery-email" className="text-xs font-medium text-zinc-300">
                    Correo Electrónico
                  </Label>
                  <div className="relative">
                    <Input
                      id="recovery-email"
                      type="email"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="admin@empresa.com"
                      required
                      className="pl-9 h-11 rounded-xl bg-zinc-900/90 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-[#a3e635] text-sm"
                    />
                    <Mail className="h-4 w-4 text-zinc-400 absolute left-3 top-3.5" />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={recoveryLoading}
                  className="w-full h-11 rounded-xl bg-[#a3e635] text-black font-semibold hover:bg-[#bef264] transition-colors cursor-pointer text-sm shadow-[0_0_18px_rgba(163,230,53,0.3)]"
                >
                  {recoveryLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-black" />
                      Enviando enlace...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-black" />
                      Enviar Instrucciones
                    </span>
                  )}
                </Button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRecover(false)
                      setError('')
                    }}
                    className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Volver a inicio de sesión
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="login-email" className="text-xs font-medium text-zinc-300">
                    Correo Electrónico
                  </Label>
                  <div className="relative">
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      placeholder="cajero@empresa.com"
                      required
                      className="pl-9 h-11 rounded-xl bg-zinc-900/90 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-[#a3e635] text-sm"
                    />
                    <Mail className="h-4 w-4 text-zinc-400 absolute left-3 top-3.5" />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password" className="text-xs font-medium text-zinc-300">
                      Contraseña
                    </Label>
                    <button
                      type="button"
                      onClick={() => {
                        setRecover(true)
                        setError('')
                      }}
                      className="text-[11px] text-zinc-400 hover:text-[#a3e635] transition-colors cursor-pointer"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="login-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      required
                      className="pl-9 pr-10 h-11 rounded-xl bg-zinc-900/90 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-[#a3e635] text-sm"
                    />
                    <Lock className="h-4 w-4 text-zinc-400 absolute left-3 top-3.5" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 rounded-xl bg-[#a3e635] text-black font-semibold hover:bg-[#bef264] transition-colors cursor-pointer text-sm shadow-[0_0_18px_rgba(163,230,53,0.3)]"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-black" />
                      Validando credenciales...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <LogIn className="h-4 w-4 text-black" />
                      Ingresar al Sistema
                    </span>
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
