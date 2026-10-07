'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Banknote, Package, ShoppingCart, TrendingUp, ArrowUpRight } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/format'
import { getPaymentMethodLabel } from '@/lib/labels'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface TooltipPayloadEntry {
  name?: string
  value?: number
  color?: string
  payload?: Record<string, unknown>
}

function CustomChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
  formatter?: (v: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover text-popover-foreground border border-dashed border-border/80 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
      {label && <p className="font-semibold text-foreground border-b border-dashed border-border/60 pb-1 font-mono">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-4 font-mono">
          <span style={{ color: entry.color }} className="font-sans font-medium">
            {entry.name}:
          </span>
          <span className="font-bold text-foreground">
            {formatter ? formatter(Number(entry.value ?? 0)) : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function CompactHeader({
  code,
  title,
  badge,
}: {
  code: string
  title: string
  badge?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted border border-dashed border-border/70 text-muted-foreground">
          {code}
        </span>
        <h3 className="text-xs font-bold tracking-tight text-foreground uppercase">{title}</h3>
      </div>
      {badge && <div>{badge}</div>}
    </div>
  )
}

// 1. Matriz Contable de Recaudo por Métodos de Pago con Barra de Distribución Segmentada
export function PaymentDonut({
  data,
}: {
  data: { paymentMethod: string; _count: { id: number }; _sum: { total: number | null } }[]
}) {
  const chartData = data.map((d) => ({
    name: getPaymentMethodLabel(d.paymentMethod),
    rawMethod: d.paymentMethod,
    amount: d._sum.total || 0,
    count: d._count.id || 0,
  }))

  const totalRevenue = chartData.reduce((s, d) => s + d.amount, 0)
  const totalTransactions = chartData.reduce((s, d) => s + d.count, 0)

  const immediateLiquidity = chartData.filter((d) => d.rawMethod !== 'CREDITO').reduce((s, d) => s + d.amount, 0)
  const creditReceivables = chartData.filter((d) => d.rawMethod === 'CREDITO').reduce((s, d) => s + d.amount, 0)
  const liquidityRatio = totalRevenue > 0 ? Math.round((immediateLiquidity / totalRevenue) * 100) : 100

  const METHOD_ACCOUNT_META: Record<string, { account: string; badge: string; colorClass: string; barColor: string; bgSoft: string }> =
    {
      CASH: {
        account: 'Caja General (Disponible)',
        badge: 'Inmediata',
        colorClass: 'text-emerald-600 dark:text-emerald-400',
        barColor: 'bg-emerald-500',
        bgSoft: 'bg-emerald-500/10',
      },
      TRANSFER: {
        account: 'Bancos / Transferencia',
        badge: 'Bancos',
        colorClass: 'text-sky-600 dark:text-sky-400',
        barColor: 'bg-sky-500',
        bgSoft: 'bg-sky-500/10',
      },
      CARD: {
        account: 'Datáfono / Tarjetas',
        badge: 'Por Liquidar',
        colorClass: 'text-indigo-600 dark:text-indigo-400',
        barColor: 'bg-indigo-500',
        bgSoft: 'bg-indigo-500/10',
      },
      CREDITO: {
        account: 'Cuentas por Cobrar (CxC)',
        badge: 'Cartera a Plazo',
        colorClass: 'text-amber-600 dark:text-amber-400',
        barColor: 'bg-amber-500',
        bgSoft: 'bg-amber-500/10',
      },
    }

  return (
    <Card className="border border-dashed border-border/80 dark:border-white/[0.12] bg-card h-full flex flex-col rounded-2xl shadow-2xs">
      <CardHeader className="py-2.5 px-3.5 border-b border-dashed border-border/60 dark:border-white/[0.08]">
        <CompactHeader
          code="MOD.01"
          title="Tesorería // Conciliación & Canales"
          badge={
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-muted-foreground">Liquidez:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{liquidityRatio}%</span>
            </div>
          }
        />
      </CardHeader>
      <CardContent className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
        {totalRevenue === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-xs text-muted-foreground">
            <Banknote className="h-7 w-7 mb-1.5 text-muted-foreground/30" />
            <p className="font-mono text-[11px]">SIN_REGISTROS_DE_RECAUDO</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Visual Component 1: Segmented Spectrum Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                <span>DISTRIBUCIÓN DE LIQUIDEZ</span>
                <span>TOTAL: {formatCurrency(totalRevenue)}</span>
              </div>
              <div className="h-3 w-full rounded-md bg-muted/60 overflow-hidden flex border border-dashed border-border/60">
                {chartData.map((d) => {
                  const pct = totalRevenue > 0 ? (d.amount / totalRevenue) * 100 : 0
                  if (pct <= 0) return null
                  const meta = METHOD_ACCOUNT_META[d.rawMethod] || { barColor: 'bg-primary' }
                  return (
                    <div
                      key={d.name}
                      style={{ width: `${pct}%` }}
                      title={`${d.name}: ${formatCurrency(d.amount)} (${Math.round(pct)}%)`}
                      className={`h-full ${meta.barColor} transition-all duration-300 relative group`}
                    />
                  )
                })}
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[10px] font-mono">
                {chartData.map((d) => {
                  const meta = METHOD_ACCOUNT_META[d.rawMethod] || { barColor: 'bg-primary' }
                  const pct = totalRevenue > 0 ? Math.round((d.amount / totalRevenue) * 100) : 0
                  return (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-xs ${meta.barColor}`} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-bold text-foreground">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Visual Component 2: Spreadsheet Audit Grid */}
            <div className="border border-dashed border-border/70 dark:border-white/[0.08] rounded-xl overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-dashed border-border/60 dark:border-white/[0.08] text-muted-foreground uppercase text-[10px] font-mono">
                    <th className="py-1.5 px-2.5">Canal</th>
                    <th className="py-1.5 px-2 text-center">Ops</th>
                    <th className="py-1.5 px-2 text-right">Promedio</th>
                    <th className="py-1.5 px-2.5 text-right">Monto</th>
                    <th className="py-1.5 px-2.5 text-right w-20">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashed divide-border/40 dark:divide-white/[0.06] font-mono text-[11px]">
                  {chartData.map((d) => {
                    const percent = totalRevenue > 0 ? Math.round((d.amount / totalRevenue) * 100) : 0
                    const avgTicket = d.count > 0 ? Math.round(d.amount / d.count) : 0
                    const meta = METHOD_ACCOUNT_META[d.rawMethod] || {
                      account: d.name,
                      badge: 'General',
                      colorClass: 'text-foreground',
                      barColor: 'bg-primary',
                    }

                    return (
                      <tr key={d.name} className="hover:bg-muted/30 transition-colors">
                        <td className="py-1.5 px-2.5 font-sans font-medium text-foreground">
                          <div className="flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${meta.barColor}`} />
                            <span>{d.name}</span>
                          </div>
                        </td>
                        <td className="py-1.5 px-2 text-center text-muted-foreground">
                          {d.count}{' '}
                          <span className="text-[9px] opacity-75">
                            ({totalTransactions > 0 ? Math.round((d.count / totalTransactions) * 100) : 0}%)
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-right text-muted-foreground">
                          {formatCurrency(avgTicket)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-bold text-foreground">
                          {formatCurrency(d.amount)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5 font-bold">
                            <span>{percent}%</span>
                            <div className="w-8 h-1 bg-muted rounded-full overflow-hidden shrink-0">
                              <div className={`h-full ${meta.barColor}`} style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Quick Balance Indicators */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2 rounded-lg bg-emerald-500/5 border border-dashed border-emerald-500/20 font-mono text-xs flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground uppercase">Disp. Inmediato</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(immediateLiquidity)}</span>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/5 border border-dashed border-amber-500/20 font-mono text-xs flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground uppercase">Cartera CxC</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{formatCurrency(creditReceivables)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// 2. Gráfico de Facturación Mensual con Tira Analítica de Métricas (Run-Rate)
export function SalesMonthlyBar({ data }: { data: { month: string; total: number; count: number }[] }) {
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

  const chartData = data.map((d) => {
    const parts = d.month.split('-')
    const mIndex = parseInt(parts[1] || '1', 10) - 1
    const yearShort = parts[0]?.slice(-2) || ''
    return {
      month: `${monthNames[mIndex]} '${yearShort}`,
      Total: d.total,
      Transacciones: d.count,
    }
  })

  const totalPeriod = data.reduce((sum, d) => sum + d.total, 0)
  const totalCounts = data.reduce((sum, d) => sum + d.count, 0)
  const avgMonthly = data.length > 0 ? Math.round(totalPeriod / data.length) : 0
  const maxMonth = data.reduce((max, d) => (d.total > max ? d.total : max), 0)
  const lastMonthTotal = data.length > 0 ? data[data.length - 1].total : 0
  const diffFromAvg = avgMonthly > 0 ? Math.round(((lastMonthTotal - avgMonthly) / avgMonthly) * 100) : 0

  return (
    <Card className="border border-dashed border-border/80 dark:border-white/[0.12] bg-card h-full flex flex-col rounded-2xl shadow-2xs">
      <CardHeader className="py-2.5 px-3.5 border-b border-dashed border-border/60 dark:border-white/[0.08]">
        <CompactHeader
          code="MOD.02"
          title="Facturación Histórica // Run-Rate 6M"
          badge={
            <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
              <span>Σ:</span>
              <span className="font-bold text-foreground">{formatCurrency(totalPeriod)}</span>
            </div>
          }
        />
      </CardHeader>
      <CardContent className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
        {/* Metric Ribbon Strip */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-1.5 rounded-lg bg-muted/40 border border-dashed border-border/60">
            <span className="text-[9px] font-mono text-muted-foreground block uppercase">6M Total</span>
            <span className="text-xs font-bold font-mono text-foreground">{formatCurrency(totalPeriod)}</span>
          </div>
          <div className="p-1.5 rounded-lg bg-muted/40 border border-dashed border-border/60">
            <span className="text-[9px] font-mono text-muted-foreground block uppercase">Promedio</span>
            <span className="text-xs font-bold font-mono text-foreground">{formatCurrency(avgMonthly)}</span>
          </div>
          <div className="p-1.5 rounded-lg bg-muted/40 border border-dashed border-border/60">
            <span className="text-[9px] font-mono text-muted-foreground block uppercase">Pico Máx</span>
            <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(maxMonth)}</span>
          </div>
          <div className="p-1.5 rounded-lg bg-muted/40 border border-dashed border-border/60">
            <span className="text-[9px] font-mono text-muted-foreground block uppercase">Volumen</span>
            <span className="text-xs font-bold font-mono text-primary">{formatNumber(totalCounts)} ops</span>
          </div>
        </div>

        {/* Visual Component: Bar Chart */}
        {chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-xs text-muted-foreground">
            <TrendingUp className="h-7 w-7 mb-1.5 text-muted-foreground/30" />
            <p className="font-mono text-[11px]">SIN_DATOS_HISTORICOS</p>
          </div>
        ) : (
          <div className="pt-1">
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={chartData} margin={{ top: 6, right: 6, bottom: 0, left: -6 }}>
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
                  width={42}
                />
                <Tooltip content={<CustomChartTooltip formatter={(v: number) => formatCurrency(v)} />} />
                <Bar dataKey="Total" radius={[4, 4, 0, 0]} maxBarSize={28}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill="var(--color-primary)" fillOpacity={0.7 + 0.3 * ((i + 1) / chartData.length)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground pt-1.5 border-t border-dashed border-border/50">
              <span>Tendencia mes actual vs media:</span>
              <span className={`font-bold ${diffFromAvg >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}`}>
                {diffFromAvg >= 0 ? `+${diffFromAvg}%` : `${diffFromAvg}%`} vs prom.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// 3. Matriz de Concentración y Pareto Top 5 Productos
export interface TopProductData {
  productId: string
  name: string
  quantity: number
  total: number
}

export function TopProductsBar({ data }: { data: TopProductData[] }) {
  const topFive = data.slice(0, 5)
  const totalRevenueTop = topFive.reduce((sum, item) => sum + item.total, 0)
  const totalUnitsTop = topFive.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <Card className="border border-dashed border-border/80 dark:border-white/[0.12] bg-card h-full flex flex-col rounded-2xl shadow-2xs">
      <CardHeader className="py-2.5 px-3.5 border-b border-dashed border-border/60 dark:border-white/[0.08]">
        <CompactHeader
          code="MOD.03"
          title="Rotación // Pareto Top 5 Productos"
          badge={
            topFive.length > 0 ? (
              <span className="font-mono text-[11px] font-bold text-foreground">
                {formatCurrency(totalRevenueTop)} &bull; {totalUnitsTop} uds
              </span>
            ) : null
          }
        />
      </CardHeader>
      <CardContent className="p-3.5 flex-1 flex flex-col justify-center">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-xs text-muted-foreground">
            <Package className="h-7 w-7 mb-1.5 text-muted-foreground/30" />
            <p className="font-mono text-[11px]">SIN_VENTAS_EN_EL_PERIODO</p>
          </div>
        ) : (
          <div className="border border-dashed border-border/70 dark:border-white/[0.08] rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/40 border-b border-dashed border-border/60 dark:border-white/[0.08] text-muted-foreground uppercase text-[10px] font-mono">
                  <th className="py-1.5 px-2 text-center w-8">Pos</th>
                  <th className="py-1.5 px-2.5">Ítem / Referencia</th>
                  <th className="py-1.5 px-2 text-center">Cant</th>
                  <th className="py-1.5 px-2 text-right">P. Prom</th>
                  <th className="py-1.5 px-2.5 text-right">Facturado</th>
                  <th className="py-1.5 px-2.5 text-right w-20">Pareto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-border/40 dark:divide-white/[0.06] font-mono text-[11px]">
                {topFive.map((item, index) => {
                  const percentOfTop = totalRevenueTop > 0 ? Math.round((item.total / totalRevenueTop) * 100) : 0
                  const avgPrice = item.quantity > 0 ? Math.round(item.total / item.quantity) : 0

                  return (
                    <tr key={item.productId || index} className="hover:bg-muted/30 transition-colors">
                      <td className="py-1.5 px-2 text-center text-muted-foreground font-bold">
                        <span className="inline-block px-1 rounded bg-muted text-[10px]">
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-1.5 px-2.5 font-sans font-medium text-foreground">
                        <span className="truncate block max-w-[160px] sm:max-w-[220px]" title={item.name}>
                          {item.name}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-center text-muted-foreground">
                        {formatNumber(item.quantity)}
                      </td>
                      <td className="py-1.5 px-2 text-right text-muted-foreground">
                        {formatCurrency(avgPrice)}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-bold text-foreground">
                        {formatCurrency(item.total)}
                      </td>
                      <td className="py-1.5 px-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5 font-bold">
                          <span>{percentOfTop}%</span>
                          <div className="w-8 h-1 bg-muted rounded-full overflow-hidden shrink-0">
                            <div className="h-full bg-primary" style={{ width: `${percentOfTop}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// 4. Semáforo de Abastecimiento & Stock Crítico
export function LowStockList({
  data,
}: {
  data: { id: string; name: string; stock: number; lowStockThreshold: number; salePrice?: number }[]
}) {
  return (
    <Card className="border border-dashed border-border/80 dark:border-white/[0.12] bg-card h-full flex flex-col rounded-2xl shadow-2xs">
      <CardHeader className="py-2.5 px-3.5 border-b border-dashed border-border/60 dark:border-white/[0.08]">
        <CompactHeader
          code="MOD.04"
          title="Abastecimiento // Stock Crítico"
          badge={
            <Link
              href="/inventory"
              className="inline-flex items-center gap-1 font-mono text-[10px] text-primary hover:underline font-bold"
            >
              Catálogo <ArrowUpRight className="h-3 w-3" />
            </Link>
          }
        />
      </CardHeader>
      <CardContent className="p-3.5 flex-1 flex flex-col justify-center">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-xs text-muted-foreground">
            <ShoppingCart className="h-7 w-7 mb-1.5 text-muted-foreground/30" />
            <p className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">EXISTENCIAS_OPTIMAS</p>
          </div>
        ) : (
          <div className="border border-dashed border-border/70 dark:border-white/[0.08] rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/40 border-b border-dashed border-border/60 dark:border-white/[0.08] text-muted-foreground uppercase text-[10px] font-mono">
                  <th className="py-1.5 px-2.5">Producto</th>
                  <th className="py-1.5 px-2 text-center">Actual</th>
                  <th className="py-1.5 px-2 text-center">Mínimo</th>
                  <th className="py-1.5 px-2.5 text-right">Nivel / Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-border/40 dark:divide-white/[0.06] font-mono text-[11px]">
                {data.slice(0, 5).map((p) => {
                  const isOut = p.stock <= 0
                  const ratio = p.lowStockThreshold > 0 ? Math.min(100, Math.round((p.stock / p.lowStockThreshold) * 100)) : 0
                  return (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-1.5 px-2.5 font-sans font-medium text-foreground">
                        <span className="truncate block max-w-[160px] sm:max-w-[220px]" title={p.name}>
                          {p.name}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-center font-bold">
                        <span className={isOut ? 'text-destructive font-bold' : 'text-amber-600 dark:text-amber-400'}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-center text-muted-foreground">
                        {p.lowStockThreshold}
                      </td>
                      <td className="py-1.5 px-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span
                            className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              isOut
                                ? 'bg-destructive/15 text-destructive border border-dashed border-destructive/40'
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-dashed border-amber-500/40'
                            }`}
                          >
                            {isOut ? 'AGOTADO' : `${ratio}%`}
                          </span>
                          <div className="w-8 h-1 bg-muted rounded-full overflow-hidden shrink-0">
                            <div
                              className={`h-full ${isOut ? 'bg-destructive' : 'bg-amber-500'}`}
                              style={{ width: `${isOut ? 100 : ratio}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
