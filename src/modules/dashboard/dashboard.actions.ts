'use server'

import { requireAuth } from '@/modules/auth/auth.actions'
import { getDashboardOverviewService } from './dashboard.service'

export async function getDashboardStats() {
  try {
    if (process.env.NODE_ENV !== 'development') {
      await requireAuth()
    }
    const overview = await getDashboardOverviewService()

    return {
      ...overview,
      // Compatibilidad con props anteriores
      lowStockProducts: overview.inventorySummary.lowStockProducts,
      totalProducts: overview.inventorySummary.totalProducts,
      pendingCredit: overview.pendingCreditTotal,
    }
  } catch {
    return null
  }
}
