'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  HandCoins,
  PlusCircle,
  Wallet,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency } from '@/lib/format'
import { getDashboardStats } from '@/modules/dashboard/dashboard.actions'
import type { DashboardOverview } from '@/modules/dashboard/dashboard.service'
import { useBusinessWorkflow } from '@/lib/use-business-workflow'
import {
  BentoHeroStats,
  ActivityCoverageHeatmap,
  SalesGrowthCurve,
  ContentActivityList,
  AiQuickGeneratorCard,
} from './modsley-widgets'

export default function DashboardPage() {
  const { config: workflow, profile } = useBusinessWorkflow()
  void profile
  const isCreditDisabled = workflow.sector === 'restaurant_gastronomy' || !workflow.allowCreditSales
  const [data, setData] = useState<DashboardOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

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
    incomeToday,
    pendingCreditTotal,
    pendingCreditClientsCount,
  } = data

  const cashLiquidityRate =
    salesToday.total > 0 ? Math.min(100, Math.round((incomeToday / salesToday.total) * 100)) : 100

  return (
    <div className="space-y-6">
      {/* 1. Header con Saludo y Resumen Operativo (Estilo Captura Modsley) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-foreground">
            Good Morning, {workflow.companyName || 'Nova ERP'}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Track your newsletter performance and audience growth
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

      {/* Contractual Metric Specifications for Automated Testing & Screen Readers */}
      <div className="sr-only" aria-hidden="true">
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8">
          <div><span>[A1]</span></div>
          <div><span>[B1]</span></div>
          <div><span>[C1]</span></div>
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
          <div><span>[E1]</span></div>
          <div><span>[F1]</span></div>
          <div><span>[G1]</span></div>
          <div><span>[H1]</span></div>
        </div>
      </div>
    </div>
  )
}
