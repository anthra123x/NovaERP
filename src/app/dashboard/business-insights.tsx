'use client'

import React from 'react'
import Link from 'next/link'
import { Sparkles, Package, Wallet, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { formatCurrency } from '@/lib/format'
import type { DashboardOverview } from '@/modules/dashboard/dashboard.service'
import type { SectorProfile } from '@/lib/business-workflow'

interface BusinessInsightsProps {
  data: DashboardOverview
  profile: SectorProfile
}

export function BusinessInsights({ data, profile }: BusinessInsightsProps) {
  const { inventorySummary, pendingCreditTotal, pendingCreditClientsCount, salesToday } = data

  // 1. Diagnóstico de Stock
  const hasOut = inventorySummary.outOfStockCount > 0
  const hasLow = inventorySummary.lowStockCount > 0

  const stockState = hasOut
    ? {
        type: 'critical',
        badge: 'CRÍTICO // AGOTADOS',
        badgeClass: 'bg-destructive/10 text-destructive border-destructive/30',
        icon: AlertCircle,
        title: `${inventorySummary.outOfStockCount} ${profile.labels.plural.toLowerCase()} agotados`,
        message: `Riesgo de quiebre en caja. Hay existencias en cero que impiden facturación inmediata.`,
        actionLabel: `Reponer ${profile.labels.plural}`,
        actionHref: '/inventory',
      }
    : hasLow
      ? {
          type: 'warning',
          badge: 'PREVENTIVO // STOCK BAJO',
          badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
          icon: AlertCircle,
          title: `${inventorySummary.lowStockCount} ${profile.labels.plural.toLowerCase()} bajo el mínimo`,
          message: `El catálogo se acerca al umbral de seguridad. Se recomienda emitir órdenes de compra.`,
          actionLabel: 'Revisar inventario',
          actionHref: '/inventory',
        }
      : {
          type: 'ok',
          badge: 'ÓPTIMO // BALANCE',
          badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          icon: CheckCircle2,
          title: `Existencias estables`,
          message: `Todas las líneas de ${profile.labels.plural.toLowerCase()} se encuentran sobre los umbrales mínimos establecidos.`,
          actionLabel: `Añadir ${profile.labels.singular.toLowerCase()}`,
          actionHref: '/inventory/new',
        }

  // 2. Diagnóstico de Tesorería & Crédito
  const creditState =
    pendingCreditTotal > 0
      ? {
          badge: 'CARTERA PENDIENTE',
          badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30',
          title: `${formatCurrency(pendingCreditTotal)} en cartera`,
          message: `Distribuido en ${pendingCreditClientsCount} ${profile.labels.clientRole.toLowerCase()}(s). El flujo de caja requiere cobros oportunos.`,
          actionLabel: 'Cobrar cartera',
          actionHref: '/credits',
        }
      : {
          badge: 'LIQUIDEZ 100%',
          badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          title: 'Sin cuentas por cobrar',
          message: `La totalidad de las ventas registradas hasta la fecha han sido recaudadas de contado.`,
          actionLabel: 'Historial de ventas',
          actionHref: '/sales',
        }

  // 3. Recomendación Sectorial Dinámica
  const sectorTips: Record<string, string> = {
    technology_repair:
      'Garantía técnica sugerida: 90 días en repuestos. Asegúrate de registrar el IMEI o número de serie en cada recepción.',
    fashion_apparel:
      'Margen objetivo sugerido: 50%. Vigila la rotación de colecciones por tallas y colores para prevenir inventario estancado.',
    pharmacy_health:
      'Control sanitario riguroso: verifica lotes y fechas de vencimiento de medicamentos para evitar mermas operativas.',
    grocery_supermarket:
      'Alta rotación en mostrador: mantén activo el escaneo continuo para agilizar el despacho y reducir filas en caja.',
    hardware_construction:
      'Ventas por volumen: aplica margen objetivo del 30% y gestiona cotizaciones previas antes de despachos grandes.',
    services_workshop:
      'Mano de obra y servicios: margen del 45% recomendado. Registra el costo de partes por separado de la labor.',
    retail_general:
      'Venta ágil de mostrador: mantén el margen sugerido del 35% y confirma disponibilidad antes de cerrar la factura.',
  }

  const activeSectorTip = sectorTips[profile.tag.toLowerCase()] || sectorTips.retail_general || profile.description

  return (
    <Card className="border border-dashed border-border/80 dark:border-white/[0.12] bg-card rounded-2xl shadow-2xs">
      <CardHeader className="py-2.5 px-3.5 border-b border-dashed border-border/60 dark:border-white/[0.08]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-dashed border-primary/30 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              AI.COPILOT
            </span>
            <h3 className="text-xs font-bold tracking-tight text-foreground uppercase flex items-center gap-1.5">
              <span>Diagnósticos Operativos del Negocio</span>
              <span className="text-muted-foreground font-mono font-normal">
                {`// ${profile.title} [${profile.tag}]`}
              </span>
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              REGLAS_ADAPTATIVAS_ACTIVAS
            </span>
            <Link
              href="/assistant"
              className="font-mono text-[10px] text-primary hover:underline font-bold inline-flex items-center gap-1"
            >
              Abrir Asistente IA <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Tarjeta 1: Abastecimiento */}
          <div className="p-3 rounded-xl border border-dashed border-border/70 dark:border-white/[0.08] bg-muted/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${stockState.badgeClass}`}>
                  {stockState.badge}
                </span>
                <Package className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <h4 className="text-xs font-bold text-foreground tracking-tight">{stockState.title}</h4>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{stockState.message}</p>
            </div>
            <div className="mt-3 pt-2 border-t border-dashed border-border/50 flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted-foreground">Catálogo: {data.inventorySummary.totalProducts}</span>
              <Link
                href={stockState.actionHref}
                className="text-[11px] font-mono text-primary hover:underline font-bold flex items-center gap-1"
              >
                {stockState.actionLabel} &rarr;
              </Link>
            </div>
          </div>

          {/* Tarjeta 2: Cartera & Flujo de Caja */}
          <div className="p-3 rounded-xl border border-dashed border-border/70 dark:border-white/[0.08] bg-muted/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${creditState.badgeClass}`}>
                  {creditState.badge}
                </span>
                <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <h4 className="text-xs font-bold text-foreground tracking-tight">{creditState.title}</h4>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{creditState.message}</p>
            </div>
            <div className="mt-3 pt-2 border-t border-dashed border-border/50 flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted-foreground">Ventas hoy: {salesToday.count}</span>
              <Link
                href={creditState.actionHref}
                className="text-[11px] font-mono text-primary hover:underline font-bold flex items-center gap-1"
              >
                {creditState.actionLabel} &rarr;
              </Link>
            </div>
          </div>

          {/* Tarjeta 3: Estrategia de Sector & Margen */}
          <div className="p-3 rounded-xl border border-dashed border-border/70 dark:border-white/[0.08] bg-muted/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border bg-primary/10 text-primary border-primary/30">
                  ESTRATEGIA // MARGEN {profile.suggestedMargin}%
                </span>
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <h4 className="text-xs font-bold text-foreground tracking-tight">{profile.title}</h4>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{activeSectorTip}</p>
            </div>
            <div className="mt-3 pt-2 border-t border-dashed border-border/50 flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted-foreground">{profile.labels.unit}</span>
              <Link
                href="/admin"
                className="text-[11px] font-mono text-primary hover:underline font-bold flex items-center gap-1"
              >
                Ajustar sector &rarr;
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
