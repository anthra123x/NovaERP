'use client'

import { useState, useSyncExternalStore, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClientSupabase } from '@/lib/supabase'
import { ensureUserExists, requestPasswordReset } from '@/modules/auth/auth.actions'
import { NovaLogo } from '@/components/ui/nova-logo'
import {
  LogIn,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  MailCheck,
  Eye,
  EyeOff,
  Lock,
  Mail,
  TrendingUp,
  ShieldCheck,
  Package,
  Receipt,
  HandCoins,
  Sun,
  Moon,
  Zap,
  Store,
  UtensilsCrossed,
  Wrench,
  HeartPulse,
  Smartphone,
  ChevronDown,
  Check,
  X,
  Sparkles,
  BarChart3,
  Globe,
} from 'lucide-react'
import {
  saveUserPreferences,
  subscribePreferences,
  getThemeSnapshot,
  getThemeServerSnapshot,
  type ThemeMode,
} from '@/lib/user-preferences'

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
  const [annualBilling, setAnnualBilling] = useState(true)
  const [activeSectorTab, setActiveSectorTab] = useState<'retail' | 'restaurant' | 'tech' | 'hardware' | 'pharmacy'>('retail')
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  // Sincronización del tema visual (oscuro / claro)
  const theme = useSyncExternalStore(subscribePreferences, getThemeSnapshot, getThemeServerSnapshot)

  function toggleTheme() {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark'
    saveUserPreferences({ theme: nextTheme })
  }

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      const supabase = createClientSupabase()

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message || 'Credenciales de acceso incorrectas')
        setIsLoading(false)
        return
      }

      if (data.user) {
        try {
          await ensureUserExists(data.user.email || '', data.user.user_metadata?.name || data.user.email || '')
        } catch {
          // Continuar normalmente
        }
      }

      window.location.replace('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
      setIsLoading(false)
    }
  }

  async function handleRecover(e: React.FormEvent<HTMLFormElement>) {
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

  // Información adaptativa de sectores para el visualizador en vivo
  const sectorPreviews = {
    retail: {
      title: 'Comercio General & Tiendas de Retail',
      icon: Store,
      metric1Label: 'Ventas de Mostrador Hoy',
      metric1Value: '$18.450.000 COP',
      metric1Delta: '+14.2% vs ayer',
      metric2Label: 'Referencias en Stock',
      metric2Value: '1.420 artículos',
      metric2Note: 'Sincronizado físico y web',
      metric3Label: 'Margen Promedio',
      metric3Value: '38.5%',
      metric3Note: 'Utilidad neta calculada',
      posTicket: {
        number: '#POS-08412',
        item: 'Zapatos Oxford en Cuero Natural',
        spec: 'Talla 41 · Color Café · 1 unidad',
        total: '$285.000 COP',
        badge: 'Factura DIAN Generada',
      },
    },
    restaurant: {
      title: 'Restaurantes, Cafeterías & Gastronomía',
      icon: UtensilsCrossed,
      metric1Label: 'Venta de Comandas Hoy',
      metric1Value: '$8.920.000 COP',
      metric1Delta: '+21.5% almuerzo y cena',
      metric2Label: 'Mesas Ocupadas',
      metric2Value: '16 de 18 activas',
      metric2Note: 'Rotación promedio: 38 min',
      metric3Label: 'Créditos de Cliente',
      metric3Value: '0% (Deshabilitado)',
      metric3Note: 'Operación 100% de contado',
      posTicket: {
        number: '#COM-00341',
        item: 'Combo Parrilla Mixta + Bebida Artesanal',
        spec: 'Mesa 4 · Término medio · Sin cebolla',
        total: '$68.000 COP',
        badge: 'Despacho en Cocina',
      },
    },
    tech: {
      title: 'Tecnología, Telefonía & Servicio Técnico',
      icon: Smartphone,
      metric1Label: 'Facturación Técnica Hoy',
      metric1Value: '$12.300.000 COP',
      metric1Delta: '+18.0% equipos entregados',
      metric2Label: 'Órdenes de Reparación',
      metric2Value: '24 en taller',
      metric2Note: 'Trazabilidad por serie IMEI',
      metric3Label: 'Garantías Activas',
      metric3Value: '99.2% efectividad',
      metric3Note: 'Control de repuestos y mano de obra',
      posTicket: {
        number: '#ORD-01992',
        item: 'Cambio Pantalla OLED + Mantenimiento',
        spec: 'IMEI: 354892019283741 · Garantía 90 días',
        total: '$350.000 COP',
        badge: 'Reparación Finalizada',
      },
    },
    hardware: {
      title: 'Ferreterías, Eléctricos & Construcción',
      icon: Wrench,
      metric1Label: 'Despachos por Volumen Hoy',
      metric1Value: '$24.600.000 COP',
      metric1Delta: '+9.8% cotizaciones cerradas',
      metric2Label: 'Cartera a Maestros de Obra',
      metric2Value: '$9.450.000 COP',
      metric2Note: 'Cobros a 15 y 30 días',
      metric3Label: 'Kilos / Metros en Bodega',
      metric3Value: '100% auditado',
      metric3Note: 'Control de fracciones y bultos',
      posTicket: {
        number: '#COT-04819',
        item: 'Cemento Gris Tipo 1 (50kg) x 40 Bultos',
        spec: 'Entrega en Obra Norte · Cotización aprobada',
        total: '$1.480.000 COP',
        badge: 'Despachado a Crédito',
      },
    },
    pharmacy: {
      title: 'Droguerías, Farmacias & Cuidado de la Salud',
      icon: HeartPulse,
      metric1Label: 'Dispensación Diaria',
      metric1Value: '$14.150.000 COP',
      metric1Delta: '+11.4% alta rotación',
      metric2Label: 'Control de Lotes y Vencimiento',
      metric2Value: '0 alertas críticas',
      metric2Note: 'Sistema FIFO automático',
      metric3Label: 'Ticket Promedio',
      metric3Value: '$42.500 COP',
      metric3Note: 'Cobro ágil con escáner',
      posTicket: {
        number: '#MED-09182',
        item: 'Tratamiento Antibiótico + Multivitamínico',
        spec: 'Lote: L-2026-X9 · Vence: Dic 2027',
        total: '$85.000 COP',
        badge: 'Validación Sanitaria OK',
      },
    },
  }

  const currentPreview = sectorPreviews[activeSectorTab]

  return (
    <div className="relative min-h-dvh w-full bg-[#f8f9fa] dark:bg-[#090a0f] text-foreground font-sans overflow-x-hidden selection:bg-emerald-500 selection:text-white">
      {/* ======================================================== */}
      {/* FONDOS AMBIENTALES Y LUCES DECORATIVAS                   */}
      {/* ======================================================== */}
      <div
        className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />
      <div className="absolute -top-24 -left-24 w-[580px] h-[580px] rounded-full blur-[48px] sm:blur-[72px] pointer-events-none animate-ambient-glow-1 motion-reduce:animate-none bg-gradient-to-tr from-emerald-500/30 via-emerald-400/20 to-teal-400/10 dark:from-emerald-500/20 dark:via-emerald-400/15 dark:to-teal-400/10" />
      <div className="absolute top-[35%] -right-24 w-[620px] h-[620px] rounded-full blur-[48px] sm:blur-[72px] pointer-events-none animate-ambient-glow-2 motion-reduce:animate-none bg-gradient-to-bl from-teal-500/30 via-emerald-500/20 to-emerald-600/10 dark:from-teal-400/15 dark:via-emerald-500/10 dark:to-emerald-600/10" />
      <div className="absolute top-[65%] -left-20 w-[480px] h-[480px] rounded-full blur-[48px] sm:blur-[72px] pointer-events-none animate-ambient-wander motion-reduce:animate-none bg-gradient-to-r from-emerald-400/25 via-teal-300/15 to-emerald-600/10 dark:from-emerald-400/15 dark:via-teal-400/10 dark:to-emerald-600/10" />
      <div className="absolute bottom-10 right-1/4 w-[380px] h-[380px] rounded-full blur-[48px] sm:blur-[72px] pointer-events-none animate-ambient-shine motion-reduce:animate-none bg-emerald-500/15 dark:bg-emerald-400/10" />

      {/* ======================================================== */}
      {/* 1. BARRA DE NAVEGACIÓN SUPERIOR (NAVBAR)                */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/85 backdrop-blur-md transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 group cursor-pointer">
            <NovaLogo size="sm" />
          </Link>

          {/* Enlaces de Navegación de Escritorio */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-medium text-muted-foreground">
            <a href="#para-que-sirve" className="hover:text-foreground transition-colors">
              ¿Para qué sirve?
            </a>
            <a href="#modulos" className="hover:text-foreground transition-colors">
              Módulos ERP
            </a>
            <a href="#sectores" className="hover:text-foreground transition-colors">
              Sectores
            </a>
            <a href="#comparativa" className="hover:text-foreground transition-colors">
              Comparativa
            </a>
            <a href="#precios" className="hover:text-foreground transition-colors">
              Licencias & Precios
            </a>
            <a href="#faq" className="hover:text-foreground transition-colors">
              Preguntas Frecuentes
            </a>
          </nav>

          {/* Acciones de la Cabecera */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-border/80 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs"
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label="Cambiar tema visual"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setRecover(false)
                setError('')
                setIsLoginModalOpen(true)
              }}
              className="px-3.5 py-1.5 rounded-xl border border-border/90 bg-card hover:bg-muted text-foreground text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              Iniciar Sesión
            </button>

            <Button
              render={<Link href="/register" />}
              size="sm"
              className="hidden sm:inline-flex h-8 px-4 rounded-xl text-xs font-semibold bg-gray-950 text-white dark:bg-white dark:text-gray-950 hover:bg-black transition-all shadow-xs cursor-pointer"
            >
              <span>Prueba Gratis</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. HERO PRINCIPAL DE LA LANDING                          */}
      {/* ======================================================== */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-5">
            {/* Super-badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-xs font-semibold shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Software ERP Cloud de Nueva Generación · Colombia & LatAm</span>
            </div>

            {/* Titular de Alto Impacto */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
              El ERP moderno que centraliza y escala tu negocio
            </h1>

            {/* Subtítulo Descriptivo */}
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground leading-relaxed">
              Controla ventas POS de mostrador, inventario en tiempo real, facturación electrónica DIAN, cartera de créditos y catálogo web en una sola plataforma. La alternativa ágil a Alegra, Odoo y Sage diseñada para operar sin sorpresas ni costos ocultos.
            </p>

            {/* Botones de Conversión */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                render={<Link href="/register" />}
                size="lg"
                className="w-full sm:w-auto h-11 px-6 rounded-2xl text-xs sm:text-sm font-semibold bg-gray-950 text-white dark:bg-white dark:text-gray-950 hover:bg-black transition-all shadow-md cursor-pointer group"
              >
                <span>Comenzar Prueba Gratis (14 Días)</span>
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>

              <button
                type="button"
                onClick={() => {
                  setRecover(false)
                  setError('')
                  setIsLoginModalOpen(true)
                }}
                className="w-full sm:w-auto h-11 px-6 rounded-2xl border border-border/90 bg-card hover:bg-muted text-foreground text-xs sm:text-sm font-semibold shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <LogIn className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Acceder a mi Cuenta (Login)</span>
              </button>
            </div>

            {/* Insignias de Confianza Técnica */}
            <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-2xs">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <Zap className="h-3.5 w-3.5" />
                  <span>&lt; 45ms</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Respuesta ultra veloz</div>
              </div>

              <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-2xs">
                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-xs">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>99.9% Uptime</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Disponibilidad en la nube</div>
              </div>

              <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-2xs">
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs">
                  <Receipt className="h-3.5 w-3.5" />
                  <span>Estándar DIAN</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Facturación reglamentaria</div>
              </div>

              <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-2xs">
                <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-bold text-xs">
                  <Globe className="h-3.5 w-3.5" />
                  <span>Omnicanal</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Tienda física y web</div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 3. SHOWCASE / VISTA PREVIA INTERACTIVA DEL ERP          */}
          {/* ======================================================== */}
          <div className="mt-14 max-w-5xl mx-auto rounded-3xl bg-card border border-border/90 shadow-2xl overflow-hidden">
            {/* Header de la ventana con selector de sectores */}
            <div className="p-4 sm:p-5 border-b border-border/70 bg-muted/40 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-red-400/80" />
                  <span className="h-3 w-3 rounded-full bg-amber-400/80" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
                </div>
                <span className="text-xs font-bold text-foreground ml-2">Panel Operativo en Vivo · {currentPreview.title}</span>
              </div>

              {/* Selector de Pestañas de Sectores */}
              <div className="flex items-center gap-1 bg-background/80 p-1 rounded-2xl border border-border/80 overflow-x-auto max-w-full">
                {(['retail', 'restaurant', 'tech', 'hardware', 'pharmacy'] as const).map((sec) => {
                  const info = sectorPreviews[sec]
                  const Icon = info.icon
                  const active = activeSectorTab === sec
                  return (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setActiveSectorTab(sec)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-card text-foreground shadow-xs border border-border/80'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{sec === 'retail' ? 'Retail' : sec === 'restaurant' ? 'Restaurante' : sec === 'tech' ? 'Tecnología' : sec === 'hardware' ? 'Ferretería' : 'Farmacia'}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Contenido Visual del Dashboard según el Sector Seleccionado */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* Tarjetas de Métricas en Vivo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/70">
                  <span className="text-xs font-semibold text-muted-foreground">{currentPreview.metric1Label}</span>
                  <div className="text-2xl font-bold tracking-tight text-foreground mt-1 font-mono">{currentPreview.metric1Value}</div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                    <TrendingUp className="h-3 w-3" />
                    {currentPreview.metric1Delta}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-muted/30 border border-border/70">
                  <span className="text-xs font-semibold text-muted-foreground">{currentPreview.metric2Label}</span>
                  <div className="text-2xl font-bold tracking-tight text-foreground mt-1">{currentPreview.metric2Value}</div>
                  <span className="text-[11px] text-muted-foreground mt-1 block">{currentPreview.metric2Note}</span>
                </div>

                <div className="p-4 rounded-2xl bg-muted/30 border border-border/70">
                  <span className="text-xs font-semibold text-muted-foreground">{currentPreview.metric3Label}</span>
                  <div className="text-2xl font-bold tracking-tight text-foreground mt-1">{currentPreview.metric3Value}</div>
                  <span className="text-[11px] text-muted-foreground mt-1 block">{currentPreview.metric3Note}</span>
                </div>
              </div>

              {/* Ejemplo de Comprobante / Ticket POS Registrado */}
              <div className="p-5 rounded-2xl bg-background border border-border/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground font-mono">{currentPreview.posTicket.number}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                        {currentPreview.posTicket.badge}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-foreground mt-0.5">{currentPreview.posTicket.item}</div>
                    <div className="text-[11px] text-muted-foreground">{currentPreview.posTicket.spec}</div>
                  </div>
                </div>

                <div className="sm:text-right w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                  <span className="text-[11px] text-muted-foreground block">Importe Facturado</span>
                  <span className="text-lg font-bold font-mono text-foreground">{currentPreview.posTicket.total}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. SECCIÓN: ¿DE QUÉ VA Y PARA QUÉ SIRVE EL ERP?         */}
      {/* ======================================================== */}
      <section id="para-que-sirve" className="py-16 sm:py-24 border-t border-border/70 bg-card/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono">
              Fundamentos del Sistema
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              ¿De qué va y para qué le sirve Nova ERP a tu empresa?
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Un ERP (Enterprise Resource Planning) es el cerebro unificado de tu negocio. Reemplaza las libretas de mostrador, archivos de Excel desactualizados y múltiples programas aislados por una base de datos centralizada que conecta tus ventas, inventario, tesorería y clientes en tiempo real.
            </p>
          </div>

          {/* Grid de 6 Pilares de Valor */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-xs hover:border-emerald-500/50 transition-colors space-y-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Receipt className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">1. Punto de Venta POS & Facturación</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Ventas ultra rápidas de mostrador con lector de código de barras, atajos de teclado, tickets de caja térmica y facturas electrónicas estándar DIAN sin trabas.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-xs hover:border-blue-500/50 transition-colors space-y-3">
              <div className="h-10 w-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Package className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">2. Control de Inventario Multi-bodega</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Sabe exactamente qué tienes y dónde está. Registro automático de entradas, salidas, mermas, traslados entre sucursales y alertas tempranas de stock mínimo.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-xs hover:border-amber-500/50 transition-colors space-y-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <HandCoins className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">3. Cartera, Créditos y Cuentas por Cobrar</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Asigna cupos de crédito a clientes recurrentes, controla fechas de vencimiento, registra abonos parciales y genera estados de cuenta para cobrar a tiempo.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-xs hover:border-purple-500/50 transition-colors space-y-3">
              <div className="h-10 w-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">4. Finanzas, Flujo de Caja & Rentabilidad</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Conoce tu utilidad neta en cada transacción. Libro diario automático, arqueos de caja por turno, costos de compra vs. precio de venta y márgenes reales.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-xs hover:border-teal-500/50 transition-colors space-y-3">
              <div className="h-10 w-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                <Globe className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">5. Tienda Online & Pedidos Omnicanal</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Tu catálogo web publicado y listo para recibir pedidos de clientes. Cada orden web sincroniza el inventario físico sin riesgo de vender productos agotados.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-xs hover:border-pink-500/50 transition-colors space-y-3">
              <div className="h-10 w-10 rounded-2xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center font-bold">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">6. Asistente con Inteligencia Artificial</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Un copiloto comercial que analiza tus métricas, detecta productos estancados, redacta campañas promocionales y responde consultas operativas al instante.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 5. SECCIÓN: COMPARATIVA FRENTE A OTROS ERPS (Odoo, Alegra) */}
      {/* ======================================================== */}
      <section id="comparativa" className="py-16 sm:py-24 border-t border-border/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono">
              Análisis Competitivo
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              ¿Por qué elegir Nova ERP frente a Alegra, Odoo o Sage?
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Analizamos lo que buscan los empresarios: velocidad real de respuesta, costes predecibles sin cobros por usuario adicional y cero complejidades innecesarias.
            </p>
          </div>

          <div className="max-w-5xl mx-auto rounded-3xl bg-card border border-border/90 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/40">
                    <th className="p-4 sm:p-5 font-bold text-foreground">Capacidad Técnica / Característica</th>
                    <th className="p-4 sm:p-5 font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-x border-border/80">
                      Nova ERP
                    </th>
                    <th className="p-4 sm:p-5 font-semibold text-muted-foreground">Alegra</th>
                    <th className="p-4 sm:p-5 font-semibold text-muted-foreground">Odoo ERP</th>
                    <th className="p-4 sm:p-5 font-semibold text-muted-foreground">Sage 50</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  <tr>
                    <td className="p-4 sm:p-5 font-medium text-foreground">Tiempo de respuesta en mostrador</td>
                    <td className="p-4 sm:p-5 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 border-x border-border/80">
                      &lt; 45ms (Ultra rápido)
                    </td>
                    <td className="p-4 sm:p-5 text-muted-foreground">Medio (300-600ms)</td>
                    <td className="p-4 sm:p-5 text-muted-foreground">Variable (depende del servidor)</td>
                    <td className="p-4 sm:p-5 text-muted-foreground">Lento (cliente de escritorio)</td>
                  </tr>

                  <tr>
                    <td className="p-4 sm:p-5 font-medium text-foreground">Precio predecible (sin cobro por usuario extra)</td>
                    <td className="p-4 sm:p-5 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 border-x border-border/80">
                      Incluido en planes Pro
                    </td>
                    <td className="p-4 sm:p-5 text-muted-foreground">Cobro por usuario adicional</td>
                    <td className="p-4 sm:p-5 text-muted-foreground">Tarifas por usuario y módulo</td>
                    <td className="p-4 sm:p-5 text-muted-foreground">Licenciamiento costoso</td>
                  </tr>

                  <tr>
                    <td className="p-4 sm:p-5 font-medium text-foreground">Punto de Venta POS & Restaurantes Integrado</td>
                    <td className="p-4 sm:p-5 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 border-x border-border/80">
                      Nativo con comandas y mesas
                    </td>
                    <td className="p-4 sm:p-5 text-muted-foreground">Módulo POS separado</td>
                    <td className="p-4 sm:p-5 text-muted-foreground">Requiere apps adicionales</td>
                    <td className="p-4 sm:p-5 text-muted-foreground">No optimizado para comida</td>
                  </tr>

                  <tr>
                    <td className="p-4 sm:p-5 font-medium text-foreground">Tienda Online y Catálogo Omnicanal</td>
                    <td className="p-4 sm:p-5 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 border-x border-border/80">
                      Sincronizado sin comisiones
                    </td>
                    <td className="p-4 sm:p-5 text-muted-foreground">Requiere integraciones externas</td>
                    <td className="p-4 sm:p-5 text-muted-foreground">Complejo de configurar</td>
                    <td className="p-4 sm:p-5 text-muted-foreground">No disponible de forma nativa</td>
                  </tr>

                  <tr>
                    <td className="p-4 sm:p-5 font-medium text-foreground">Curva de aprendizaje para el equipo</td>
                    <td className="p-4 sm:p-5 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 border-x border-border/80">
                      Menos de 15 minutos
                    </td>
                    <td className="p-4 sm:p-5 text-muted-foreground">Moderada</td>
                    <td className="p-4 sm:p-5 text-muted-foreground">Alta (requiere consultor)</td>
                    <td className="p-4 sm:p-5 text-muted-foreground">Muy alta (interfaz antigua)</td>
                  </tr>

                  <tr>
                    <td className="p-4 sm:p-5 font-medium text-foreground">Asistente con Inteligencia Artificial</td>
                    <td className="p-4 sm:p-5 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 border-x border-border/80">
                      Incluido nativamente
                    </td>
                    <td className="p-4 sm:p-5 text-muted-foreground">No disponible</td>
                    <td className="p-4 sm:p-5 text-muted-foreground">Extensiones externas pagas</td>
                    <td className="p-4 sm:p-5 text-muted-foreground">No disponible</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 6. PLANES Y PRECIOS DE LICENCIAS DEL SISTEMA             */}
      {/* ======================================================== */}
      <section id="precios" className="py-16 sm:py-24 border-t border-border/70 bg-card/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono">
              Inversión Transparente
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Planes y precios de licencias de Nova ERP
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Elige el plan ideal para tu empresa. Sin contratos forzosos ni costos ocultos. Cancela o cambia de plan cuando lo necesites.
            </p>

            {/* Conmutador de Facturación Mensual / Anual */}
            <div className="pt-4 flex items-center justify-center gap-3">
              <span className={`text-xs font-semibold ${!annualBilling ? 'text-foreground' : 'text-muted-foreground'}`}>
                Facturación Mensual
              </span>
              <button
                type="button"
                onClick={() => setAnnualBilling((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  annualBilling ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                }`}
                aria-label="Alternar facturación anual con descuento"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    annualBilling ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-xs font-semibold flex items-center gap-1.5 ${annualBilling ? 'text-foreground' : 'text-muted-foreground'}`}>
                <span>Facturación Anual</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                  Ahorra 20%
                </span>
              </span>
            </div>
          </div>

          {/* Tres Tarjetas de Precios */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            {/* PLAN 1: Emprendedor / Starter */}
            <div className="p-7 sm:p-8 rounded-3xl bg-card border border-border/80 shadow-xs flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground">
                  Microempresas & Tiendas
                </div>
                <h3 className="text-xl font-bold text-foreground">Plan Emprendedor</h3>
                <p className="text-xs text-muted-foreground">
                  Para pequeños comercios y negocios que dan el salto de las libretas y Excel hacia la automatización.
                </p>

                <div className="pt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-foreground font-mono">
                      {annualBilling ? '$47.200' : '$59.000'}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">COP / mes</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {annualBilling ? 'Facturado anualmente ($566.400 COP/año)' : 'Facturación mes a mes'}
                  </span>
                </div>

                <div className="pt-4 border-t border-border/60 space-y-2.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>1 Caja POS de mostrador principal</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Hasta 500 referencias en inventario</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Tickets POS y facturas ilimitadas</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Control de clientes e historial de compras</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Arqueo de caja y reportes de ventas</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Soporte por correo electrónico</span>
                  </div>
                </div>
              </div>

              <Button
                render={<Link href="/register?plan=starter" />}
                className="w-full h-11 rounded-2xl text-xs font-semibold border border-border/90 bg-card hover:bg-muted text-foreground transition-colors cursor-pointer"
              >
                Comenzar con Emprendedor
              </Button>
            </div>

            {/* PLAN 2: Negocio Pro (Destacado) */}
            <div className="relative p-7 sm:p-8 rounded-3xl bg-card border-2 border-emerald-500 shadow-xl flex flex-col justify-between space-y-6">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-bold uppercase tracking-wider shadow-sm">
                Más Popular · Recomendado
              </div>

              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  Empresas en Expansión
                </div>
                <h3 className="text-xl font-bold text-foreground">Plan Negocio Pro</h3>
                <p className="text-xs text-muted-foreground">
                  El paquete completo para almacenes, distribuidores, tiendas y restaurantes que buscan rentabilidad total.
                </p>

                <div className="pt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-foreground font-mono">
                      {annualBilling ? '$103.200' : '$129.000'}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">COP / mes</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {annualBilling ? 'Facturado anualmente ($1.238.400 COP/año)' : 'Facturación mes a mes'}
                  </span>
                </div>

                <div className="pt-4 border-t border-border/60 space-y-2.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Cajas POS y terminales ilimitadas</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Inventario ilimitado y multi-bodega</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Módulo de Créditos & Cuentas por Cobrar (CxC)</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Modo Restaurante con mesas y comandas</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Catálogo Web y tienda online sincronizada</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Reportes contables con exportación Excel/PDF</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Soporte prioritario vía WhatsApp</span>
                  </div>
                </div>
              </div>

              <Button
                render={<Link href="/register?plan=pro" />}
                className="w-full h-11 rounded-2xl text-xs font-semibold bg-gray-950 text-white dark:bg-white dark:text-gray-950 hover:bg-black transition-all shadow-md cursor-pointer"
              >
                Elegir Plan Negocio Pro
              </Button>
            </div>

            {/* PLAN 3: Corporativo / Enterprise */}
            <div className="p-7 sm:p-8 rounded-3xl bg-card border border-border/80 shadow-xs flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground">
                  Grandes Marcas & Cadenas
                </div>
                <h3 className="text-xl font-bold text-foreground">Plan Corporativo</h3>
                <p className="text-xs text-muted-foreground">
                  Infraestructura dedicada, multi-sucursal y soporte de ingeniería para operaciones complejas.
                </p>

                <div className="pt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-foreground font-mono">
                      {annualBilling ? '$199.200' : '$249.000'}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">COP / mes</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {annualBilling ? 'Facturado anualmente ($2.390.400 COP/año)' : 'Facturación mes a mes'}
                  </span>
                </div>

                <div className="pt-4 border-t border-border/60 space-y-2.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Todo lo incluido en el Plan Pro</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Multi-sucursal con consolidación contable</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Asistente de Negocio con Inteligencia Artificial</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Facturación electrónica DIAN avanzada ilimitada</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>API abierta y webhooks de integración</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Copias de seguridad continuas y SLA 99.9%</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Capacitación personalizada y asesor dedicado</span>
                  </div>
                </div>
              </div>

              <Button
                render={<Link href="/register?plan=enterprise" />}
                className="w-full h-11 rounded-2xl text-xs font-semibold border border-border/90 bg-card hover:bg-muted text-foreground transition-colors cursor-pointer"
              >
                Contactar para Corporativo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 7. PREGUNTAS FRECUENTES (FAQ)                            */}
      {/* ======================================================== */}
      <section id="faq" className="py-16 sm:py-24 border-t border-border/70">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono">
              Resolución de Dudas
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Preguntas Frecuentes sobre Nova ERP
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: '¿Cómo migro mis productos y clientes desde Excel u otro sistema como Alegra u Odoo?',
                a: 'Nova ERP cuenta con un asistente de importación masiva en formato CSV y Excel. Puedes exportar tu base de datos actual y cargarla en menos de 5 minutos conservando códigos de barras, listas de precios, stock actual y datos de clientes.',
              },
              {
                q: '¿Nova ERP incluye facturación electrónica reglamentaria DIAN?',
                a: 'Sí. El sistema genera facturas electrónicas con código QR reglamentario, CUFE y soporte para documentos equivalentes POS, además de permitir la exportación de comprobantes en PDF y tirillas térmicas para impresoras de 80mm y 58mm.',
              },
              {
                q: '¿Cómo se adapta el sistema si tengo un restaurante o cafetería?',
                a: 'Al registrar tu empresa y seleccionar el giro "Restaurantes & Gastronomía", la interfaz activa automáticamente el modo de comandas y mesas, deshabilitando ventas a crédito (ya que los restaurantes operan de contado) y optimizando el despacho rápido de comandas de cocina.',
              },
              {
                q: '¿Qué dispositivos o computadores necesito para utilizar Nova ERP?',
                a: 'Nova ERP es 100% basado en la nube. Funciona en cualquier computador (Windows, Mac, Linux), laptop, tablet iPad/Android o smartphone mediante navegador web moderno. Compatible con lectores de códigos de barra USB/Bluetooth e impresoras térmicas de recibos.',
              },
              {
                q: '¿Mis datos están protegidos ante apagones o robos de equipos físicos?',
                a: 'Totalmente. Al operar en la nube con réplicas continuas y base de datos Neon PostgreSQL con cifrado de nivel bancario, si tu computador se apaga o se daña, tu información permanece intacta y puedes continuar operando inmediatamente desde cualquier otro dispositivo.',
              },
              {
                q: '¿Tengo cláusula de permanencia o puedo cancelar en cualquier momento?',
                a: 'Cero permanencia. Si contratas el plan mensual puedes cancelar en cualquier momento con un solo clic. Si eliges el plan anual aprovechas el 20% de descuento y la garantía de satisfacción de 14 días.',
              },
            ].map((faq, idx) => {
              const isOpen = openFaq === idx
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-card border border-border/80 shadow-2xs overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-semibold text-xs sm:text-sm text-foreground hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 8. FOOTER INFORMATIVO & COPYRIGHT                        */}
      {/* ======================================================== */}
      <footer className="border-t border-border/70 py-12 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center sm:items-start gap-1">
            <NovaLogo size="sm" />
            <p className="text-xs text-muted-foreground mt-1">
              Plataforma ERP integral multi-negocio para pequeñas y medianas empresas.
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <a href="#para-que-sirve" className="hover:text-foreground transition-colors">
              Módulos
            </a>
            <a href="#precios" className="hover:text-foreground transition-colors">
              Precios
            </a>
            <Link href="/register" className="hover:text-foreground transition-colors">
              Registrar Empresa
            </Link>
            <button
              type="button"
              onClick={() => {
                setRecover(false)
                setError('')
                setIsLoginModalOpen(true)
              }}
              className="hover:text-foreground transition-colors cursor-pointer"
            >
              Iniciar Sesión
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 mt-8 border-t border-border/50 text-center text-xs text-muted-foreground/80">
          <p>Nova ERP &copy; {new Date().getFullYear()} anthra123x. Todos los derechos reservados.</p>
        </div>
      </footer>

      {/* ======================================================== */}
      {/* 9. MODAL FLOTANTE DE INICIO DE SESIÓN (LOGIN MODAL)     */}
      {/* ======================================================== */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          {/* Overlay oscuro de fondo */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsLoginModalOpen(false)}
          />

          {/* Tarjeta de Login */}
          <div className="relative z-10 w-full max-w-md p-6 sm:p-8 rounded-3xl bg-card border border-border/90 shadow-2xl space-y-5 animate-scale-in">
            {/* Botón de cerrar */}
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
              title="Cerrar ventana de acceso"
              aria-label="Cerrar modal de inicio de sesión"
            >
              <X className="h-4 w-4" />
            </button>

            {recover ? (
              /* Vista de Recuperación de Contraseña */
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setRecover(false)
                      setError('')
                      setRecoveryMessage('')
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1 cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Volver al login
                  </button>
                  <h3 className="text-xl font-bold tracking-tight text-foreground">Recuperar Contraseña</h3>
                  <p className="text-xs text-muted-foreground">
                    Ingresa tu correo registrado para recibir el enlace de acceso.
                  </p>
                </div>

                <form onSubmit={handleRecover} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="modal-recovery-email" className="text-xs font-semibold text-foreground">
                      Correo electrónico
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                      <Input
                        id="modal-recovery-email"
                        type="email"
                        placeholder="usuario@empresa.com"
                        required
                        disabled={recoveryLoading}
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        className="h-10 pl-10 rounded-xl bg-muted/40 border-border/80 text-xs shadow-2xs"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {recoveryMessage && (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-700 dark:text-emerald-400">
                      <MailCheck className="h-4 w-4 shrink-0" />
                      <span>{recoveryMessage}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-10 rounded-xl text-xs font-semibold bg-gray-950 text-white dark:bg-white dark:text-gray-950 hover:bg-black transition-all cursor-pointer shadow-xs"
                    disabled={recoveryLoading}
                  >
                    {recoveryLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enviando enlace...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4" />
                        Enviar instrucciones
                      </span>
                    )}
                  </Button>
                </form>
              </div>
            ) : (
              /* Vista de Formulario de Acceso */
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-2">
                    <NovaLogo size="sm" showWordmark={false} />
                    <span className="text-xs font-bold text-foreground">Acceso a Nova ERP</span>
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-foreground">Iniciar Sesión</h3>
                  <p className="text-xs text-muted-foreground">Ingresa tus credenciales para acceder a tu panel de control</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="modal-email" className="text-xs font-semibold text-foreground">
                      Correo electrónico
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                      <Input
                        id="modal-email"
                        name="email"
                        type="email"
                        placeholder="usuario@empresa.com"
                        required
                        disabled={isLoading}
                        className="h-10 pl-10 rounded-xl bg-muted/40 border-border/80 text-xs shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="modal-password" className="text-xs font-semibold text-foreground">
                        Contraseña
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          setRecover(true)
                          setError('')
                        }}
                        className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                      <Input
                        id="modal-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••••••"
                        required
                        disabled={isLoading}
                        className="h-10 pl-10 pr-10 rounded-xl bg-muted/40 border-border/80 text-xs shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        tabIndex={-1}
                        title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-0.5"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-10 rounded-xl text-xs font-semibold bg-gray-950 text-white dark:bg-white dark:text-gray-950 hover:bg-black transition-all cursor-pointer shadow-xs"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Accediendo...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <LogIn className="h-4 w-4" />
                        Acceder al sistema
                      </span>
                    )}
                  </Button>
                </form>

                <div className="pt-2 text-center border-t border-border/60">
                  <p className="text-xs text-muted-foreground">
                    ¿Tu empresa aún no tiene cuenta?{' '}
                    <Link
                      href="/register"
                      onClick={() => setIsLoginModalOpen(false)}
                      className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Registrar empresa</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
