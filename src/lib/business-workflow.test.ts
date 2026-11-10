import { describe, it, expect } from 'vitest'
import {
  SECTOR_INFO,
  SECTOR_WORKFLOW_DEFAULTS,
  getSectorProfile,
  DEFAULT_BUSINESS_WORKFLOW,
  type BusinessSector,
} from './business-workflow'
import { BusinessSectorSchema } from './validations'

describe('business-workflow - Adaptive Sector Engine', () => {
  const allSectors: BusinessSector[] = [
    'retail_general',
    'technology_repair',
    'fashion_apparel',
    'grocery_supermarket',
    'hardware_construction',
    'pharmacy_health',
    'services_workshop',
    'restaurant_gastronomy',
  ]

  it('debe definir perfiles completos para los 8 sectores soportados', () => {
    for (const sector of allSectors) {
      const profile = SECTOR_INFO[sector]
      expect(profile).toBeDefined()
      expect(profile.title).toBeTruthy()
      expect(profile.description).toBeTruthy()
      expect(profile.tag).toBeTruthy()
      expect(profile.suggestedMargin).toBeGreaterThan(0)
      expect(profile.features.length).toBeGreaterThan(0)

      // Verificación de etiquetas semánticas del sector
      expect(profile.labels.singular).toBeTruthy()
      expect(profile.labels.plural).toBeTruthy()
      expect(profile.labels.identifier).toBeTruthy()
      expect(profile.labels.identifierPlaceholder).toBeTruthy()
      expect(profile.labels.unit).toBeTruthy()
      expect(profile.labels.clientRole).toBeTruthy()
      expect(profile.labels.actionNew).toBeTruthy()
      expect(profile.labels.primaryAction).toBeTruthy()
      expect(profile.labels.searchPlaceholder).toBeTruthy()
    }
  })

  it('debe retornar el perfil específico de gastronomía y restaurantes con propina legal', () => {
    const profile = getSectorProfile('restaurant_gastronomy')
    expect(profile.tag).toBe('GASTRONOMÍA')
    expect(profile.title).toBe('Restaurantes, Cafeterías & Gastronomía')
    expect(profile.description).toBe(
      'Atención a comensales, servicio de mesa, bebidas, preparaciones y comandas rápidas.',
    )
    expect(profile.iconName).toBe('UtensilsCrossed')
    expect(profile.suggestedMargin).toBe(45)
    expect(profile.features).toContain('Sin ventas a crédito')
    expect(profile.features).toContain('Comprobante con propina voluntaria sugerida')
    expect(profile.defaultFooter).toContain('ley 1935 de 2018')
    expect(profile.labels.singular).toBe('Plato / Preparación')
    expect(profile.labels.plural).toBe('Menú & Bebidas')
    expect(profile.labels.identifier).toBe('Código / Ref Menú')
    expect(profile.labels.clientRole).toBe('Comensal / Mesa')
    expect(profile.labels.primaryAction).toBe('Nueva Comanda / Venta')
    expect(profile.labels.actionNew).toBe('Registrar Plato / Bebida')
  })

  it('debe definir defaults de workflow por sector desactivando créditos en restaurantes y supermercados', () => {
    expect(SECTOR_WORKFLOW_DEFAULTS.restaurant_gastronomy.allowCreditSales).toBe(false)
    expect(SECTOR_WORKFLOW_DEFAULTS.restaurant_gastronomy.barcodeContinuousScan).toBe(false)
    expect(SECTOR_WORKFLOW_DEFAULTS.grocery_supermarket.allowCreditSales).toBe(false)
    expect(SECTOR_WORKFLOW_DEFAULTS.services_workshop.barcodeContinuousScan).toBe(false)
    expect(SECTOR_WORKFLOW_DEFAULTS.retail_general.allowCreditSales).toBe(true)
  })

  it('BusinessSectorSchema debe validar satisfactoriamente los 8 sectores', () => {
    for (const sector of allSectors) {
      const parsed = BusinessSectorSchema.safeParse(sector)
      expect(parsed.success).toBe(true)
    }
    const invalid = BusinessSectorSchema.safeParse('sector_invalido')
    expect(invalid.success).toBe(false)
  })

  it('debe retornar el perfil específico de tecnología y reparación', () => {
    const profile = getSectorProfile('technology_repair')
    expect(profile.tag).toBe('TECH·REPAIR')
    expect(profile.labels.singular).toBe('Dispositivo / Repuesto')
    expect(profile.labels.identifier).toBe('IMEI / Número de Serie')
    expect(profile.suggestedMargin).toBe(40)
  })

  it('debe retornar el perfil de farmacia con registro sanitario y lote', () => {
    const profile = getSectorProfile('pharmacy_health')
    expect(profile.tag).toBe('FARMACIA')
    expect(profile.labels.singular).toBe('Medicamento / Fármaco')
    expect(profile.labels.identifier).toBe('Registro Sanitario / Lote')
  })

  it('debe retornar fallback a retail_general si se proporciona un sector nulo o inválido', () => {
    const fallbackNull = getSectorProfile(null)
    expect(fallbackNull).toEqual(SECTOR_INFO.retail_general)

    const fallbackUndefined = getSectorProfile(undefined)
    expect(fallbackUndefined).toEqual(SECTOR_INFO.retail_general)

    // @ts-expect-error probando entrada inválida en runtime
    const fallbackInvalid = getSectorProfile('sector_inexistente')
    expect(fallbackInvalid).toEqual(SECTOR_INFO.retail_general)
  })

  it('DEFAULT_BUSINESS_WORKFLOW debe tener configuración base consistente', () => {
    expect(DEFAULT_BUSINESS_WORKFLOW.sector).toBe('retail_general')
    expect(DEFAULT_BUSINESS_WORKFLOW.defaultProfitMargin).toBe(35)
    expect(DEFAULT_BUSINESS_WORKFLOW.companyName).toBe('Nova ERP')
  })
})
