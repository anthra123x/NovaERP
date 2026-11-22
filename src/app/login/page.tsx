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
  Sun,
  Moon,
  ChevronDown,
  Check,
  X,
  BarChart2,
  Activity,
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

  // Información adaptativa de sectores para la vista previa dinámica
  const sectorPreviews = {
    retail: {
      tag: 'Retail & Mostrador',
      title: 'Comercio General & Tiendas Físicas',
      desc: 'Cobro veloz con código de barras, sincronización de stock multi-bodega y tickets de caja automáticos.',
      metric1Label: 'Ventas de Hoy',
      metric1Value: '$18.450.000 COP',
      metric1Delta: '+14.2% vs ayer',
      metric2Label: 'Referencias en Stock',
      metric2Value: '1.420 artículos',
      metric3Label: 'Margen Promedio',
      metric3Value: '38.5%',
    },
    restaurant: {
      tag: 'Restaurantes & Comandas',
      title: 'Gastronomía, Bares & Cafeterías',
      desc: 'Gestión de mesas en vivo, comandas directas a cocina y operación 100% de contado sin créditos innecesarios.',
      metric1Label: 'Venta de Comandas',
      metric1Value: '$8.920.000 COP',
      metric1Delta: '+21.5% almuerzo y cena',
      metric2Label: 'Mesas Ocupadas',
      metric2Value: '16 de 18 activas',
      metric3Label: 'Rotación Promedio',
      metric3Value: '38 minutos',
    },
    tech: {
      tag: 'Tecnología & Taller',
      title: 'Servicio Técnico, Telefonía & Repuestos',
      desc: 'Seguimiento de órdenes de reparación por número IMEI, cotizaciones de repuestos y control de mano de obra.',
      metric1Label: 'Facturación Técnica',
      metric1Value: '$12.300.000 COP',
      metric1Delta: '+18.0% equipos entregados',
      metric2Label: 'Órdenes en Taller',
      metric2Value: '24 en proceso',
      metric3Label: 'Garantías Activas',
      metric3Value: '99.2% efectividad',
    },
    hardware: {
      tag: 'Ferreterías',
      title: 'Ferretería, Materiales & Construcción',
      desc: 'Manejo de bultos, fracciones, metros y despachos a crédito para maestros de obra con control de cartera.',
      metric1Label: 'Despachos por Volumen',
      metric1Value: '$24.600.000 COP',
      metric1Delta: '+9.8% cotizaciones cerradas',
      metric2Label: 'Cartera por Cobrar',
      metric2Value: '$9.450.000 COP',
      metric3Label: 'Control de Bodega',
      metric3Value: '100% auditado',
    },
    pharmacy: {
      tag: 'Droguerías & Farmacias',
      title: 'Droguerías, Medicamentos & Salud',
      desc: 'Control estricto de fechas de vencimiento, lotes sanitarios y dispensación ágil con alertas automáticas.',
      metric1Label: 'Dispensación Diaria',
      metric1Value: '$14.150.000 COP',
      metric1Delta: '+11.4% alta rotación',
      metric2Label: 'Control de Lotes',
      metric2Value: '0 alertas críticas',
      metric3Label: 'Ticket Promedio',
      metric3Value: '$42.500 COP',
    },
  }

  const currentPreview = sectorPreviews[activeSectorTab]

  return (
    <div className="relative min-h-dvh w-full bg-[#07080a] text-zinc-100 font-sans overflow-x-hidden selection:bg-[#a3e635] selection:text-black">
      {/* ======================================================== */}
      {/* FONDOS AMBIENTALES Y LUCES DECORATIVAS (GLOW RADIAL)    */}
      {/* Cumple estrictamente con las pruebas de rendimiento M3  */}
      {/* ======================================================== */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />
      <div className="absolute -top-32 -left-24 w-[560px] h-[560px] rounded-full blur-[48px] sm:blur-[72px] pointer-events-none animate-ambient-glow-1 motion-reduce:animate-none bg-gradient-to-tr from-[#a3e635]/15 via-[#84cc16]/10 to-transparent" />
      <div className="absolute top-[28%] -right-24 w-[620px] h-[620px] rounded-full blur-[48px] sm:blur-[72px] pointer-events-none animate-ambient-glow-2 motion-reduce:animate-none bg-gradient-to-bl from-[#a3e635]/15 via-emerald-500/10 to-transparent" />
      <div className="absolute top-[60%] -left-20 w-[480px] h-[480px] rounded-full blur-[48px] sm:blur-[72px] pointer-events-none animate-ambient-wander motion-reduce:animate-none bg-gradient-to-r from-[#a3e635]/10 via-teal-500/5 to-transparent" />
      <div className="absolute bottom-16 right-1/4 w-[400px] h-[400px] rounded-full blur-[48px] sm:blur-[72px] pointer-events-none animate-ambient-shine motion-reduce:animate-none bg-[#a3e635]/10" />

      {/* ======================================================== */}
      {/* 1. HEADER / NAVBAR (ESTILO TRUSTDATA CON BOTONES PILL)  */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-[#07080a]/80 backdrop-blur-md transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 group cursor-pointer">
            <NovaLogo size="sm" />
          </Link>

          {/* Enlaces de Navegación Centrados */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-zinc-400">
            <a href="#modulos" className="hover:text-white transition-colors">
              Módulos
            </a>
            <a href="#sectores" className="hover:text-white transition-colors">
              Sectores
            </a>
            <a href="#inteligencia" className="hover:text-white transition-colors">
              Inteligencia
            </a>
            <a href="#precios" className="hover:text-white transition-colors">
              Precios
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              FAQ
            </a>
          </nav>

          {/* Acciones de la Cabecera */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-full border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Cambiar tema' : 'Cambiar tema'}
              aria-label="Cambiar tema visual"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-[#a3e635]" /> : <Moon className="h-4 w-4 text-zinc-300" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setRecover(false)
                setError('')
                setIsLoginModalOpen(true)
              }}
              className="px-5 py-2 rounded-full border border-zinc-700/80 bg-zinc-900/70 hover:bg-zinc-800 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Iniciar Sesión
            </button>

            <Button
              render={<Link href="/register" />}
              size="sm"
              className="hidden sm:inline-flex h-9 px-5 rounded-full text-xs font-semibold bg-[#a3e635] text-black hover:bg-[#bef264] transition-all cursor-pointer shadow-[0_0_20px_rgba(163,230,53,0.2)]"
            >
              <span>Comenzar</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. HERO PRINCIPAL (ESTILO TRUSTDATA CON TIPOGRAFÍA WIDE) */}
      {/* ======================================================== */}
      <section className="relative pt-16 pb-12 sm:pt-24 sm:pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto space-y-6">
            {/* Pill Badge Superior con Acento Verde Lima */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs font-medium text-zinc-300 shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-[#a3e635] shadow-[0_0_8px_#a3e635]" />
              <span className="text-zinc-200">Plataforma ERP Inteligente · Control Total en Cloud</span>
            </div>

            {/* Titular Masivo en 2 Líneas con Acento Lima */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-medium tracking-tight text-white leading-[1.08]">
              Sistemas Inteligentes, Gestión Fluida,{' '}
              <span className="text-[#a3e635]">Crecimiento Eficiente</span>
            </h1>

            {/* Subtítulo Conciso y Sofisticado */}
            <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Mantén el control de tus ventas de mostrador, inventario en tiempo real, facturación electrónica y finanzas en una sola plataforma de alto rendimiento.
            </p>

            {/* Botones de Conversión en Cápsula (Pills) */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                render={<Link href="/register" />}
                size="lg"
                className="w-full sm:w-auto h-12 px-8 rounded-full text-sm font-semibold bg-[#a3e635] text-black hover:bg-[#bef264] transition-all shadow-[0_0_30px_rgba(163,230,53,0.3)] cursor-pointer"
              >
                <span>Empezar Ahora</span>
              </Button>

              <button
                type="button"
                onClick={() => {
                  setRecover(false)
                  setError('')
                  setIsLoginModalOpen(true)
                }}
                className="w-full sm:w-auto h-12 px-8 rounded-full border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-white text-sm font-medium transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Iniciar Sesión</span>
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 3. HERO VISUAL: DECK BENTO CON HALO DE ECLIPSE LIMA      */}
          {/* Inspirado en la composición de tarjetas de TrustData     */}
          {/* ======================================================== */}
          <div className="relative mt-16 sm:mt-20 max-w-6xl mx-auto">
            {/* Halo de Eclipse / Resplandor Circular Detrás de las Tarjetas */}
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-[85%] h-56 rounded-full bg-gradient-to-b from-[#a3e635]/20 via-[#a3e635]/5 to-transparent blur-3xl pointer-events-none" />

            {/* Arco decorativo de luz superior */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-[#a3e635]/60 to-transparent pointer-events-none" />

            {/* Deck de 3 Tarjetas Bento */}
            <div className="relative grid grid-cols-1 md:grid-cols-12 gap-5 z-10">
              {/* Tarjeta 1: Visión General de Operaciones (3 cols) */}
              <div className="md:col-span-3 rounded-3xl bg-[#0f1013] border border-zinc-800/80 p-6 flex flex-col justify-between space-y-4 hover:border-zinc-700 transition-colors shadow-xl">
                <div className="space-y-3">
                  <div className="h-9 w-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#a3e635]">
                    <Activity className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-semibold text-white leading-snug">
                    Visión total de tus operaciones
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Un resumen claro y detallado de cada movimiento, venta de caja y stock en tiempo real.
                  </p>
                </div>
                <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
                  <span>Estado de Red</span>
                  <span className="text-[#a3e635] font-mono flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#a3e635] animate-pulse" />
                    En línea
                  </span>
                </div>
              </div>

              {/* Tarjeta 2: Estadísticas Consolidadas (3 cols) */}
              <div className="md:col-span-3 rounded-3xl bg-[#0f1013] border border-zinc-800/80 p-6 flex flex-col justify-between space-y-4 hover:border-zinc-700 transition-colors shadow-xl">
                <div className="space-y-3">
                  <div className="h-9 w-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#a3e635]">
                    <BarChart2 className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-semibold text-white leading-snug">
                    Estadísticas completas del negocio
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Métricas de rentabilidad bruta y neta calculadas automáticamente sin fórmulas complejas.
                  </p>
                </div>
                <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
                  <span>Márgenes</span>
                  <span className="text-white font-mono font-semibold">+38.5% Neto</span>
                </div>
              </div>

              {/* Tarjeta 3: Meta de Ventas con Gráfico de Área en Verde Lima (6 cols) */}
              <div className="md:col-span-6 rounded-3xl bg-[#0f1013] border border-zinc-800/80 p-6 flex flex-col justify-between hover:border-zinc-700 transition-colors shadow-xl">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-white">Meta de ventas</h3>
                    <p className="text-xs text-zinc-400">Rendimiento trimestral proyectado</p>
                  </div>
                  <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-full p-1 text-[11px] text-zinc-400">
                    <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-white font-medium">Año</span>
                    <span className="px-2.5 py-0.5 hover:text-white cursor-pointer">Mes</span>
                    <span className="px-2.5 py-0.5 hover:text-white cursor-pointer">Trim</span>
                  </div>
                </div>

                {/* Gráfico SVG de Área y Curva en Verde Lima */}
                <div className="relative w-full h-36 pt-2">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 500 130" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="limeChartArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a3e635" stopOpacity="0.35" />
                        <stop offset="60%" stopColor="#a3e635" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="#a3e635" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* Guías verticales punteadas para trimestres */}
                    <line x1="125" y1="0" x2="125" y2="120" stroke="#27272a" strokeDasharray="3 3" />
                    <line x1="250" y1="0" x2="250" y2="120" stroke="#27272a" strokeDasharray="3 3" />
                    <line x1="375" y1="0" x2="375" y2="120" stroke="#27272a" strokeDasharray="3 3" />

                    {/* Área degradada */}
                    <path
                      d="M 0,110 Q 50,105 100,90 T 200,85 T 300,45 T 400,65 T 500,20 L 500,130 L 0,130 Z"
                      fill="url(#limeChartArea)"
                    />

                    {/* Línea de trazo brillante en Verde Lima */}
                    <path
                      d="M 0,110 Q 50,105 100,90 T 200,85 T 300,45 T 400,65 T 500,20"
                      fill="none"
                      stroke="#a3e635"
                      strokeWidth="2.5"
                    />

                    {/* Punto culminante en el pico más alto */}
                    <circle cx="500" cy="20" r="4.5" fill="#a3e635" />
                    <circle cx="300" cy="45" r="4" fill="#a3e635" />
                  </svg>

                  {/* Etiquetas de Trimestre en el eje X */}
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-2">
                    <span>Q1 Ene-Mar</span>
                    <span>Q2 Abr-Jun</span>
                    <span>Q3 Jul-Sep</span>
                    <span>Q4 Oct-Dic</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. SECCIÓN: CLARIDAD Y CONTROL EN CADA CLIC             */}
      {/* Dos columnas: Texto editorial izq + Selector interactivo */}
      {/* ======================================================== */}
      <section id="sectores" className="py-20 sm:py-28 border-t border-zinc-800/80 bg-[#07080a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            {/* Columna Izquierda: Encabezado Editorial y Botón Pill */}
            <div className="lg:col-span-5 space-y-6">
              <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-white leading-[1.12]">
                Claridad y Control en Cada Clic —{' '}
                <span className="text-[#a3e635]">Optimiza, Mide y Crece con Facilidad</span>
              </h2>

              <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
                Simplifica las operaciones de mostrador, obtén métricas clave al instante y acelera el crecimiento con automatizaciones diseñadas para que tu negocio opere con la máxima fluidez.
              </p>

              <div>
                <Button
                  render={<Link href="/register" />}
                  className="h-11 px-7 rounded-full text-xs font-semibold bg-[#a3e635] text-black hover:bg-[#bef264] transition-all cursor-pointer shadow-[0_0_20px_rgba(163,230,53,0.25)]"
                >
                  <span>Tomar el Control</span>
                </Button>
              </div>
            </div>

            {/* Columna Derecha: Tarjeta Interactiva con Pastillas de Categoría */}
            <div className="lg:col-span-7 space-y-5">
              {/* Contenedor Superior con Selector de Píldoras */}
              <div className="rounded-3xl bg-[#0f1013] border border-zinc-800/80 p-6 space-y-5 shadow-xl">
                {/* Píldoras de Categorías / Sectores */}
                <div className="flex flex-wrap gap-2">
                  {(['retail', 'restaurant', 'tech', 'hardware', 'pharmacy'] as const).map((sec) => {
                    const info = sectorPreviews[sec]
                    const active = activeSectorTab === sec
                    return (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setActiveSectorTab(sec)}
                        className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                          active
                            ? 'bg-white text-black font-semibold shadow-xs'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                        }`}
                      >
                        {info.tag}
                      </button>
                    )
                  })}
                </div>

                {/* Detalle del Sector Activo */}
                <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-white">{currentPreview.title}</h3>
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#a3e635]/10 text-[#a3e635] border border-[#a3e635]/20">
                      Adaptado
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {currentPreview.desc}
                  </p>

                  {/* 3 Métricas del Sector */}
                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-zinc-800/60">
                    <div>
                      <span className="text-[10px] uppercase font-mono text-zinc-500 block">
                        {currentPreview.metric1Label}
                      </span>
                      <span className="text-sm font-bold font-mono text-white mt-0.5 block">
                        {currentPreview.metric1Value}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono text-zinc-500 block">
                        {currentPreview.metric2Label}
                      </span>
                      <span className="text-sm font-bold font-mono text-white mt-0.5 block">
                        {currentPreview.metric2Value}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono text-zinc-500 block">
                        {currentPreview.metric3Label}
                      </span>
                      <span className="text-sm font-bold font-mono text-[#a3e635] mt-0.5 block">
                        {currentPreview.metric3Value}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fila Inferior de Micro-Tarjetas (Conversión & Analítica) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-[#0f1013] border border-zinc-800/80 p-5 space-y-2 hover:border-zinc-700 transition-colors">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#a3e635]" />
                    <span>Conversión POS</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Acelera el paso por caja con tickets térmicos y facturas automáticas sin demoras.
                  </p>
                  <a href="#modulos" className="inline-block text-xs font-medium text-[#a3e635] hover:underline pt-1">
                    Conocer más &rarr;
                  </a>
                </div>

                <div className="rounded-2xl bg-[#0f1013] border border-zinc-800/80 p-5 space-y-2 hover:border-zinc-700 transition-colors">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#a3e635]" />
                    <span>Analítica DIAN</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Cálculo automático de utilidades netas, IVA y arqueos de turno sin margen de error.
                  </p>
                  <a href="#precios" className="inline-block text-xs font-medium text-[#a3e635] hover:underline pt-1">
                    Conocer más &rarr;
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 5. SECCIÓN: TU NEGOCIO RESPALDADO POR INTELIGENCIA      */}
      {/* 3 Bento Cards Clave: Automatización (Lime), Analítica,  */}
      {/* y Estrategia Comercial (Donut chart)                    */}
      {/* ======================================================== */}
      <section id="inteligencia" className="py-20 sm:py-28 border-t border-zinc-800/80 bg-[#07080a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-white leading-tight">
              Tu Negocio, Respaldado por Inteligencia
            </h2>
            <p className="text-sm sm:text-base text-zinc-400">
              Arquitectura diseñada para reducir la fricción diaria y tomar decisiones basadas en datos reales.
            </p>
          </div>

          {/* Tres Tarjetas Bento Principales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* Tarjeta 1: Automatización de Procesos (FONDO LIMA COMPLETO) */}
            <div className="rounded-3xl bg-[#a3e635] text-black p-8 flex flex-col justify-between space-y-6 shadow-xl">
              <div className="space-y-4">
                <h3 className="text-2xl font-bold tracking-tight text-black">
                  Automatización de Procesos
                </h3>
                <p className="text-xs sm:text-sm text-zinc-900 leading-relaxed font-medium">
                  Automatizamos las tareas operativas de mostrador, cálculo de impuestos e inventarios para reducir la carga de trabajo y garantizar precisión.
                </p>
              </div>

              {/* Gráfico de Barras Negras Redondeadas en Contraste */}
              <div className="pt-6">
                <div className="h-28 flex items-end justify-between gap-3 px-2">
                  <div className="w-full bg-black/85 rounded-t-full h-16" />
                  <div className="w-full bg-black/85 rounded-t-full h-24" />
                  <div className="w-full bg-black/85 rounded-t-full h-12" />
                  <div className="w-full bg-black/85 rounded-t-full h-28" />
                  <div className="w-full bg-black/85 rounded-t-full h-20" />
                </div>
              </div>
            </div>

            {/* Tarjeta 2: Analítica de Rendimiento (Tarjeta Oscura con Polilínea Blanca) */}
            <div className="rounded-3xl bg-[#0f1013] border border-zinc-800/80 p-8 flex flex-col justify-between space-y-6 shadow-xl hover:border-zinc-700 transition-colors">
              <div className="space-y-4">
                <h3 className="text-2xl font-bold tracking-tight text-white">
                  Analítica de Rendimiento
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  Monitorea en tiempo real los ingresos por turno, rotación de artículos y comportamiento de clientes para optimizar márgenes operativos.
                </p>
              </div>

              {/* Gráfico de Polilínea Blanca de Tendencia */}
              <div className="pt-6">
                <div className="h-28 flex items-end">
                  <svg className="w-full h-24 overflow-visible" viewBox="0 0 300 80">
                    <path
                      d="M 0,75 L 40,65 L 80,70 L 120,40 L 160,55 L 200,20 L 240,45 L 270,10 L 300,30"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="270" cy="10" r="3.5" fill="#ffffff" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Tarjeta 3: Estrategia Comercial (Tarjeta Oscura con Gráfico de Anillo Donut Lima) */}
            <div className="rounded-3xl bg-[#0f1013] border border-zinc-800/80 p-8 flex flex-col justify-between space-y-6 shadow-xl hover:border-zinc-700 transition-colors">
              <div className="space-y-4">
                <h3 className="text-2xl font-bold tracking-tight text-white">
                  Estrategia Comercial
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  Desde proyección de compras hasta fidelización de clientes con crédito y catálogo web omnicanal listo para recibir pedidos.
                </p>
              </div>

              {/* Gráfico de Anillo Donut en Verde Lima */}
              <div className="pt-4 flex flex-col items-center">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#27272a"
                      strokeWidth="12"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#a3e635"
                      strokeWidth="12"
                      strokeDasharray="238.76"
                      strokeDashoffset="65"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                {/* Leyenda de Donut Chart */}
                <div className="flex items-center gap-5 text-xs mt-3 text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#a3e635]" />
                    <span>Completado (75%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-zinc-700" />
                    <span>Pendiente</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 6. MÓDULOS ESENCIALES DEL SISTEMA (¿DE QUÉ VA EL ERP?)  */}
      {/* ======================================================== */}
      <section id="modulos" className="py-20 sm:py-28 border-t border-zinc-800/80 bg-[#07080a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
            <span className="text-xs font-mono uppercase tracking-wider text-[#a3e635]">
              Arquitectura Modular
            </span>
            <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-white">
              Todo lo que tu empresa necesita en un solo lugar
            </h2>
            <p className="text-sm sm:text-base text-zinc-400">
              Elimina hojas de Excel dispersas y programas aislados. Nova ERP unifica toda tu operación en tiempo real.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-7 rounded-3xl bg-[#0f1013] border border-zinc-800/80 space-y-3 hover:border-zinc-700 transition-colors">
              <span className="text-xs font-mono text-[#a3e635]">01 / Mostrador</span>
              <h3 className="text-lg font-semibold text-white">Punto de Venta POS & DIAN</h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Cobro ágil con lector de código de barras, atajos de teclado, tirillas térmicas e impresión de facturas electrónicas.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-[#0f1013] border border-zinc-800/80 space-y-3 hover:border-zinc-700 transition-colors">
              <span className="text-xs font-mono text-[#a3e635]">02 / Stock</span>
              <h3 className="text-lg font-semibold text-white">Inventario Multi-bodega</h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Control exacto de existencias, traslados entre sedes, mermas, alertas de stock mínimo y control de costos de reposición.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-[#0f1013] border border-zinc-800/80 space-y-3 hover:border-zinc-700 transition-colors">
              <span className="text-xs font-mono text-[#a3e635]">03 / Cartera</span>
              <h3 className="text-lg font-semibold text-white">Créditos & Cuentas por Cobrar</h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Líneas de crédito a clientes recurrentes, fechas de vencimiento, abonos parciales y estados de cuenta en PDF.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-[#0f1013] border border-zinc-800/80 space-y-3 hover:border-zinc-700 transition-colors">
              <span className="text-xs font-mono text-[#a3e635]">04 / Caja</span>
              <h3 className="text-lg font-semibold text-white">Finanzas & Rentabilidad Real</h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Arqueos de caja por turno, costos de compra vs. precios de venta, utilidad neta por producto y libro contable diario.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-[#0f1013] border border-zinc-800/80 space-y-3 hover:border-zinc-700 transition-colors">
              <span className="text-xs font-mono text-[#a3e635]">05 / Web</span>
              <h3 className="text-lg font-semibold text-white">Catálogo Online Omnicanal</h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Tu tienda digital conectada a la misma base de datos física. Los pedidos web descuentan inventario sin sobreventas.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-[#0f1013] border border-zinc-800/80 space-y-3 hover:border-zinc-700 transition-colors">
              <span className="text-xs font-mono text-[#a3e635]">06 / IA</span>
              <h3 className="text-lg font-semibold text-white">Copiloto de Negocio Inteligente</h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Consultas operativas inmediatas, detección de artículos estancados y recomendaciones comerciales basadas en tus ventas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 7. PLANES Y PRECIOS DE LICENCIAS (TRANSPARENTE Y SOBRIO)*/}
      {/* ======================================================== */}
      <section id="precios" className="py-20 sm:py-28 border-t border-zinc-800/80 bg-[#07080a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-12">
            <span className="text-xs font-mono uppercase tracking-wider text-[#a3e635]">
              Licenciamiento
            </span>
            <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-white">
              Precios claros, sin costos ocultos
            </h2>
            <p className="text-sm sm:text-base text-zinc-400">
              Escoge el plan que acompaña el tamaño de tu empresa. Cancela o escala cuando lo necesites.
            </p>

            {/* Alternador de Facturación Mensual / Anual */}
            <div className="pt-4 flex items-center justify-center gap-3">
              <span className={`text-xs font-medium ${!annualBilling ? 'text-white' : 'text-zinc-500'}`}>
                Mensual
              </span>
              <button
                type="button"
                onClick={() => setAnnualBilling((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  annualBilling ? 'bg-[#a3e635]' : 'bg-zinc-800'
                }`}
                aria-label="Alternar facturación anual"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                    annualBilling ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-xs font-medium flex items-center gap-1.5 ${annualBilling ? 'text-white' : 'text-zinc-500'}`}>
                <span>Anual</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#a3e635]/20 text-[#a3e635] border border-[#a3e635]/30">
                  Ahorra 20%
                </span>
              </span>
            </div>
          </div>

          {/* Tres Tarjetas de Precios en Obsidian Noir */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
            {/* PLAN 1: Emprendedor / Starter */}
            <div className="rounded-3xl bg-[#0f1013] border border-zinc-800/80 p-8 flex flex-col justify-between space-y-6 hover:border-zinc-700 transition-colors">
              <div className="space-y-4">
                <span className="text-xs font-mono text-zinc-400 block">Comercio Inicial</span>
                <h3 className="text-xl font-bold text-white">Starter</h3>
                <p className="text-xs text-zinc-400">
                  Ideal para tiendas de mostrador y pequeños negocios que buscan digitalizar sus cobros.
                </p>

                <div className="pt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold font-mono text-white">
                      {annualBilling ? '$47.200' : '$59.000'}
                    </span>
                    <span className="text-xs text-zinc-400 font-medium">COP / mes</span>
                  </div>
                  <span className="text-[11px] text-zinc-500 block mt-1">
                    {annualBilling ? 'Facturado anualmente ($566.400 COP)' : 'Facturación mes a mes'}
                  </span>
                </div>

                <div className="pt-4 border-t border-zinc-800/60 space-y-2.5 text-xs text-zinc-300">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#a3e635] shrink-0" />
                    <span>1 Terminal POS de mostrador</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#a3e635] shrink-0" />
                    <span>Hasta 500 referencias en catálogo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#a3e635] shrink-0" />
                    <span>Tickets POS y facturas ilimitadas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#a3e635] shrink-0" />
                    <span>Arqueos de caja diarios</span>
                  </div>
                </div>
              </div>

              <Button
                render={<Link href="/register?plan=starter" />}
                className="w-full h-11 rounded-full text-xs font-semibold border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-white transition-colors cursor-pointer"
              >
                Elegir Starter
              </Button>
            </div>

            {/* PLAN 2: Negocio Pro (Destacado con Borde Lima) */}
            <div className="relative rounded-3xl bg-[#0f1013] border-2 border-[#a3e635] p-8 flex flex-col justify-between space-y-6 shadow-[0_0_40px_rgba(163,230,53,0.15)]">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-0.5 rounded-full bg-[#a3e635] text-black text-[11px] font-bold uppercase tracking-wider shadow-sm">
                Más Elegido
              </div>

              <div className="space-y-4">
                <span className="text-xs font-mono text-[#a3e635] block">Empresas en Expansión</span>
                <h3 className="text-xl font-bold text-white">Negocio Pro</h3>
                <p className="text-xs text-zinc-400">
                  Para comercios, restaurantes y distribuidores que requieren inventario ilimitado y créditos.
                </p>

                <div className="pt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold font-mono text-white">
                      {annualBilling ? '$103.200' : '$129.000'}
                    </span>
                    <span className="text-xs text-zinc-400 font-medium">COP / mes</span>
                  </div>
                  <span className="text-[11px] text-zinc-500 block mt-1">
                    {annualBilling ? 'Facturado anualmente ($1.238.400 COP)' : 'Facturación mes a mes'}
                  </span>
                </div>

                <div className="pt-4 border-t border-zinc-800/60 space-y-2.5 text-xs text-zinc-200">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#a3e635] shrink-0" />
                    <span>Cajas POS y terminales ilimitadas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#a3e635] shrink-0" />
                    <span>Inventario ilimitado y multi-bodega</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#a3e635] shrink-0" />
                    <span>Módulo de Créditos & Cartera CxC</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#a3e635] shrink-0" />
                    <span>Modo Restaurante (Comandas y Mesas)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#a3e635] shrink-0" />
                    <span>Catálogo Web sincronizado</span>
                  </div>
                </div>
              </div>

              <Button
                render={<Link href="/register?plan=pro" />}
                className="w-full h-11 rounded-full text-xs font-semibold bg-[#a3e635] text-black hover:bg-[#bef264] transition-all cursor-pointer shadow-[0_0_20px_rgba(163,230,53,0.3)]"
              >
                Comenzar con Pro
              </Button>
            </div>

            {/* PLAN 3: Corporativo / Enterprise */}
            <div className="rounded-3xl bg-[#0f1013] border border-zinc-800/80 p-8 flex flex-col justify-between space-y-6 hover:border-zinc-700 transition-colors">
              <div className="space-y-4">
                <span className="text-xs font-mono text-zinc-400 block">Cadenas & Franquicias</span>
                <h3 className="text-xl font-bold text-white">Enterprise</h3>
                <p className="text-xs text-zinc-400">
                  Multi-sucursal consolidado, copias de seguridad continuas y soporte de ingeniería dedicado.
                </p>

                <div className="pt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold font-mono text-white">
                      {annualBilling ? '$199.200' : '$249.000'}
                    </span>
                    <span className="text-xs text-zinc-400 font-medium">COP / mes</span>
                  </div>
                  <span className="text-[11px] text-zinc-500 block mt-1">
                    {annualBilling ? 'Facturado anualmente ($2.390.400 COP)' : 'Facturación mes a mes'}
                  </span>
                </div>

                <div className="pt-4 border-t border-zinc-800/60 space-y-2.5 text-xs text-zinc-300">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#a3e635] shrink-0" />
                    <span>Todo lo incluido en el Plan Pro</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#a3e635] shrink-0" />
                    <span>Multi-sucursal con consolidación</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#a3e635] shrink-0" />
                    <span>Copiloto IA para análisis de ventas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#a3e635] shrink-0" />
                    <span>Facturación DIAN ilimitada</span>
                  </div>
                </div>
              </div>

              <Button
                render={<Link href="/register?plan=enterprise" />}
                className="w-full h-11 rounded-full text-xs font-semibold border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-white transition-colors cursor-pointer"
              >
                Contactar Enterprise
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 8. PREGUNTAS FRECUENTES (FAQ MINIMALISTA)                */}
      {/* ======================================================== */}
      <section id="faq" className="py-20 sm:py-28 border-t border-zinc-800/80 bg-[#07080a]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-12">
            <h2 className="text-2xl sm:text-4xl font-medium tracking-tight text-white">
              Preguntas Frecuentes
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: '¿Cómo migro mis productos y clientes desde Excel u otro sistema como Alegra u Odoo?',
                a: 'Nova ERP cuenta con importador masivo en formato CSV y Excel. Cargas tu base de datos en pocos minutos conservando códigos de barra, precios, stock actual y contactos.',
              },
              {
                q: '¿El sistema genera facturas electrónicas válidas ante la DIAN?',
                a: 'Sí. Emite comprobantes con CUFE, código QR y soporte para documentos equivalentes POS en tirillas térmicas (80mm y 58mm) o formatos PDF tamaño carta.',
              },
              {
                q: '¿Cómo se adapta el sistema a un restaurante o cafetería?',
                a: 'Al seleccionar el giro "Restaurantes", se activa el módulo de mesas y comandas a cocina, y se desactivan las ventas a crédito para optimizar la rapidez del servicio de contado.',
              },
              {
                q: '¿Qué requerimientos técnicos necesito para operar?',
                a: 'Es 100% cloud. Opera desde cualquier computador, tablet o smartphone en navegadores modernos, con compatibilidad nativa para lectores de códigos de barras USB/Bluetooth.',
              },
              {
                q: '¿Puedo cancelar mi plan en cualquier momento?',
                a: 'Cero cláusulas de permanencia. En el plan mensual puedes cancelar en cualquier momento con un clic. En el plan anual disfrutas del 20% de descuento y garantía de 14 días.',
              },
            ].map((faq, idx) => {
              const isOpen = openFaq === idx
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-[#0f1013] border border-zinc-800/80 overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-medium text-xs sm:text-sm text-white hover:bg-zinc-900/40 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-zinc-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[#a3e635]' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-zinc-400 leading-relaxed border-t border-zinc-800/40 pt-3">
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
      {/* 9. FOOTER MINIMALISTA & COPYRIGHT                         */}
      {/* ======================================================== */}
      <footer className="border-t border-zinc-800/80 py-12 bg-[#07080a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center sm:items-start gap-1">
            <NovaLogo size="sm" />
            <p className="text-xs text-zinc-500 mt-1">
              Plataforma ERP moderna de gestión comercial y punto de venta.
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs text-zinc-400">
            <a href="#modulos" className="hover:text-white transition-colors">
              Módulos
            </a>
            <a href="#precios" className="hover:text-white transition-colors">
              Precios
            </a>
            <Link href="/register" className="hover:text-white transition-colors">
              Registrar Empresa
            </Link>
            <button
              type="button"
              onClick={() => {
                setRecover(false)
                setError('')
                setIsLoginModalOpen(true)
              }}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Iniciar Sesión
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 mt-8 border-t border-zinc-900 text-center text-xs text-zinc-600">
          <p>Nova ERP &copy; {new Date().getFullYear()} anthra123x. Todos los derechos reservados.</p>
        </div>
      </footer>

      {/* ======================================================== */}
      {/* 10. MODAL FLOTANTE DE INICIO DE SESIÓN (LOGIN MODAL)     */}
      {/* ======================================================== */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          {/* Fondo oscuro con desenfoque suave */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
            onClick={() => setIsLoginModalOpen(false)}
          />

          {/* Tarjeta de Login en Obsidian Noir */}
          <div className="relative z-10 w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#0f1013] border border-zinc-800 shadow-2xl space-y-5 animate-scale-in">
            {/* Botón de cerrar en píldora */}
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
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
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors mb-1 cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Volver al login
                  </button>
                  <h3 className="text-xl font-bold tracking-tight text-white">Recuperar Contraseña</h3>
                  <p className="text-xs text-zinc-400">
                    Ingresa tu correo registrado para recibir el enlace de acceso.
                  </p>
                </div>

                <form onSubmit={handleRecover} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="modal-recovery-email" className="text-xs font-semibold text-zinc-300">
                      Correo electrónico
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                      <Input
                        id="modal-recovery-email"
                        type="email"
                        placeholder="usuario@empresa.com"
                        required
                        disabled={recoveryLoading}
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        className="h-10 pl-10 rounded-full bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 text-xs shadow-2xs"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-400">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {recoveryMessage && (
                    <div className="flex items-center gap-2 rounded-xl bg-[#a3e635]/10 border border-[#a3e635]/20 p-2.5 text-xs text-[#a3e635]">
                      <MailCheck className="h-4 w-4 shrink-0" />
                      <span>{recoveryMessage}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-10 rounded-full text-xs font-semibold bg-[#a3e635] text-black hover:bg-[#bef264] transition-all cursor-pointer shadow-[0_0_15px_rgba(163,230,53,0.2)]"
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
                    <span className="text-xs font-mono text-zinc-400">Acceso a Nova ERP</span>
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-white">Iniciar Sesión</h3>
                  <p className="text-xs text-zinc-400">Ingresa tus credenciales para acceder al sistema</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="modal-email" className="text-xs font-semibold text-zinc-300">
                      Correo electrónico
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                      <Input
                        id="modal-email"
                        name="email"
                        type="email"
                        placeholder="usuario@empresa.com"
                        required
                        disabled={isLoading}
                        className="h-10 pl-10 rounded-full bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 text-xs shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="modal-password" className="text-xs font-semibold text-zinc-300">
                        Contraseña
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          setRecover(true)
                          setError('')
                        }}
                        className="text-[11px] font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                      <Input
                        id="modal-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••••••"
                        required
                        disabled={isLoading}
                        className="h-10 pl-10 pr-10 rounded-full bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 text-xs shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        tabIndex={-1}
                        title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors cursor-pointer p-0.5"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-400">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-10 rounded-full text-xs font-semibold bg-[#a3e635] text-black hover:bg-[#bef264] transition-all cursor-pointer shadow-[0_0_20px_rgba(163,230,53,0.25)]"
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

                <div className="pt-2 text-center border-t border-zinc-800/60">
                  <p className="text-xs text-zinc-400">
                    ¿Tu empresa aún no tiene cuenta?{' '}
                    <Link
                      href="/register"
                      onClick={() => setIsLoginModalOpen(false)}
                      className="font-semibold text-[#a3e635] hover:underline inline-flex items-center gap-1"
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
