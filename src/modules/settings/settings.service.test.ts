import { describe, it, expect, beforeEach, vi } from 'vitest'

const { findFirst, create, update, findUnique, upsert, catFindFirst, catCreate } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  findUnique: vi.fn(),
  upsert: vi.fn(),
  catFindFirst: vi.fn(),
  catCreate: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    systemSettings: { findFirst, create, update },
    storeSetting: { findUnique, upsert },
    productCategory: { findFirst: catFindFirst, create: catCreate },
  },
}))

import {
  getOrCreateSettings,
  updateSettings,
  getBusinessWorkflowConfig,
  updateBusinessWorkflowConfig,
  classifyBusinessSector,
  autoConfigureBusinessWithAi,
} from './settings.service'
import { DEFAULT_BUSINESS_WORKFLOW } from '@/lib/business-workflow'

describe('getOrCreateSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns existing settings row when one exists', async () => {
    const existing = { id: 's1', companyName: 'Cilmax' }
    findFirst.mockResolvedValue(existing)

    const result = await getOrCreateSettings()

    expect(result).toEqual(existing)
    expect(findFirst).toHaveBeenCalledTimes(1)
    expect(create).not.toHaveBeenCalled()
  })

  it('creates a settings row with defaults when none exists', async () => {
    findFirst.mockResolvedValue(null)
    const created = { id: 's1', companyName: 'Cilmax' }
    create.mockResolvedValue(created)

    const result = await getOrCreateSettings()

    expect(result).toEqual(created)
    expect(findFirst).toHaveBeenCalledTimes(1)
    expect(create).toHaveBeenCalledWith({ data: {} })
  })
})

describe('updateSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves the settings row first, then updates it by id', async () => {
    findFirst.mockResolvedValue({ id: 's1', companyName: 'Old name' })
    const updated = { id: 's1', companyName: 'New name' }
    update.mockResolvedValue(updated)

    const result = await updateSettings({ companyName: 'New name' })

    expect(result).toEqual(updated)
    expect(findFirst).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { companyName: 'New name' },
    })
  })

  it('round-trips all settings fields into the update payload', async () => {
    findFirst.mockResolvedValue({ id: 's1' })
    update.mockResolvedValue({ id: 's1' })

    const full: Parameters<typeof updateSettings>[0] = {
      companyName: 'Cilmax Ltda',
      companyNit: '901234567-8',
      companyAddress: 'Calle 1 #2-3',
      companyCity: 'Cali',
      companyPhone: '+57 300 123 4567',
      companyEmail: 'ventas@cilmax.com',
      currency: 'COP',
      invoicePrefix: 'CIL-',
      invoiceFooter: '¡Gracias por tu compra!',
      lowStockThreshold: 5,
    }

    await updateSettings(full)

    expect(update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: full,
    })
  })

  it('allows nullable company fields to be set to null', async () => {
    findFirst.mockResolvedValue({ id: 's1' })
    update.mockResolvedValue({ id: 's1' })

    await updateSettings({ companyNit: null, companyEmail: null })

    expect(update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { companyNit: null, companyEmail: null },
    })
  })
})

describe('getBusinessWorkflowConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns default workflow when no store setting exists', async () => {
    findUnique.mockResolvedValue(null)
    const result = await getBusinessWorkflowConfig()
    expect(result).toEqual(DEFAULT_BUSINESS_WORKFLOW)
    expect(findUnique).toHaveBeenCalledWith({ where: { key: 'business_workflow' } })
  })

  it('merges stored workflow with defaults when setting exists', async () => {
    findUnique.mockResolvedValue({
      id: 'ws1',
      key: 'business_workflow',
      value: { sector: 'technology_repair', allowCreditSales: false, defaultProfitMargin: 45 },
    })

    const result = await getBusinessWorkflowConfig()
    expect(result.sector).toBe('technology_repair')
    expect(result.allowCreditSales).toBe(false)
    expect(result.defaultProfitMargin).toBe(45)
    expect(result.taxIdType).toBe(DEFAULT_BUSINESS_WORKFLOW.taxIdType)
  })
})

