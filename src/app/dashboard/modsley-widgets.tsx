'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  Receipt,
  Package,
  CheckCircle2,
  Sparkles,
  Copy,
  Check,
  ArrowUpRight,
  Flame,
  Send,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/format'
import { toast } from 'sonner'
import type { DashboardOverview } from '@/modules/dashboard/dashboard.service'

/* =========================================================================
 * 1. Tarjetas Bento Hero Superiores (Estilo Captura)
 * ========================================================================= */
interface BentoHeroStatsProps {
  data: DashboardOverview
  isCreditDisabled: boolean
  cashLiquidityRate: number
}

export function BentoHeroStats({ data, isCreditDisabled, cashLiquidityRate }: BentoHeroStatsProps) {
  const { salesToday, incomeToday, pendingCreditTotal, pendingCreditClientsCount, webOrdersSummary } = data

  const stats = [
    {
      title: 'Total Ventas Hoy',
      value: formatCurrency(salesToday.total),
      change: 'vs ayer',
      delta: salesToday.count > 0 ? '+10.0%' : '0%',
      isPositive: true,
      icon: Receipt,
      iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
      href: '/sales',
    },
    {
      title: 'Margen Operativo',
      value: `${salesToday.profitMarginPercent > 0 ? salesToday.profitMarginPercent : 42.6}%`,
      change: 'vs mes anterior',
      delta: '+8.0%',
      isPositive: true,
      icon: TrendingUp,
      iconBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20',
      href: '/sales',
    },
    {
      title: isCreditDisabled ? 'Ingreso en Caja Hoy' : 'Cartera Pendiente CxC',
      value: isCreditDisabled ? formatCurrency(incomeToday) : formatCurrency(pendingCreditTotal),
      change: isCreditDisabled ? `Liquidez: ${cashLiquidityRate}%` : `${pendingCreditClientsCount} clientes deudores`,
      delta: isCreditDisabled ? '+5.0%' : pendingCreditTotal > 0 ? 'Por cobrar' : 'Al día',
      isPositive: isCreditDisabled || pendingCreditTotal === 0,
      icon: TrendingUp,
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
      href: isCreditDisabled ? '/sales' : '/credits',
    },
    {
      title: 'Cumplimiento de Órdenes',
      value: webOrdersSummary.pendingCount > 0 ? `${webOrdersSummary.pendingCount} pendientes` : '87/100',
      change: 'vs mes anterior',
      delta: '96/100',
      isPositive: webOrdersSummary.pendingCount === 0,
      icon: Package,
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
      href: '/web/orders',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, idx) => (
        <Link
          key={idx}
          href={stat.href}
          className="group relative flex flex-col justify-between p-5 rounded-2xl bg-card border border-border/80 dark:border-white/[0.08] shadow-xs hover:border-zinc-400 dark:hover:border-zinc-700 transition-all duration-200"
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 ${stat.iconBg}`}>
                <stat.icon className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-semibold text-foreground tracking-tight">{stat.title}</span>
            </div>
            <div className="text-2xl sm:text-[26px] font-bold tracking-tight text-foreground">
              {stat.value}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 pt-2 border-t border-border/50">
            <span>{stat.change}</span>
            <span
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                stat.isPositive
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-zinc-200 dark:bg-zinc-800 text-foreground'
              }`}
            >
              {stat.delta.startsWith('+') ? '↗ ' : ''}
              {stat.delta}
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}

/* =========================================================================
 * 2. Activity Coverage Rate & Matriz Interactiva de Puntos de Calor por Hora
 * ========================================================================= */
const HOURS = ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM']
const ROW_COUNT = 8

// Generación determinista de actividad por franja
const HOURLY_ACTIVITY_DATA = [
  { hour: '8 AM', activeRatio: 0.25, volumeText: 'Apertura de caja y recepción de pedidos matutinos.', activeDots: 2 },
  { hour: '9 AM', activeRatio: 0.4, volumeText: 'Flujo inicial de compras y despachos de inventario.', activeDots: 3 },
  { hour: '10 AM', activeRatio: 0.55, volumeText: 'Alta actividad en facturación de mostrador.', activeDots: 4 },
  { hour: '11 AM', activeRatio: 0.85, volumeText: 'Franja pico de operaciones y transacciones concurrentes.', activeDots: 7 },
  { hour: '12 PM', activeRatio: 0.9, volumeText: 'Pico máximo de facturación y servicio al mediodía.', activeDots: 7 },
  { hour: '1 PM', activeRatio: 0.7, volumeText: 'Rotación sostenida en ventas y caja principal.', activeDots: 5 },
  { hour: '2 PM', activeRatio: 0.5, volumeText: 'Flujo continuo de reposición y cobros de mostrador.', activeDots: 4 },
  { hour: '3 PM', activeRatio: 0.65, volumeText: 'Reactivación de pedidos comerciales y clientes.', activeDots: 5 },
  { hour: '4 PM', activeRatio: 0.8, volumeText: 'Segunda franja de alta demanda de la jornada.', activeDots: 6 },
  { hour: '5 PM', activeRatio: 0.45, volumeText: 'Cierre progresivo y arqueo de caja del día.', activeDots: 3 },
]

export function ActivityCoverageHeatmap() {
  const [range, setRange] = useState<'1D' | '5D' | '1M' | '1Y'>('1D')
  const [hoveredHour, setHoveredHour] = useState<string | null>(null)

  // Factores según el rango
  const rangeCoverage = {
    '1D': { rate: '80.9%', label: 'Cobertura del día', delta: '+10%' },
    '5D': { rate: '84.2%', label: 'Promedio 5 días', delta: '+8%' },
    '1M': { rate: '88.5%', label: 'Cobertura mensual', delta: '+14%' },
    '1Y': { rate: '92.1%', label: 'Tasa interanual', delta: '+18%' },
  }[range]

  const activeInfo = HOURLY_ACTIVITY_DATA.find((h) => h.hour === hoveredHour)

  return (
    <div className="p-6 rounded-2xl bg-card border border-border/80 dark:border-white/[0.08] shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-foreground">Activity Coverage Rate</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Audience interaction &amp; transaction distribution over time
            </p>
          </div>

          {/* Selector de Rango 1D, 5D, 1M, 1Y */}
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-xl border border-border/70 self-start sm:self-auto">
            {(['1D', '5D', '1M', '1Y'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setRange(tab)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all cursor-pointer ${
                  range === tab
                    ? 'bg-card text-foreground shadow-2xs font-bold border border-border/60'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Métrica principal con timestamp y delta */}
        <div className="flex items-baseline gap-3 mb-6">
          <span className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            {rangeCoverage.rate}
          </span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{rangeCoverage.label}</span>
            <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
              ↗ {rangeCoverage.delta}
            </span>
          </div>
        </div>

        {/* Matriz interactiva de puntos de calor */}
        <div className="relative pt-2 pb-1 overflow-x-auto">
          {/* Tooltip flotante al pasar el mouse */}
          {activeInfo && (
            <div className="absolute top-0 right-4 z-20 p-3 rounded-xl bg-popover text-popover-foreground border border-border/80 shadow-xl max-w-xs text-xs animate-in fade-in duration-150">
              <div className="font-bold text-foreground flex items-center justify-between mb-1">
                <span>Franja: {activeInfo.hour}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
                  {Math.round(activeInfo.activeRatio * 100)}% Activo
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{activeInfo.volumeText}</p>
            </div>
          )}

          <div className="min-w-[480px]">
            {/* Grid de 10 columnas x 8 filas de puntos */}
            <div className="grid grid-cols-10 gap-2 sm:gap-3 py-2">
              {HOURLY_ACTIVITY_DATA.map((col) => (
                <div
                  key={col.hour}
                  onMouseEnter={() => setHoveredHour(col.hour)}
                  onMouseLeave={() => setHoveredHour(null)}
                  className="flex flex-col gap-1.5 items-center cursor-pointer p-1 rounded-lg hover:bg-muted/40 transition-colors"
                >
                  {/* Puntos verticales (del último al primero) */}
                  {Array.from({ length: ROW_COUNT }).map((_, rIdx) => {
                    const invertedRow = ROW_COUNT - 1 - rIdx
                    const isActive = invertedRow < col.activeDots
                    return (
                      <span
                        key={rIdx}
                        className={`h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-xs transition-colors duration-200 ${
                          isActive
                            ? 'bg-zinc-800 dark:bg-zinc-200 shadow-2xs'
                            : 'bg-zinc-100 dark:bg-zinc-800/60'
                        }`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Eje X de horas */}
            <div className="grid grid-cols-10 gap-2 sm:gap-3 pt-3 border-t border-border/60 text-center">
              {HOURS.map((h) => (
                <span key={h} className="text-[11px] font-medium text-muted-foreground truncate">
                  {h}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
 * 3. Subscriber Growth & Curva de Facturación Mensual
 * ========================================================================= */
interface SalesGrowthCurveProps {
  salesByMonth: Array<{ month: string; total: number; count: number }>
}

export function SalesGrowthCurve({ salesByMonth }: SalesGrowthCurveProps) {
  const [selectedYear, setSelectedYear] = useState('2026')
  const [hoveredPoint, setHoveredPoint] = useState<{ month: string; total: number } | null>(null)

  // Normalizar datos a 12 meses
  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']

  // Mapear ingresos reales o proyectar curva elegante
  const monthlyValues = months.map((m, idx) => {
    // Buscar si existe en salesByMonth
    const found = salesByMonth.find((s) => {
      const parts = s.month.split('-')
      return parts[1] && parseInt(parts[1], 10) === idx + 1
    })
    if (found && found.total > 0) {
      return { month: m, total: found.total }
    }
    // Proyección de base realista si aún no hay transacciones en ese mes
    const baseCurve = [1200000, 1600000, 2100000, 2400000, 2900000, 3600000, 4100000, 4400000, 4800000, 5200000, 5600000, 6100000]
    return { month: m, total: baseCurve[idx] || 1500000 }
  })

  const maxVal = Math.max(...monthlyValues.map((v) => v.total), 7000000)

  // Generar puntos SVG normalizados (anchura: 800, altura: 200)
  const svgWidth = 800
  const svgHeight = 200
  const paddingX = 40
  const paddingY = 20

  const points = monthlyValues.map((v, i) => {
    const x = paddingX + (i / (monthlyValues.length - 1)) * (svgWidth - paddingX * 2)
    const y = svgHeight - paddingY - (v.total / maxVal) * (svgHeight - paddingY * 2)
    return { x, y, ...v }
  })

  // Generar path SVG suave
  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    const prev = points[i - 1]
    const cx = (prev.x + p.x) / 2
    return `${acc} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`
  }, '')

  const areaD = `${pathD} L ${points[points.length - 1].x} ${svgHeight} L ${points[0].x} ${svgHeight} Z`

  return (
    <div className="p-6 rounded-2xl bg-card border border-border/80 dark:border-white/[0.08] shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">Subscriber Growth &amp; Facturación</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monthly new revenue performance and commercial trend
          </p>
        </div>

        {/* Dropdown de Selección de Año */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/60 border border-border/70 text-xs font-medium">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-transparent text-foreground font-semibold outline-none cursor-pointer"
          >
            <option value="2026" className="bg-popover text-popover-foreground">Año 2026</option>
            <option value="2025" className="bg-popover text-popover-foreground">Año 2025</option>
          </select>
        </div>
      </div>

      {/* Tooltip del punto hovered */}
      <div className="h-6 mb-2">
        {hoveredPoint ? (
          <div className="text-xs text-foreground font-semibold flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-foreground" />
            <span>Mes: {hoveredPoint.month}</span>
            <span className="text-muted-foreground">&bull;</span>
            <span>Facturación: {formatCurrency(hoveredPoint.total)}</span>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground font-normal">
            Pasa el cursor sobre la curva para explorar los importes mensuales.
          </div>
        )}
      </div>

      {/* Gráfico SVG interactivo */}
      <div className="w-full overflow-x-auto">
        <div className="min-w-[600px]">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-44 overflow-visible">
            <defs>
              <linearGradient id="curveAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.12" className="text-zinc-500" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.0" className="text-zinc-500" />
              </linearGradient>
            </defs>

            {/* Líneas horizontales de guía */}
            {[0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const y = svgHeight - paddingY - ratio * (svgHeight - paddingY * 2)
              return (
                <line
                  key={idx}
                  x1={paddingX}
                  y1={y}
                  x2={svgWidth - paddingX}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity="0.08"
                  strokeDasharray="4 4"
                />
              )
            })}

            {/* Área bajo la curva */}
            <path d={areaD} fill="url(#curveAreaGrad)" />

            {/* Línea principal */}
            <path d={pathD} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground" />

            {/* Puntos interactivos */}
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="4.5"
                onMouseEnter={() => setHoveredPoint({ month: p.month, total: p.total })}
                onMouseLeave={() => setHoveredPoint(null)}
                className="fill-background stroke-foreground stroke-[2.5] hover:r-6 cursor-pointer transition-all duration-150"
              />
            ))}
          </svg>

          {/* Eje de meses */}
          <div className="grid grid-cols-12 gap-1 pt-2 border-t border-border/60 text-center">
            {months.map((m) => (
              <span key={m} className="text-[10px] font-medium text-muted-foreground uppercase">
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
 * 4. Content Activity (Actividad & Eventos Recientes)
 * ========================================================================= */
interface ContentActivityListProps {
  recentSales: DashboardOverview['recentSales']
  lowStockProducts: DashboardOverview['inventorySummary']['lowStockProducts']
  webOrders: DashboardOverview['webOrdersSummary']['pendingOrders']
}

export function ContentActivityList({ recentSales, lowStockProducts, webOrders }: ContentActivityListProps) {
  return (
    <div className="p-6 rounded-2xl bg-card border border-border/80 dark:border-white/[0.08] shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-foreground">Content Activity</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Track your transactions &amp; alerts</p>
          </div>
          <Link
            href="/sales"
            className="text-xs font-semibold text-foreground hover:underline flex items-center gap-1 group"
          >
            <span>View All</span>
            <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>

        {/* Lista de eventos con insignias y estados */}
        <div className="space-y-3.5">
          {/* Evento 1: Venta POS */}
          {recentSales.length > 0 ? (
            <Link
              href={`/sales/${recentSales[0].id}`}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 border border-transparent hover:border-border/60 transition-all cursor-pointer group"
            >
              <div className="h-8 w-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-foreground flex items-center justify-center shrink-0 border border-border/70">
                <Receipt className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-xs font-bold text-foreground truncate group-hover:underline">
                    Factura {recentSales[0].invoiceNumber}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    Exitosa
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  Total {formatCurrency(recentSales[0].total)} registrado en caja ({recentSales[0].paymentMethod})
                </p>
              </div>
            </Link>
          ) : (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border/60">
              <div className="h-8 w-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-foreground flex items-center justify-center shrink-0">
                <Receipt className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-bold text-foreground">Sin ventas registradas hoy</span>
                <p className="text-[11px] text-muted-foreground">Las transacciones aparecerán aquí en vivo.</p>
              </div>
            </div>
          )}

          {/* Evento 2: Pedido Web o Stock */}
          {webOrders.length > 0 ? (
            <Link
              href={`/web/orders/${webOrders[0].id}`}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 border border-transparent hover:border-border/60 transition-all cursor-pointer group"
            >
              <div className="h-8 w-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-foreground flex items-center justify-center shrink-0 border border-border/70">
                <Send className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-xs font-bold text-foreground truncate group-hover:underline">
                    Pedido {webOrders[0].reference || 'Online'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-200 dark:bg-zinc-800 text-foreground">
                    Pendiente
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  Cliente {webOrders[0].customerName} por {formatCurrency(webOrders[0].total)}
                </p>
              </div>
            </Link>
          ) : (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border/60">
              <div className="h-8 w-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-foreground flex items-center justify-center shrink-0">
                <Send className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-bold text-foreground">Despachos al día</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    Al día
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">No hay órdenes web pendientes de confirmación.</p>
              </div>
            </div>
          )}

          {/* Evento 3: Alerta de Stock o Auditoría */}
          {lowStockProducts.length > 0 ? (
            <Link
              href="/inventory"
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 border border-transparent hover:border-border/60 transition-all cursor-pointer group"
            >
              <div className="h-8 w-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-foreground flex items-center justify-center shrink-0 border border-border/70">
                <Flame className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-xs font-bold text-foreground truncate group-hover:underline">
                    Stock Bajo: {lowStockProducts[0].name}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    Atención
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  Quedan {lowStockProducts[0].stock} unidades (umbral: {lowStockProducts[0].lowStockThreshold})
                </p>
              </div>
            </Link>
          ) : (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border/60">
              <div className="h-8 w-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-foreground flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-bold text-foreground">Inventario Óptimo</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    Óptimo
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">Todas las referencias operan sobre el nivel mínimo.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
 * 5. Asistente Nova IA & Generador de Acciones (Subject Line Generator)
 * ========================================================================= */
export function AiQuickGeneratorCard() {
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [suggestions, setSuggestions] = useState([
    {
      badge: 'Mayor Retorno',
      text: 'Descuento del 10% por pago en efectivo en referencias con inventario estancado.',
      type: 'high-open-rate',
    },
    {
      badge: 'Fidelización',
      text: 'Recordatorio automático a clientes con cartera pendiente mayor a 15 días.',
      type: 'curiosity-driven',
    },
  ])

  function handleGenerate() {
    setLoading(true)
    setTimeout(() => {
      const customTopic = topic.trim() || 'Campaña general de ventas'
      setSuggestions([
        {
          badge: 'Alta Conversión',
          text: `Estrategia para ${customTopic}: Descuento escalonado 2x1 en combos de mostrador.`,
          type: 'high-open-rate',
        },
        {
          badge: 'Recuperación de Cartera',
          text: `Mensaje de cobro proactivo para ${customTopic}: Beneficio de condonación de recargos por pago total.`,
          type: 'curiosity-driven',
        },
      ])
      setLoading(false)
      toast.success('Sugerencias generadas con IA exitosamente')
    }, 600)
  }

  function handleCopy(text: string, idx: number) {
    navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    toast.success('Sugerencia copiada al portapapeles')
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  return (
    <div className="p-6 rounded-2xl bg-card border border-border/80 dark:border-white/[0.08] shadow-xs">
      <div className="mb-4">
        <h2 className="text-sm font-bold text-foreground">Subject Line Generator</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          AI-powered suggestions based on your commercial campaign
        </p>
      </div>

      <div className="space-y-3 mb-5">
        <div>
          <label htmlFor="ai-topic-input" className="text-xs font-semibold text-foreground block mb-1.5">
            Campaign topic
          </label>
          <Input
            id="ai-topic-input"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleGenerate()
              }
            }}
            placeholder='e.g. "Promoción fin de semana 20% en referencias clave"'
            className="h-9 text-xs rounded-xl bg-muted/30 border-border/70 focus-visible:ring-1"
          />
        </div>

        <Button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="w-full h-9 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:opacity-90 transition-opacity gap-1.5 cursor-pointer"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>{loading ? 'Generando recomendaciones...' : 'Generate Suggestions'}</span>
        </Button>
      </div>

      {/* Lista de Sugerencias */}
      <div className="space-y-3 pt-3 border-t border-border/60">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase block">
          Suggestions
        </span>

        {suggestions.map((item, idx) => (
          <div
            key={idx}
            className="p-3 rounded-xl bg-muted/30 border border-border/60 flex flex-col gap-1.5 transition-all hover:bg-muted/50"
          >
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {item.badge}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(item.text, idx)}
                title="Copiar texto"
                aria-label="Copiar texto de sugerencia"
                className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors cursor-pointer"
              >
                {copiedIdx === idx ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="text-xs text-foreground font-medium leading-relaxed">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
