import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import {
  DEFAULT_BUSINESS_WORKFLOW,
  getSectorProfile,
  type BusinessSector,
  type BusinessWorkflowConfig,
} from '@/lib/business-workflow'
import { loadAiConfig } from '@/modules/ai/ai.config'
import { completeWithRotation } from '@/modules/ai/ai.rotation'

export async function getOrCreateSettings() {
  const existing = await prisma.systemSettings.findFirst()
  if (existing) return existing
  return await prisma.systemSettings.create({ data: {} })
}

export type SettingsData = {
  companyName: string
  companyNit: string | null
  companyAddress: string | null
  companyCity: string | null
  companyPhone: string | null
  companyEmail: string | null
  currency: string
  invoicePrefix: string
  invoiceFooter: string | null
  lowStockThreshold: number
  nextInvoiceNumber?: number
  nextWebOrderNumber?: number
  webPendingExpiryHours?: number
}

export async function updateSettings(data: Partial<SettingsData>) {
  const settings = await getOrCreateSettings()
  return await prisma.systemSettings.update({
    where: { id: settings.id },
    data,
  })
}

export async function getBusinessWorkflowConfig(): Promise<BusinessWorkflowConfig> {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: 'business_workflow' },
  })

  if (!setting || typeof setting.value !== 'object' || setting.value === null) {
    return { ...DEFAULT_BUSINESS_WORKFLOW }
  }

  return {
    ...DEFAULT_BUSINESS_WORKFLOW,
    ...(setting.value as Partial<BusinessWorkflowConfig>),
  }
}

export async function updateBusinessWorkflowConfig(
  config: Partial<BusinessWorkflowConfig>,
): Promise<BusinessWorkflowConfig> {
  const current = await getBusinessWorkflowConfig()
  const updated: BusinessWorkflowConfig = {
    ...current,
    ...config,
  }

  await prisma.storeSetting.upsert({
    where: { key: 'business_workflow' },
    create: {
      key: 'business_workflow',
      value: updated as unknown as Prisma.InputJsonValue,
    },
    update: {
      value: updated as unknown as Prisma.InputJsonValue,
    },
  })

  return updated
}

export const SECTOR_STARTER_CATEGORIES: Record<
  BusinessSector,
  Array<{ name: string; slug: string; color: string }>
> = {
  technology_repair: [
    { name: 'Smartphones y Celulares', slug: 'smartphones-celulares', color: '#3b82f6' },
    { name: 'Computadores y Laptops', slug: 'computadores-laptops', color: '#6366f1' },
    { name: 'Repuestos y Pantallas', slug: 'repuestos-pantallas', color: '#06b6d4' },
    { name: 'Accesorios y Periféricos', slug: 'accesorios-perifericos', color: '#8b5cf6' },
    { name: 'Servicio Técnico', slug: 'servicio-tecnico', color: '#10b981' },
  ],
  fashion_apparel: [
    { name: 'Prendas Superiores (Blusas/Camisas)', slug: 'prendas-superiores', color: '#ec4899' },
    { name: 'Prendas Inferiores (Pantalones/Jeans)', slug: 'prendas-inferiores', color: '#a855f7' },
    { name: 'Vestidos y Conjuntos', slug: 'vestidos-conjuntos', color: '#f43f5e' },
    { name: 'Calzado', slug: 'calzado', color: '#f97316' },
    { name: 'Accesorios y Carteras', slug: 'accesorios-carteras', color: '#eab308' },
  ],
  grocery_supermarket: [
    { name: 'Abarrotes y Despensa', slug: 'abarrotes-despensa', color: '#f59e0b' },
    { name: 'Lácteos y Refrigerados', slug: 'lacteos-refrigerados', color: '#3b82f6' },
    { name: 'Bebidas y Refrescos', slug: 'bebidas-refrescos', color: '#06b6d4' },
    { name: 'Aseo del Hogar', slug: 'aseo-hogar', color: '#10b981' },
    { name: 'Snacks y Confitería', slug: 'snacks-confiteria', color: '#ef4444' },
  ],
  hardware_construction: [
    { name: 'Herramientas Manuales', slug: 'herramientas-manuales', color: '#ea580c' },
    { name: 'Herramientas Eléctricas', slug: 'herramientas-electricas', color: '#f59e0b' },
    { name: 'Tornillería y Fijaciones', slug: 'tornilleria-fijaciones', color: '#64748b' },
    { name: 'Pinturas y Solventes', slug: 'pinturas-solventes', color: '#8b5cf6' },
    { name: 'Fontanería y Tuberías', slug: 'fontaneria-tuberias', color: '#0284c7' },
    { name: 'Materiales Eléctricos', slug: 'materiales-electricos', color: '#eab308' },
  ],
  pharmacy_health: [
    { name: 'Medicamentos Éticos y Fórmulas', slug: 'medicamentos-eticos', color: '#2563eb' },
    { name: 'Medicamentos Genéricos', slug: 'medicamentos-genericos', color: '#059669' },
    { name: 'Cuidado Personal y Aseo', slug: 'cuidado-personal', color: '#06b6d4' },
    { name: 'Primeros Auxilios y Curación', slug: 'primeros-auxilios', color: '#dc2626' },
    { name: 'Vitaminas y Suplementos', slug: 'vitaminas-suplementos', color: '#d97706' },
  ],
  services_workshop: [
    { name: 'Mano de Obra y Mantenimiento', slug: 'mano-de-obra-mantenimiento', color: '#10b981' },
    { name: 'Repuestos Mecánicos', slug: 'repuestos-mecanicos', color: '#ea580c' },
    { name: 'Lubricantes y Fluidos', slug: 'lubricantes-fluidos', color: '#d97706' },
    { name: 'Diagnóstico y Revisión', slug: 'diagnostico-revision', color: '#6366f1' },
    { name: 'Consumibles de Taller', slug: 'consumibles-taller', color: '#64748b' },
  ],
  retail_general: [
    { name: 'Productos Principales', slug: 'productos-principales', color: '#3b82f6' },
    { name: 'Novedades y Temporada', slug: 'novedades-temporada', color: '#10b981' },
    { name: 'Accesorios Varios', slug: 'accesorios-varios', color: '#f59e0b' },
    { name: 'Promociones y Ofertas', slug: 'promociones-ofertas', color: '#ef4444' },
  ],
}