describe('updateBusinessWorkflowConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('upserts merged workflow configuration into storeSetting table', async () => {
    findUnique.mockResolvedValue(null)
    upsert.mockResolvedValue({ id: 'ws1' })

    const updated = await updateBusinessWorkflowConfig({
      sector: 'grocery_supermarket',
      allowNegativeStock: true,
      barcodeContinuousScan: true,
    })

    expect(updated.sector).toBe('grocery_supermarket')
    expect(updated.allowNegativeStock).toBe(true)
    expect(updated.barcodeContinuousScan).toBe(true)
    expect(upsert).toHaveBeenCalledWith({
      where: { key: 'business_workflow' },
      create: { key: 'business_workflow', value: expect.objectContaining({ sector: 'grocery_supermarket' }) },
      update: { value: expect.objectContaining({ sector: 'grocery_supermarket' }) },
    })
  })
})

describe('classifyBusinessSector', () => {
  it('correctly classifies a tech repair store', () => {
    const result = classifyBusinessSector('Servicio técnico de celulares, cambio de pantallas y baterías de computadores')
    expect(result.sector).toBe('technology_repair')
    expect(result.matches).toContain('celulares')
    expect(result.matches).toContain('pantallas')
  })

  it('correctly classifies a fashion boutique', () => {
    const result = classifyBusinessSector('Tienda de ropa femenina, vestidos elegantes, blusas y calzado de moda')
    expect(result.sector).toBe('fashion_apparel')
    expect(result.matches).toContain('ropa')
    expect(result.matches).toContain('vestidos')
  })

  it('correctly classifies a hardware store', () => {
    const result = classifyBusinessSector('Ferretería con venta de cemento, herramientas manuales, tornillos y pinturas')
    expect(result.sector).toBe('hardware_construction')
    expect(result.matches).toContain('ferreteria')
    expect(result.matches).toContain('cemento')
  })

  it('correctly classifies a pharmacy', () => {
    const result = classifyBusinessSector('Droguería y farmacia con venta de medicamentos y fórmulas médicas')
    expect(result.sector).toBe('pharmacy_health')
    expect(result.matches).toContain('farmacia')
    expect(result.matches).toContain('medicamentos')
  })

  it('correctly classifies a workshop', () => {
    const result = classifyBusinessSector('Taller mecánico para motos, cambio de aceite y mantenimiento preventivo')
    expect(result.sector).toBe('services_workshop')
    expect(result.matches).toContain('taller')
    expect(result.matches).toContain('mecanico')
  })

  it('defaults to retail_general when no specific industry keywords match', () => {
    const result = classifyBusinessSector('Empresa comercial de ventas y distribución general')
    expect(result.sector).toBe('retail_general')
  })
})

describe('autoConfigureBusinessWithAi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    findUnique.mockResolvedValue(null)
    upsert.mockResolvedValue({ id: 'ws1' })
    catFindFirst.mockResolvedValue(null)
    catCreate.mockResolvedValue({ id: 'cat1' })
    findFirst.mockResolvedValue({ id: 's1', companyName: 'Nova ERP' })
  })

  it('automatically configures workflow and creates starter categories for detected sector', async () => {
    const result = await autoConfigureBusinessWithAi('Ferretería El Progreso, venta de herramientas y cemento')

    expect(result.sector).toBe('hardware_construction')
    expect(result.sectorTag).toBe('FERRETERÍA')
    expect(result.suggestedMargin).toBe(30)
    expect(result.categoriesCreated.length).toBeGreaterThan(0)
    expect(catCreate).toHaveBeenCalled()
    expect(upsert).toHaveBeenCalledWith({
      where: { key: 'business_workflow' },
      create: expect.objectContaining({
        value: expect.objectContaining({ sector: 'hardware_construction' }),
      }),
      update: expect.objectContaining({
        value: expect.objectContaining({ sector: 'hardware_construction' }),
      }),
    })
  })
})


