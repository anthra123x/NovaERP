import { describe, it, expect } from 'vitest'
import {
  SECTOR_INFO,
  getSectorProfile,
  DEFAULT_BUSINESS_WORKFLOW,
  type BusinessSector,
} from './business-workflow'

describe('business-workflow - Adaptive Sector Engine', () => {
  const allSectors: BusinessSector[] = [
    'retail_general',
    'technology_repair',
    'fashion_apparel',
    'grocery_supermarket',
    'hardware_construction',
    'pharmacy_health',
    'services_workshop',
  ]

  it('debe definir perfiles completos para los 7 sectores soportados', () => {
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
