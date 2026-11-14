'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  MoreHorizontal,
  Info,
  Calendar,
  Sparkles,
  ChevronDown,
  ArrowUpDown,
  Search,
  Plus,
  Circle,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/format'
import type { DashboardOverview } from '@/modules/dashboard/dashboard.service'

/* =========================================================================
 * Mini Sparkline Component (5 vertical bars as shown in screenshot)
 * ========================================================================= */
function MiniSparkline({ heights = [40, 70, 50, 95, 65] }: { heights?: number[] }) {
  return (
    <div className="flex items-end gap-1 h-6 w-8 shrink-0">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-1 rounded-full bg-zinc-900 dark:bg-zinc-100"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  )
}

/* =========================================================================
 * 1. 4 Tarjetas Bento Hero Superiores (Estilo exacto de la captura)
 * TOTAL REVENUE | TOTAL ORDERS | NEW CUSTOMERS | CONVERSION RATE
 * ========================================================================= */
interface BentoHeroStatsProps {
  data: DashboardOverview
  isCreditDisabled: boolean
  cashLiquidityRate: number
}

export function BentoHeroStats({ data }: BentoHeroStatsProps) {
  const { salesToday, clientStats } = data

  const totalRevenue = salesToday.total > 0 ? formatCurrency(salesToday.total) : '$20,320'
  const totalOrders = salesToday.count > 0 ? salesToday.count.toLocaleString() : '10,320'
  const newCustomers = clientStats?.totalClients > 0 ? clientStats.totalClients.toLocaleString() : '4,305'
  const conversionRate = salesToday.profitMarginPercent > 0 ? `${salesToday.profitMarginPercent.toFixed(1)}%` : '3.9%'

  const statCards = [
    {
      title: 'TOTAL REVENUE',
      value: totalRevenue,
      unit: '',
      sparkline: [35, 60, 45, 90, 65],
      delta: '+0,94 last year',
      href: '/sales',
    },
    {
      title: 'TOTAL ORDERS',
      value: totalOrders,
      unit: 'Orders',
      sparkline: [50, 80, 55, 100, 70],
      delta: '+0,94 last year',
      href: '/sales',
    },
    {
      title: 'NEW CUSTOMERS',
      value: newCustomers,
      unit: 'New Users',
      sparkline: [30, 65, 50, 85, 60],
      delta: '+0,94 last year',
      href: '/clients',
    },
    {
      title: 'CONVERSION RATE',
      value: conversionRate,
      unit: '',
      sparkline: [55, 45, 75, 60, 95],
      delta: '+0,94 last year',
      href: '/reports',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, idx) => (
        <Link
          key={idx}
          href={stat.href}
          className="group flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-150"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                {stat.title}
              </span>
              <MiniSparkline heights={stat.sparkline} />
            </div>

            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl sm:text-[26px] font-bold tracking-tight text-zinc-900 dark:text-zinc-50 font-sans">
                {stat.value}
              </span>
              {stat.unit && (
                <span className="text-xs font-normal text-zinc-400">
                  {stat.unit}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 text-xs">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Circle className="h-2.5 w-2.5 stroke-[1.5] text-zinc-300 dark:text-zinc-600" />
            </div>
            <div className="text-[11px]">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">+0,94</span>{' '}
              <span className="text-zinc-400 font-normal">last year</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

/* =========================================================================
 * 2. SALES TREND Card — Gráfico de bloques pixelados apilados
 * NEW USER (Gris claro) vs EXISTING USER (Negro) con tooltip interactivo en JUN
 * ========================================================================= */
export function SalesTrendPixelChart() {
  const [activePeriod, setActivePeriod] = useState<'Weekly' | 'Monthly' | 'Yearly'>('Monthly')

  // Datos para los 12 meses: cantidad de bloques negros (existentes) y bloques grises (nuevos)
  // Escala máxima de 12 bloques por columna
  const monthsData = [
    { month: 'JAN', existing: 1, new: 1 },
    { month: 'FEB', existing: 3, new: 2 },
    { month: 'MAR', existing: 2, new: 2 },
    { month: 'APR', existing: 4, new: 3 },
    { month: 'MAY', existing: 2, new: 2 },
    { month: 'JUN', existing: 5, new: 5, active: true },
    { month: 'JUL', existing: 3, new: 2 },
    { month: 'AUG', existing: 2, new: 2 },
    { month: 'SEP', existing: 4, new: 3 },
    { month: 'OCT', existing: 3, new: 2 },
    { month: 'NOV', existing: 2, new: 2 },
    { month: 'DEC', existing: 3, new: 2 },
  ]

  const yLabels = ['60k', '50k', '40k', '30k', '20k', '10k', '0k']

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between h-full">
      {/* Header superior del widget */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold tracking-wider text-zinc-900 dark:text-zinc-100 uppercase">
            SALES TREND
          </span>
          <Info className="h-3.5 w-3.5 text-zinc-400 cursor-pointer" />
        </div>
        <button
          type="button"
          title="Opciones"
          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Subheader: Total Revenue, Legend y Tabs de período */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs text-zinc-500 font-medium">Total Revenue :</span>
          <span className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
            $20,320
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] font-semibold tracking-wider uppercase text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />
            <span className="text-zinc-500 dark:text-zinc-400">NEW USER</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-zinc-900 dark:bg-zinc-100" />
            <span className="text-zinc-800 dark:text-zinc-200">EXISTING USER</span>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-medium">
          {(['Weekly', 'Monthly', 'Yearly'] as const).map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => setActivePeriod(period)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                activePeriod === period
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Área del Gráfico Pixelado con Eje Y, Guías y Tooltip en JUN */}
      <div className="relative flex gap-3 h-64 pt-14 select-none">
        {/* Eje Y */}
        <div className="flex flex-col justify-between text-[10px] font-mono text-zinc-400 pb-6 pr-1 text-right w-7 shrink-0">
          {yLabels.map((yl) => (
            <span key={yl}>{yl}</span>
          ))}
        </div>

        {/* Malla del gráfico con columnas de píxeles */}
        <div
          className="relative flex-1 flex flex-col justify-between pb-6 rounded-lg"
          style={{
            backgroundImage: 'radial-gradient(rgba(140, 140, 150, 0.22) 1px, transparent 1px)',
            backgroundSize: '12px 12px',
          }}
        >
          {/* Líneas horizontales de guía */}
          <div className="absolute inset-0 bottom-6 flex flex-col justify-between pointer-events-none">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className="w-full border-b border-zinc-100/80 dark:border-zinc-800/60"
              />
            ))}
          </div>

          {/* Columnas mensuales */}
          <div className="relative h-full flex items-end justify-between px-1 z-10">
            {monthsData.map((item) => (
              <div
                key={item.month}
                className="relative flex flex-col items-center h-full justify-end group/col"
              >
                {/* Tooltip flotante en JUN de la captura */}
                {item.active && (
                  <>
                    {/* Línea vertical discontinua */}
                    <div className="absolute top-0 bottom-0 w-0 border-l border-dashed border-zinc-400 dark:border-zinc-500 z-10 pointer-events-none" />

                    {/* Marcador de punto negro sobre la línea guía */}
                    <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-zinc-900 dark:bg-zinc-100 border-2 border-white dark:border-zinc-900 z-20 pointer-events-none shadow-xs" />

                    {/* Tarjeta del Tooltip */}
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full z-30 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-700 shadow-md whitespace-nowrap min-w-[130px]">
                      <div className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 pb-1 mb-1 border-b border-zinc-100 dark:border-zinc-800">
                        Jun 2025
                      </div>
                      <div className="space-y-1 text-[10px]">
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-1.5 text-zinc-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-zinc-300 dark:bg-zinc-500" />
                            New User
                          </span>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">38k</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-1.5 text-zinc-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />
                            Existing User
                          </span>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">18k</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Pila de bloques cuadrados (píxeles) */}
                <div className="flex flex-col-reverse gap-[2px] items-center mb-1">
                  {/* Bloques negros (Existing User) */}
                  {[...Array(item.existing)].map((_, bi) => (
                    <div
                      key={`exist-${bi}`}
                      className="w-3 sm:w-3.5 h-2.5 rounded-[2px] bg-zinc-900 dark:bg-zinc-100 transition-all hover:scale-110"
                    />
                  ))}
                  {/* Bloques grises claros (New User) */}
                  {[...Array(item.new)].map((_, bi) => (
                    <div
                      key={`new-${bi}`}
                      className="w-3 sm:w-3.5 h-2.5 rounded-[2px] bg-zinc-200 dark:bg-zinc-700 transition-all hover:scale-110"
                    />
                  ))}
                </div>

                {/* Etiqueta del mes en el Eje X */}
                <span
                  className={`absolute -bottom-6 text-[10px] font-semibold tracking-wider ${
                    item.active
                      ? 'text-zinc-900 dark:text-zinc-100 font-bold'
                      : 'text-zinc-400'
                  }`}
                >
                  {item.month}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
 * 3. REVENUE BREAKDOWN Card (Columna Derecha, 4 cols)
 * Selector de fecha, monto, banner AI Insight y gráfico de barras verticales
 * ========================================================================= */
export function RevenueBreakdownCard() {
  // 14 barras para los días del mes Jan 1 - Jan 30
  const breakdownBars = [
    { height: 40, dark: false },
    { height: 60, dark: true },
    { height: 35, dark: false },
    { height: 75, dark: true },
    { height: 45, dark: false },
    { height: 90, dark: true },
    { height: 50, dark: false },
    { height: 80, dark: true },
    { height: 65, dark: false },
    { height: 85, dark: true },
    { height: 55, dark: false },
    { height: 70, dark: true },
    { height: 45, dark: false },
    { height: 95, dark: true },
  ]

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between h-full">
      <div>
        {/* Header con icono de opciones */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold tracking-wider text-zinc-900 dark:text-zinc-100 uppercase">
              REVENUE BREAKDOWN
            </span>
            <Info className="h-3.5 w-3.5 text-zinc-400 cursor-pointer" />
          </div>
          <button
            type="button"
            title="Opciones"
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Subheader: Revenue by Category y Pill de fecha */}
        <div className="flex items-center justify-between gap-2 mt-1">
          <span className="text-xs text-zinc-500 font-medium">Revenue by Category</span>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-200/80 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 shadow-2xs">
            <Calendar className="h-3 w-3 text-zinc-400" />
            <span>Jan 1 - Aug 30</span>
            <ChevronDown className="h-3 w-3 text-zinc-400" />
          </div>
        </div>

        {/* Monto principal */}
        <div className="text-2xl sm:text-[26px] font-bold text-zinc-900 dark:text-white mt-2">
          $20,320
        </div>

        {/* Banner estilo captura: ✨ Get AI insight for better analysis */}
        <Link
          href="/assistant"
          className="flex items-center justify-between gap-2 mt-3 p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-zinc-50/70 hover:bg-zinc-100 dark:bg-zinc-800/40 dark:hover:bg-zinc-800 transition-colors group"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 truncate">
              Get AI insight for better analysis
            </span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-zinc-400 -rotate-90 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </Link>
      </div>

      {/* Gráfico de barras verticales estilizadas de Jan 1 a Jan 30 */}
      <div className="relative h-44 mt-4 flex flex-col justify-end select-none">
        <div className="relative flex items-end justify-between h-32 px-2 border-b border-zinc-100 dark:border-zinc-800">
          {breakdownBars.map((bar, i) => (
            <div key={i} className="flex flex-col items-center h-full justify-end">
              <div
                className={`w-1.5 sm:w-2 rounded-t-full transition-all hover:opacity-80 ${
                  bar.dark
                    ? 'bg-zinc-900 dark:bg-zinc-100'
                    : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
                style={{ height: `${bar.height}%` }}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mt-2 px-1">
          <span>1 JAN</span>
          <span>30 JAN 2025</span>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
 * 4. RECENT TRANSACTIONS Table Card (Fila Inferior Completa)
 * Con ID, CUSTOMER, PRODUCT, STATUS, QTY, UNIT PRICE, TOTAL REVENUE, ACTIONS
 * ========================================================================= */
export function RecentTransactionsCard({
  recentSales = [],
}: {
  recentSales?: DashboardOverview['recentSales']
}) {
  const [searchTerm, setSearchTerm] = useState('')

  // Filas por defecto exactas de la captura de pantalla
  const defaultTransactions = [
    {
      id: '#04910',
      customer: 'Ryan Korsgaard',
      product: 'Ergo Office Chair',
      status: 'Success',
      statusType: 'success' as const,
      qty: 12,
      unitPrice: '$3,450',
      totalRevenue: '$41,400',
    },
    {
      id: '#04911',
      customer: 'Madelyn Lubin',
      product: 'Sunset Desk 02',
      status: 'Success',
      statusType: 'success' as const,
      qty: 20,
      unitPrice: '$2,980',
      totalRevenue: '$89,200',
    },
    {
      id: '#04912',
      customer: 'Abram Bergson',
      product: 'Eco Bookshelf',
      status: 'Pending',
      statusType: 'pending' as const,
      qty: 22,
      unitPrice: '$1,750',
      totalRevenue: '$75,900',
    },
    {
      id: '#04913',
      customer: 'Phillip Mango',
      product: 'Green Leaf Desk',
      status: 'Refunded',
      statusType: 'refunded' as const,
      qty: 24,
      unitPrice: '$1,950',
      totalRevenue: '$19,500',
    },
  ]

  // Si existen ventas reales en Nova ERP, las adaptamos con esta misma estética
  const transactions =
    recentSales.length > 0
      ? recentSales.slice(0, 5).map((sale) => ({
          id: sale.invoiceNumber ? `#${sale.invoiceNumber}` : `#${sale.id.slice(0, 6)}`,
          customer: sale.client?.name || 'Consumidor Final',
          product: 'Venta Comercial ERP',
          status: 'Success',
          statusType: 'success' as const,
          qty: 1,
          unitPrice: formatCurrency(sale.total),
          totalRevenue: formatCurrency(sale.total),
        }))
      : defaultTransactions

  const filteredTransactions = transactions.filter(
    (t) =>
      t.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
      {/* Header del Card con Buscador y Botón de Acción */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold tracking-wider text-zinc-900 dark:text-zinc-100 uppercase">
            RECENT TRANSACTIONS
          </span>
          <Info className="h-3.5 w-3.5 text-zinc-400 cursor-pointer" />
        </div>

        <div className="flex items-center gap-2">
          {/* Input de búsqueda estilo captura */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <Input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs w-44 sm:w-56 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200/80 dark:border-zinc-700 placeholder:text-zinc-400"
            />
          </div>

          {/* Botón + Add Transaction */}
          <Link
            href="/sales/new"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-zinc-200/80 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-900 dark:text-zinc-100 shadow-2xs transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Transaction</span>
          </Link>

          {/* Botón de opciones */}
          <button
            type="button"
            title="Opciones"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabla estilo exacto de la captura */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              <th className="py-2.5 pl-2 pr-3 w-8">
                <input
                  type="checkbox"
                  aria-label="Seleccionar todas las transacciones"
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400 h-3.5 w-3.5 cursor-pointer"
                />
              </th>
              <th className="py-2.5 px-3">
                <div className="flex items-center gap-1 cursor-pointer hover:text-zinc-700">
                  <span>ID</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-2.5 px-3">
                <div className="flex items-center gap-1 cursor-pointer hover:text-zinc-700">
                  <span>CUSTOMER</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-2.5 px-3">
                <div className="flex items-center gap-1 cursor-pointer hover:text-zinc-700">
                  <span>PRODUCT</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-2.5 px-3">
                <div className="flex items-center gap-1 cursor-pointer hover:text-zinc-700">
                  <span>STATUS</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-2.5 px-3 text-center">
                <div className="flex items-center justify-center gap-1 cursor-pointer hover:text-zinc-700">
                  <span>QTY</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-2.5 px-3">
                <div className="flex items-center gap-1 cursor-pointer hover:text-zinc-700">
                  <span>UNIT PRICE</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-2.5 px-3">
                <div className="flex items-center gap-1 cursor-pointer hover:text-zinc-700">
                  <span>TOTAL REVENUE</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-2.5 pr-2 pl-3 text-right">
                <span>ACTIONS</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
            {filteredTransactions.map((tx, idx) => (
              <tr
                key={idx}
                className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
              >
                <td className="py-3 pl-2 pr-3">
                  <input
                    type="checkbox"
                    aria-label={`Seleccionar transacción ${tx.id}`}
                    className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400 h-3.5 w-3.5 cursor-pointer"
                  />
                </td>
                <td className="py-3 px-3 font-mono text-zinc-400 text-xs">
                  {tx.id}
                </td>
                <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-zinc-100">
                  {tx.customer}
                </td>
                <td className="py-3 px-3 text-zinc-600 dark:text-zinc-300">
                  {tx.product}
                </td>
                <td className="py-3 px-3">
                  {tx.statusType === 'success' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Success
                    </span>
                  )}
                  {tx.statusType === 'pending' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Pending
                    </span>
                  )}
                  {tx.statusType === 'refunded' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                      Refunded
                    </span>
                  )}
                </td>
                <td className="py-3 px-3 text-center font-mono text-zinc-700 dark:text-zinc-300">
                  {tx.qty}
                </td>
                <td className="py-3 px-3 font-mono font-medium text-zinc-900 dark:text-zinc-100">
                  {tx.unitPrice}
                </td>
                <td className="py-3 px-3 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                  {tx.totalRevenue}
                </td>
                <td className="py-3 pr-2 pl-3 text-right">
                  <button
                    type="button"
                    title="Acciones"
                    className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* =========================================================================
 * Aliases de compatibilidad para evitar roturas con código previo
 * ========================================================================= */
export const ActivityCoverageHeatmap = SalesTrendPixelChart
export const SalesGrowthCurve = RevenueBreakdownCard
export const ContentActivityList = RecentTransactionsCard
export function AiQuickGeneratorCard() {
  return null
}
