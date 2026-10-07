'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  Receipt,
  Package,
  AlertTriangle,
  HandCoins,
  PlusCircle,
  Wallet,
  RefreshCw,
  Search,
  Eye,
  FileSpreadsheet,
  Users,
  ArrowUpRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency, formatNumber } from '@/lib/format'
import { getPaymentMethodLabel } from '@/lib/labels'
import { getDashboardStats } from '@/modules/dashboard/dashboard.actions'
import type { DashboardOverview } from '@/modules/dashboard/dashboard.service'
import { PaymentDonut, SalesMonthlyBar, TopProductsBar, LowStockList } from './charts'

export default function DashboardPage() {
  const [data, setData] = useState<DashboardOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchSale, setSearchSale] = useState('')

  async function loadData(showRefresh = false) {
    if (showRefresh) setRefreshing(true)
    try {
      const res = await getDashboardStats()
      setData(res)
    } catch (err) {
      console.error('Error al cargar datos del dashboard:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-card rounded-xl border border-dashed border-border/80" />
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-24 bg-card rounded-xl border border-dashed border-border/80 p-3" />
          ))}
        </div>
        <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
          <div className="h-64 bg-card rounded-xl border border-dashed border-border/80" />
          <div className="h-64 bg-card rounded-xl border border-dashed border-border/80" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="py-12">
        <EmptyState
          icon={AlertTriangle}
          title="Error de Conexión"
          description="No se pudieron sincronizar las métricas operativas."
          action={{ label: 'Recalcular', onClick: () => loadData(true) }}
        />
      </div>
    )
  }

  const {
    salesToday,
    salesThisMonth,
    incomeToday,
    pendingCreditTotal,
    pendingCreditClientsCount,
    inventorySummary,
    clientStats,
    recentSales,
  } = data

  const hasLowStock = inventorySummary.lowStockCount > 0
  const hasOutOfStock = inventorySummary.outOfStockCount > 0

  // Métricas derivadas de hoja de cálculo
  const cashLiquidityRate =
    salesToday.total > 0 ? Math.min(100, Math.round((incomeToday / salesToday.total) * 100)) : 100

  // Distribución del inventario en 3 segmentos: OK, Bajo, Agotado
  const totalItems = inventorySummary.totalProducts || 1
  const outOfStockPct = Math.round((inventorySummary.outOfStockCount / totalItems) * 100)
  const lowStockPct = Math.round((inventorySummary.lowStockCount / totalItems) * 100)
  const healthyStockPct = Math.max(0, 100 - outOfStockPct - lowStockPct)

  const filteredSales = recentSales.filter((s) => {
    if (!searchSale.trim()) return true
    const q = searchSale.toLowerCase()
    return (
      s.invoiceNumber.toLowerCase().includes(q) ||
      (s.client?.name || '').toLowerCase().includes(q) ||
      s.paymentMethod.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-4">
      {/* 1. Barra de Control / Cinta de Hoja de Cálculo (Formula Ribbon Header) */}
      <div className="bg-card border border-dashed border-border/80 dark:border-white/[0.12] rounded-xl p-2.5 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="font-mono text-[11px] font-bold px-2 py-1 rounded bg-muted border border-dashed border-border/70 text-foreground shrink-0">
            SHEET: DASHBOARD_OPERATIVO
          </span>
          <div className="h-4 w-px bg-border/60 shrink-0 hidden sm:block" />
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">SYNC_EN_VIVO</span>
            <span>&bull;</span>
            <span>{new Date().toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Acciones Rápidas de Barra de Fórmulas */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="h-7 px-2.5 rounded-lg text-[11px] font-mono border-dashed shadow-none"
            title="Recalcular métricas"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Recalcular
          </Button>

          <Button
            render={<Link href="/sales" />}
            size="sm"
            className="h-7 px-2.5 rounded-lg text-[11px] font-mono bg-foreground text-background hover:opacity-90 shadow-none font-bold"
          >
            <PlusCircle className="h-3 w-3 mr-1" />
            + Venta Directa
          </Button>
        </div>
      </div>

      {/* 2. Matriz de Celdas Métricas estilo Hoja de Cálculo (A1..H1) */}
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
        {/* Celda A1: Ventas Hoy */}
        <div className="bg-card border border-dashed border-border/80 dark:border-white/[0.12] rounded-xl p-2.5 flex flex-col justify-between hover:border-primary/50 transition-colors">
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
            <span>[A1] VENTAS HOY</span>
            <span className="font-bold text-foreground">{salesToday.count} ops</span>
          </div>
          <div className="my-1.5">
            <div className="text-base sm:text-lg font-bold font-mono text-foreground tracking-tight">
              {formatCurrency(salesToday.total)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground">
              <span>Ticket Prom.</span>
              <span className="font-bold text-foreground">{formatCurrency(salesToday.averageTicket)}</span>
            </div>
            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: salesToday.count > 0 ? '100%' : '0%' }} />
            </div>
          </div>
        </div>

        {/* Celda B1: Recaudo Efectivo */}
        <div className="bg-card border border-dashed border-border/80 dark:border-white/[0.12] rounded-xl p-2.5 flex flex-col justify-between hover:border-emerald-500/50 transition-colors">
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
            <span>[B1] RECAUDO CAJA</span>
            <Wallet className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="my-1.5">
            <div className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
              {formatCurrency(incomeToday)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground">
              <span>Liquidez Inmed.</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{cashLiquidityRate}%</span>
            </div>
            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${cashLiquidityRate}%` }} />
            </div>
          </div>
        </div>

        {/* Celda C1: Utilidad Neta */}
        <div className="bg-card border border-dashed border-border/80 dark:border-white/[0.12] rounded-xl p-2.5 flex flex-col justify-between hover:border-teal-500/50 transition-colors">
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
            <span>[C1] UTILIDAD</span>
            <TrendingUp className="h-3 w-3 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="my-1.5">
            <div className="text-base sm:text-lg font-bold font-mono text-teal-600 dark:text-teal-400 tracking-tight">
              {formatCurrency(salesToday.profit)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground">
              <span>Margen Neto</span>
              <span className="font-bold text-foreground">{salesToday.profitMarginPercent}%</span>
            </div>
            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500"
                style={{ width: `${Math.min(100, Math.max(0, salesToday.profitMarginPercent))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Celda D1: Cartera CxC */}
        <div className="bg-card border border-dashed border-border/80 dark:border-white/[0.12] rounded-xl p-2.5 flex flex-col justify-between hover:border-sky-500/50 transition-colors">
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
            <span>[D1] CARTERA CXC</span>
            <HandCoins className="h-3 w-3 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="my-1.5">
            <div className="text-base sm:text-lg font-bold font-mono text-sky-600 dark:text-sky-400 tracking-tight">
              {formatCurrency(pendingCreditTotal)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground">
              <span>{pendingCreditClientsCount} deudores</span>
              <Link href="/credits" className="font-bold text-primary hover:underline">
                Cobrar &rarr;
              </Link>
            </div>
            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-sky-500" style={{ width: pendingCreditTotal > 0 ? '100%' : '0%' }} />
            </div>
          </div>
        </div>

        {/* Celda E1: Acumulado Mes (MTD) */}
        <div className="bg-card border border-dashed border-border/80 dark:border-white/[0.12] rounded-xl p-2.5 flex flex-col justify-between hover:border-primary/50 transition-colors">
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
            <span>[E1] ACUM. MES (MTD)</span>
            <span className="font-bold text-foreground">{salesThisMonth.count} ops</span>
          </div>
          <div className="my-1.5">
            <div className="text-base sm:text-lg font-bold font-mono text-foreground tracking-tight">
              {formatCurrency(salesThisMonth.total)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground">
              <span>Mes en curso</span>
              <span className="font-bold text-foreground">
                {salesThisMonth.count > 0 ? formatCurrency(Math.round(salesThisMonth.total / salesThisMonth.count)) : '$0'}
              </span>
            </div>
            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500" style={{ width: '100%' }} />
            </div>
          </div>
        </div>

        {/* Celda F1: Ticket Promedio */}
        <div className="bg-card border border-dashed border-border/80 dark:border-white/[0.12] rounded-xl p-2.5 flex flex-col justify-between hover:border-amber-500/50 transition-colors">
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
            <span>[F1] TICKET PROM.</span>
            <Receipt className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="my-1.5">
            <div className="text-base sm:text-lg font-bold font-mono text-amber-600 dark:text-amber-400 tracking-tight">
              {formatCurrency(salesToday.averageTicket)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground">
              <span>Por transacción</span>
              <span className="font-bold text-foreground">{salesToday.count} ops</span>
            </div>
            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500"
                style={{ width: salesToday.count > 0 ? '100%' : '0%' }}
              />
            </div>
          </div>
        </div>

        {/* Celda G1: Salud Inventario */}
        <div className="bg-card border border-dashed border-border/80 dark:border-white/[0.12] rounded-xl p-2.5 flex flex-col justify-between hover:border-destructive/50 transition-colors">
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
            <span>[G1] SALUD CATÁLOGO</span>
            <Package className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className="my-1.5">
            <div className="text-base sm:text-lg font-bold font-mono text-foreground tracking-tight">
              {formatNumber(inventorySummary.totalProducts)} <span className="text-[11px] font-normal text-muted-foreground">ítems</span>
            </div>
          </div>
          <div className="space-y-1">
            {/* Visual Component: 3-Segment Stock Health Bar */}
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex border border-dashed border-border/60">
              <div style={{ width: `${healthyStockPct}%` }} className="h-full bg-emerald-500" title={`Óptimo: ${healthyStockPct}%`} />
              <div style={{ width: `${lowStockPct}%` }} className="h-full bg-amber-500" title={`Bajo Stock: ${lowStockPct}%`} />
              <div style={{ width: `${outOfStockPct}%` }} className="h-full bg-destructive" title={`Agotados: ${outOfStockPct}%`} />
            </div>
            <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground">
              <span className={hasOutOfStock ? 'text-destructive font-bold' : ''}>{inventorySummary.outOfStockCount} agot.</span>
              <span className={hasLowStock ? 'text-amber-600 font-bold' : ''}>{inventorySummary.lowStockCount} bajo</span>
            </div>
          </div>
        </div>

        {/* Celda H1: Base Clientes */}
        <div className="bg-card border border-dashed border-border/80 dark:border-white/[0.12] rounded-xl p-2.5 flex flex-col justify-between hover:border-primary/50 transition-colors">
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
            <span>[H1] CLIENTELA</span>
            <Users className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className="my-1.5">
            <div className="text-base sm:text-lg font-bold font-mono text-foreground tracking-tight">
              {formatNumber(clientStats.totalClients)} <span className="text-[11px] font-normal text-muted-foreground">reg.</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground">
              <span>Nuevos MTD</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">+{clientStats.newClientsThisMonth}</span>
            </div>
            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-teal-500" style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Módulos de Análisis Métrico Visual: Facturación y Tesorería */}
      <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
        <SalesMonthlyBar data={data.salesByMonth || []} />
        <PaymentDonut data={data.salesByPayment || []} />
      </div>

      {/* 4. Módulos Secundarios: Pareto de Rotación y Semáforo de Abastecimiento */}
      <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
        <TopProductsBar data={data.topProducts || []} />
        <LowStockList data={inventorySummary.lowStockProducts || []} />
      </div>

      {/* 5. Celda Operativa / Libro Diario de Ventas tipo Hoja de Cálculo (Ancho Completo) */}
      <Card className="border border-dashed border-border/80 dark:border-white/[0.12] bg-card rounded-2xl shadow-2xs">
        <CardHeader className="py-2.5 px-3.5 border-b border-dashed border-border/60 dark:border-white/[0.08]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted border border-dashed border-border/70 text-muted-foreground">
                LEDGER.01
              </span>
              <h3 className="text-xs font-bold tracking-tight text-foreground uppercase">
                Libro Diario // Últimas Operaciones Registradas
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-36 sm:w-48">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  type="search"
                  placeholder="Filtrar ventas..."
                  value={searchSale}
                  onChange={(e) => setSearchSale(e.target.value)}
                  className="h-6.5 pl-6 pr-2 text-[10px] font-mono rounded-lg bg-muted/40 border-dashed"
                />
              </div>
              <Link
                href="/sales"
                className="font-mono text-[10px] text-primary hover:underline font-bold inline-flex items-center gap-1 shrink-0"
              >
                Historial completo <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          {filteredSales.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-muted-foreground">
              SIN_OPERACIONES_REGISTRADAS
            </div>
          ) : (
            <div className="border border-dashed border-border/70 dark:border-white/[0.08] rounded-xl overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-dashed border-border/60 dark:border-white/[0.08] text-muted-foreground uppercase text-[10px] font-mono">
                    <th className="py-2 px-3">Comprobante</th>
                    <th className="py-2 px-3">Cliente</th>
                    <th className="py-2 px-3 text-center">Canal de Pago</th>
                    <th className="py-2 px-3 text-center">Fecha / Hora</th>
                    <th className="py-2 px-3 text-right">Total Facturado</th>
                    <th className="py-2 px-3 text-center w-16">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashed divide-border/40 dark:divide-white/[0.06] font-mono text-[11px]">
                  {filteredSales.slice(0, 8).map((sale) => (
                    <tr key={sale.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 font-bold text-foreground">
                        <Link href={`/sales/${sale.id}`} className="hover:underline">
                          {sale.invoiceNumber}
                        </Link>
                      </td>
                      <td className="py-2 px-3 font-sans font-medium text-foreground truncate max-w-[180px]">
                        {sale.client?.name || 'Cliente general'}
                      </td>
                      <td className="py-2 px-3 text-center text-muted-foreground">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 border border-dashed border-border/60">
                          {getPaymentMethodLabel(sale.paymentMethod)}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center text-muted-foreground">
                        {new Date(sale.saleDate).toLocaleDateString([], {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-foreground">
                        {formatCurrency(sale.total)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            href={`/sales/${sale.id}`}
                            title="Ver detalle"
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                          <Link
                            href={`/sales/${sale.id}/invoice`}
                            title="Factura PDF"
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
