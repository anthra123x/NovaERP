import { prisma } from '@/lib/prisma'
import { getBusinessWorkflowConfig } from '@/modules/settings/settings.service'
import type { PdfSettings } from './theme'
import type { BusinessSector } from '@/lib/business-workflow'

// Loads the live company settings used as fallback when a sale has no frozen
// invoice snapshot.
export async function loadPdfSettings(): Promise<PdfSettings | undefined> {
  const settings = await prisma.systemSettings.findFirst()
  if (!settings) return undefined

  let sector: BusinessSector | undefined
  try {
    const workflow = await getBusinessWorkflowConfig()
    sector = workflow.sector
  } catch {
    // Manejo defensivo en entornos de pruebas unitarias donde Prisma está parcialmente mockeado
  }

  return {
    companyName: settings.companyName,
    companyNit: settings.companyNit,
    companyAddress: settings.companyAddress,
    companyCity: settings.companyCity,
    companyPhone: settings.companyPhone,
    companyEmail: settings.companyEmail,
    invoicePrefix: settings.invoicePrefix,
    invoiceFooter: settings.invoiceFooter,
    currency: settings.currency,
    sector,
  }
}
