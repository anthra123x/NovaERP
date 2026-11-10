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
  ChevronDown,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency, formatNumber } from '@/lib/format'
import { getPaymentMethodLabel } from '@/lib/labels'
import { getDashboardStats } from '@/modules/dashboard/dashboard.actions'
import type { DashboardOverview } from '@/modules/dashboard/dashboard.service'
import { PaymentDonut, TopProductsBar } from './charts'
import { useBusinessWorkflow } from '@/lib/use-business-workflow'
import { BusinessInsights } from './business-insights'
import {
  BentoHeroStats,
  ActivityCoverageHeatmap,
  SalesGrowthCurve,
  ContentActivityList,
  AiQuickGeneratorCard,
} from './modsley-widgets'

export default function DashboardPage() {
  const { config: workflow, profile } = useBusinessWorkflow()
  const isCreditDisabled = workflow.sector === 'restaurant_gastronomy' || !workflow.allowCreditSales
  const [data, setData] = useState<DashboardOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchSale, setSearchSale] = useState('')
  const [showDetailedLedger, setShowDetailedLedger] = useState(true)

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

    const handleRefreshEvent = () => loadData(true)
    window.addEventListener('nova_refresh_dashboard', handleRefreshEvent)
    return () => window.removeEventListener('nova_refresh_dashboard', handleRefreshEvent)
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-14 bg-card rounded-2xl border border-border/80" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-card rounded-2xl border border-border/80 p-4" />
          ))}
        </div>
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-24 bg-card rounded-xl border border-border/80 p-3" />
          ))}
        </div>
        <div className="grid gap-5 grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-8 h-80 bg-card rounded-2xl border border-border/80" />
          <div className="lg:col-span-4 h-80 bg-card rounded-2xl border border-border/80" />
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
    <div className="space-y-6">
      {/* 1. Header con Saludo y Resumen Operativo (Estilo Captura Modsley) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-foreground">
            Good Morning, {workflow.companyName || 'Nova ERP'}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Track your commercial performance, inventory turnover, and audience growth in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="h-8 px-3 rounded-xl text-xs font-medium border-border/80 hover:bg-muted"
            title="Recalcular métricas"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Recalcular
          </Button>

          <Button
            render={<Link href="/sales/new" />}
            size="sm"
            className="h-8 px-3.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 shadow-xs"
          >
            <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
            + New Campaign
          </Button>
        </div>
      </div>

      {/* 2. Cuatro Tarjetas Bento Hero Superiores (Estilo Captura) */}
      <BentoHeroStats
        data={data}
        isCreditDisabled={isCreditDisabled}
        cashLiquidityRate={cashLiquidityRate}
      />

      {/* 3. Grid Asimétrico Principal: Columna Izquierda (8 cols) y Columna Derecha (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Columna Izquierda: Activity Coverage Rate + Subscriber Growth */}
        <div className="lg:col-span-8 space-y-5">
          {/* Card 1: Activity Coverage Rate */}
          <ActivityCoverageHeatmap />

          {/* Card 2: Subscriber Growth & Tendencia de Facturación */}
          <SalesGrowthCurve salesByMonth={data.salesByMonth || []} />
        </div>

        {/* Columna Derecha: Content Activity + Subject Line Generator (IA) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Card 1: Content Activity */}
          <ContentActivityList
            recentSales={data.recentSales}
            lowStockProducts={data.inventorySummary.lowStockProducts}
            webOrders={data.webOrdersSummary.pendingOrders}
          />

          {/* Card 2: Subject Line Generator / Asistente IA */}
          <AiQuickGeneratorCard />
        </div>
      </div>

      {/* 4. Diagnósticos Proactivos e Insights Cognitivos (Copiloto AI) */}
      <BusinessInsights data={data} profile={profile} workflow={workflow} />

      {/* 5. Módulo Desplegable de Indicadores Contables & Matriz Operativa (A1..H1) */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-muted border border-border/70 text-foreground">
              OPERATIONS MATRIX
            </span>
            <span className="text-xs font-bold text-foreground uppercase tracking-tight">
              Indicadores Operativos &amp; Celdas Contables
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowDetailedLedger(!showDetailedLedger)}
            className="text-xs text-muted-foreground hover:text-foreground font-mono flex items-center gap-1 cursor-pointer"
          >
            <span>{showDetailedLedger ? 'Contraer matriz' : 'Expandir matriz'}</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showDetailedLedger ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showDetailedLedger && (
          <div className="space-y-4">
            {/* Matriz de Celdas Métricas estilo Hoja de Cálculo (A1..H1) */}
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8">
              {/* Celda A1: Ventas Hoy */}
              <div className="bg-card border border-border/80 dark:border-white/[0.12] rounded-xl p-2.5 flex flex-col justify-between hover:border-primary/50 transition-colors">
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
              <div className="bg-card border border-border/80 dark:border-white/[0.12] rounded-xl p-2.5 flex flex-col justify-between hover:border-emerald-500/50 transition-colors">
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
              <div className="bg-card border border-border/80 dark:border-white/[0.12] rounded-xl p-2.5 flex flex-col justify-between hover:border-teal-500/50 transition-colors">
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

              {/* Celda D1: Cobro Contado o Cartera CxC */}
              {isCreditDisabled ? (
          <div className="bg-card border border-dashed border-border/80 dark:border-white/[0.12] rounded-xl p-2.5 flex flex-col justify-between hover:border-emerald-500/50 transition-colors">
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>[D1] COBRO CONTADO</span>
              <Wallet className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="my-1.5">
              <div className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
                {formatCurrency(incomeToday)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground">
                <span>Recaudado en caja hoy</span>
                <Link href="/sales" className="font-bold text-primary hover:underline">
                  Ventas &rarr;
                </Link>
              </div>
              <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: incomeToday > 0 ? '100%' : '0%' }} />
              </div>
            </div>
          </div>
        ) : (
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
        )}

              {/* Celda E1: Acumulado Mes (MTD) */}
              <div className="bg-card border border-border/80 dark:border-white/[0.12] rounded-xl p-2.5 flex flex-col justify-between hover:border-primary/50 transition-colors">
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
              <div className="bg-card border border-border/80 dark:border-white/[0.12] rounded-xl p-2.5 flex flex-col justify-between hover:border-amber-500/50 transition-colors">
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
              <div className="bg-card border border-border/80 dark:border-white/[0.12] rounded-xl p-2.5 flex flex-col justify-between hover:border-destructive/50 transition-colors">
                <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                  <span>[G1] SALUD CATÁLOGO</span>
                  <Package className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="my-1.5">
                  <div className="text-base sm:text-lg font-bold font-mono text-foreground tracking-tight">
                    {formatNumber(inventorySummary.totalProducts)}{' '}
                    <span className="text-[11px] font-normal text-muted-foreground">{profile.labels.unit}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  {/* Visual Component: 3-Segment Stock Health Bar */}
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex border border-border/60">
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
              <div className="bg-card border border-border/80 dark:border-white/[0.12] rounded-xl p-2.5 flex flex-col justify-between hover:border-primary/50 transition-colors">
                <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                  <span>[H1] {profile.labels.clientRole.toUpperCase()}S</span>
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

            {/* Módulos de Gráficos de Detalle */}
            <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
              <PaymentDonut data={data.salesByPayment || []} />
              <TopProductsBar data={data.topProducts || []} />
            </div>

            {/* Libro Diario de Ventas */}
            <Card className="border border-border/80 dark:border-white/[0.08] bg-card rounded-2xl shadow-xs">
              <CardHeader className="py-3 px-4 border-b border-border/60">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted border border-border/70 text-muted-foreground">
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
                        className="h-7 pl-6 pr-2 text-[10px] font-mono rounded-lg bg-muted/40 border-border/70"
                      />
                    </div>
                    <Link
                      href="/sales"
                      className="font-mono text-[10px] text-foreground hover:underline font-bold inline-flex items-center gap-1 shrink-0"
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
                  <div className="border border-border/70 dark:border-white/[0.08] rounded-xl overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border/60 text-muted-foreground uppercase text-[10px] font-mono">
                          <th className="py-2 px-3">Comprobante</th>
                          <th className="py-2 px-3">Cliente</th>
                          <th className="py-2 px-3 text-center">Canal de Pago</th>
                          <th className="py-2 px-3 text-center">Fecha / Hora</th>
                          <th className="py-2 px-3 text-right">Total Facturado</th>
                          <th className="py-2 px-3 text-center w-16">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 font-mono text-[11px]">
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
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 border border-border/60">
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
        )}
      </div>
    </div>
  )
}