const SECTOR_DEFAULT_SLOGANS: Record<BusinessSector, string> = {
  technology_repair: 'Servicio técnico especializado y tecnología de vanguardia',
  fashion_apparel: 'Estilo, vanguardia y calidad en cada prenda',
  grocery_supermarket: 'Frescura, variedad y los mejores precios para tu despensa',
  hardware_construction: 'Soluciones integrales para la construcción y el hogar',
  pharmacy_health: 'Salud, bienestar y asesoría farmacéutica confiable',
  services_workshop: 'Mantenimiento preventivo, repuestos y diagnóstico profesional',
  retail_general: 'Calidad, confianza y el mejor surtido',
}

export function classifyBusinessSector(text: string): {
  sector: BusinessSector
  confidence: number
  matches: string[]
} {
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  const dictionary: Record<BusinessSector, string[]> = {
    technology_repair: [
      'celular', 'celulares', 'telefono', 'smartphone', 'computador', 'laptop', 'tecnico', 'reparacion',
      'pantalla', 'pantallas', 'electronica', 'software', 'hardware', 'cable', 'cables', 'bateria', 'apple', 'samsung',
      'xiaomi', 'tablet', 'auriculares', 'audifonos', 'cargador',
    ],
    fashion_apparel: [
      'ropa', 'vestido', 'vestidos', 'moda', 'boutique', 'talla', 'tallas', 'pantalon', 'pantalones',
      'camisa', 'camisas', 'blusa', 'blusas', 'calzado', 'zapatos', 'tenis', 'falda', 'textil',
      'confeccion', 'chaqueta', 'jeans', 'cartera', 'prendas',
    ],
    grocery_supermarket: [
      'supermercado', 'tienda de barrio', 'viveres', 'abarrotes', 'alimento', 'alimentos', 'granos',
      'arroz', 'aceite', 'leche', 'lacteos', 'bebidas', 'gaseosa', 'cerveza', 'snacks', 'frutas',
      'verduras', 'carniceria', 'despensa', 'minimarket',
    ],
    hardware_construction: [
      'ferreteria', 'construccion', 'cemento', 'tornillo', 'tornillos', 'herramienta', 'herramientas',
      'pintura', 'pinturas', 'tubo', 'tuberias', 'pvc', 'taladro', 'electrico', 'plomeria', 'fontaneria',
      'disco', 'lija', 'brocha', 'clavos', 'martillo',
    ],
    pharmacy_health: [
      'farmacia', 'drogueria', 'medicamento', 'medicamentos', 'pastilla', 'pastillas', 'jarabe',
      'salud', 'remedio', 'inyeccion', 'formula medica', 'curacion', 'gasas', 'alcohol', 'vitamina',
      'vitaminas', 'receta', 'botiquin',
    ],
    services_workshop: [
      'taller', 'mecanico', 'mecanica', 'moto', 'motos', 'auto', 'autos', 'vehiculo', 'aceite',
      'lubricante', 'frenos', 'suspension', 'mano de obra', 'mantenimiento', 'revision', 'alineacion',
      'latoneria', 'pintura automotriz', 'repuestos',
    ],
    retail_general: [
      'tienda', 'comercio', 'articulos', 'variedades', 'bazar', 'papeleria', 'regalos', 'detalles',
      'distribuidora', 'venta directa',
    ],
  }

  const scores: Record<BusinessSector, { count: number; matches: string[] }> = {
    technology_repair: { count: 0, matches: [] },
    fashion_apparel: { count: 0, matches: [] },
    grocery_supermarket: { count: 0, matches: [] },
    hardware_construction: { count: 0, matches: [] },
    pharmacy_health: { count: 0, matches: [] },
    services_workshop: { count: 0, matches: [] },
    retail_general: { count: 0, matches: [] },
  }

  for (const [sec, keywords] of Object.entries(dictionary) as [BusinessSector, string[]][]) {
    for (const kw of keywords) {
      if (normalized.includes(kw)) {
        scores[sec].count += 1
        scores[sec].matches.push(kw)
      }
    }
  }

  let bestSector: BusinessSector = 'retail_general'
  let highestScore = 0

  for (const [sec, result] of Object.entries(scores) as [BusinessSector, { count: number; matches: string[] }][]) {
    if (result.count > highestScore) {
      highestScore = result.count
      bestSector = sec
    }
  }

  return {
    sector: bestSector,
    confidence: highestScore > 0 ? Math.min(highestScore / 4, 1) : 0.2,
    matches: scores[bestSector].matches,
  }
}

export interface AutoConfigResult {
  sector: BusinessSector
  sectorTitle: string
  sectorTag: string
  suggestedMargin: number
  workflow: BusinessWorkflowConfig
  categoriesCreated: string[]
  explanation: string
  usedAiModel?: string
}

export async function autoConfigureBusinessWithAi(description: string): Promise<AutoConfigResult> {
  const aiConfig = loadAiConfig()
  let detectedSector: BusinessSector | null = null
  let extractedSlogan: string | null = null
  let extractedCompany: string | null = null
  let extractedMargin: number | null = null
  let usedAiModel: string | undefined

  if (aiConfig.enabled) {
    try {
      const response = await completeWithRotation({
        system:
          'Eres un arquitecto de ERP empresarial. Analiza la descripción libre del negocio y clasifícalo en exactamente uno de estos sectores: ["technology_repair", "fashion_apparel", "grocery_supermarket", "hardware_construction", "pharmacy_health", "services_workshop", "retail_general"]. Devuelve SOLO un JSON con: {"sector": string, "companyName": string | null, "slogan": string | null, "suggestedMargin": number}.',
        messages: [{ role: 'user', content: description }],
      })
      usedAiModel = `${response.agent.provider} · ${response.agent.model}`
      const jsonMatch = response.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.sector && Object.keys(SECTOR_STARTER_CATEGORIES).includes(parsed.sector)) {
          detectedSector = parsed.sector as BusinessSector
        }
        if (typeof parsed.slogan === 'string' && parsed.slogan.trim()) {
          extractedSlogan = parsed.slogan.trim()
        }
        if (typeof parsed.companyName === 'string' && parsed.companyName.trim()) {
          extractedCompany = parsed.companyName.trim()
        }
        if (typeof parsed.suggestedMargin === 'number' && parsed.suggestedMargin > 0) {
          extractedMargin = parsed.suggestedMargin
        }
      }
    } catch {
      // Fallback a análisis heurístico NLP
    }
  }

  const classification = classifyBusinessSector(description)
  const sector: BusinessSector = detectedSector || classification.sector
  const profile = getSectorProfile(sector)
  const slogan = extractedSlogan || SECTOR_DEFAULT_SLOGANS[sector] || profile.features[0] || 'Calidad y servicio'
  const margin = extractedMargin || profile.suggestedMargin

  if (extractedCompany) {
    await updateSettings({ companyName: extractedCompany })
  }

  const newWorkflow: Partial<BusinessWorkflowConfig> = {
    sector,
    slogan,
    defaultProfitMargin: margin,
    allowCreditSales: sector !== 'grocery_supermarket',
    requireClientOnSale: sector === 'technology_repair' || sector === 'services_workshop',
    allowNegativeStock: false,
    allowCashierDiscounts: sector === 'fashion_apparel' || sector === 'retail_general',
    autoPrintReceipt: sector === 'grocery_supermarket',
    barcodeContinuousScan: sector !== 'services_workshop',
    requireAdjustmentReason: true,
    ...(extractedCompany ? { companyName: extractedCompany } : {}),
  }

  const updatedConfig = await updateBusinessWorkflowConfig(newWorkflow)

  const starterCategories = SECTOR_STARTER_CATEGORIES[sector] || []
  const createdCategoryNames: string[] = []

  for (const cat of starterCategories) {
    const existing = await prisma.productCategory.findFirst({
      where: {
        OR: [{ slug: cat.slug }, { name: cat.name }],
      },
    })

    if (!existing) {
      await prisma.productCategory.create({
        data: {
          name: cat.name,
          slug: cat.slug,
          color: cat.color,
        },
      })
      createdCategoryNames.push(cat.name)
    }
  }

  const explanation = `ERP adaptado con éxito a ${profile.title} [${profile.tag}]. Margen objetivo configurado al ${margin}%. Se aseguraron ${createdCategoryNames.length} categorías iniciales.`

  return {
    sector,
    sectorTitle: profile.title,
    sectorTag: profile.tag,
    suggestedMargin: margin,
    workflow: updatedConfig,
    categoriesCreated: createdCategoryNames,
    explanation,
    usedAiModel,
  }
}

