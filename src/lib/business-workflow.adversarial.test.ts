import { describe, it, expect } from 'vitest'
import {
  SECTOR_INFO,
  SECTOR_WORKFLOW_DEFAULTS,
  getSectorProfile,
  type BusinessSector,
  type SectorProfile,
} from './business-workflow'
import { BusinessSectorSchema } from './validations'

describe('Adversarial Stress Suite: business-workflow', () => {
  const EXPECTED_8_SECTORS: BusinessSector[] = [
    'retail_general',
    'technology_repair',
    'fashion_apparel',
    'grocery_supermarket',
    'hardware_construction',
    'pharmacy_health',
    'services_workshop',
    'restaurant_gastronomy',
  ]

  const REQUIRED_LABEL_KEYS: (keyof SectorProfile['labels'])[] = [
    'singular',
    'plural',
    'identifier',
    'identifierPlaceholder',
    'unit',
    'clientRole',
    'actionNew',
    'primaryAction',
    'searchPlaceholder',
  ]

  describe('MISSION ITEM 2: getSectorProfile empirical tests', () => {
    it('verifies getSectorProfile("restaurant_gastronomy") completeness and integrity', () => {
      const profile = getSectorProfile('restaurant_gastronomy')

      expect(profile).toBeDefined()
      expect(typeof profile.title).toBe('string')
      expect(profile.title.trim().length).toBeGreaterThan(0)

      expect(typeof profile.description).toBe('string')
      expect(profile.description.trim().length).toBeGreaterThan(0)

      expect(typeof profile.tag).toBe('string')
      expect(profile.tag).toBe('GASTRONOMÍA')

      expect(typeof profile.iconName).toBe('string')
      expect(profile.iconName).toBe('UtensilsCrossed')

      expect(typeof profile.suggestedMargin).toBe('number')
      expect(profile.suggestedMargin).toBeGreaterThan(0)
      expect(Number.isFinite(profile.suggestedMargin)).toBe(true)

      expect(typeof profile.defaultFooter).toBe('string')
      expect(profile.defaultFooter?.trim().length).toBeGreaterThan(0)
      expect(profile.defaultFooter).toContain('ley 1935 de 2018')

      expect(Array.isArray(profile.features)).toBe(true)
      expect(profile.features.length).toBeGreaterThan(0)
      for (const feature of profile.features) {
        expect(typeof feature).toBe('string')
        expect(feature.trim().length).toBeGreaterThan(0)
      }

      // Complete labels verification
      expect(profile.labels).toBeDefined()
      for (const labelKey of REQUIRED_LABEL_KEYS) {
        const val = profile.labels[labelKey]
        expect(typeof val).toBe('string')
        expect(val.trim().length).toBeGreaterThan(0)
      }

      // Specific culinary labels
      expect(profile.labels.singular).toBe('Plato / Preparación')
      expect(profile.labels.plural).toBe('Menú & Bebidas')
      expect(profile.labels.identifier).toBe('Código / Ref Menú')
      expect(profile.labels.clientRole).toBe('Comensal / Mesa')
      expect(profile.labels.primaryAction).toBe('Nueva Comanda / Venta')
      expect(profile.labels.actionNew).toBe('Registrar Plato / Bebida')
    })

    it('verifies getSectorProfile(null) returns valid fallback profile', () => {
      const profile = getSectorProfile(null)

      expect(profile).toBeDefined()
      expect(profile).toEqual(SECTOR_INFO.retail_general)
      expect(typeof profile.title).toBe('string')
      expect(profile.title.trim().length).toBeGreaterThan(0)
      expect(typeof profile.description).toBe('string')
      expect(profile.description.trim().length).toBeGreaterThan(0)
      expect(typeof profile.suggestedMargin).toBe('number')
      expect(profile.suggestedMargin).toBeGreaterThan(0)

      for (const labelKey of REQUIRED_LABEL_KEYS) {
        const val = profile.labels[labelKey]
        expect(typeof val).toBe('string')
        expect(val.trim().length).toBeGreaterThan(0)
      }
    })

    it('verifies getSectorProfile(undefined) returns valid fallback profile', () => {
      const profile = getSectorProfile(undefined)
      expect(profile).toBeDefined()
      expect(profile).toEqual(SECTOR_INFO.retail_general)
    })

    it('verifies getSectorProfile with invalid/unknown sector string returns valid fallback profile', () => {
      // @ts-expect-error Adversarial testing with unknown runtime string
      const profile = getSectorProfile('unknown_space_travel_sector')
      expect(profile).toBeDefined()
      expect(profile).toEqual(SECTOR_INFO.retail_general)
    })

    it('verifies getSectorProfile with empty string returns valid fallback profile', () => {
      // @ts-expect-error Adversarial testing with empty string
      const profile = getSectorProfile('')
      expect(profile).toBeDefined()
      expect(profile).toEqual(SECTOR_INFO.retail_general)
    })
  })

  describe('MISSION ITEM 3: SECTOR_WORKFLOW_DEFAULTS coverage and boolean typing', () => {
    it('ensures all 8 sectors have an entry in SECTOR_WORKFLOW_DEFAULTS', () => {
      const definedSectors = Object.keys(SECTOR_WORKFLOW_DEFAULTS).sort()
      const expectedSorted = [...EXPECTED_8_SECTORS].sort()

      expect(definedSectors).toEqual(expectedSorted)
      expect(definedSectors.length).toBe(8)
    })

    it('verifies allowCreditSales is explicitly boolean where defined across all sectors', () => {
      for (const sector of EXPECTED_8_SECTORS) {
        const defaults = SECTOR_WORKFLOW_DEFAULTS[sector]
        expect(defaults).toBeDefined()
        if (defaults.allowCreditSales !== undefined) {
          expect(typeof defaults.allowCreditSales).toBe('boolean')
        }
      }
    })

    it('verifies restaurant_gastronomy has allowCreditSales explicitly false', () => {
      const defaults = SECTOR_WORKFLOW_DEFAULTS.restaurant_gastronomy
      expect(defaults.allowCreditSales).toBe(false)
      expect(typeof defaults.allowCreditSales).toBe('boolean')
    })

    it('verifies grocery_supermarket has allowCreditSales explicitly false', () => {
      const defaults = SECTOR_WORKFLOW_DEFAULTS.grocery_supermarket
      expect(defaults.allowCreditSales).toBe(false)
      expect(typeof defaults.allowCreditSales).toBe('boolean')
    })

    it('verifies barcodeContinuousScan is explicitly boolean false for restaurant_gastronomy and services_workshop', () => {
      expect(SECTOR_WORKFLOW_DEFAULTS.restaurant_gastronomy.barcodeContinuousScan).toBe(false)
      expect(typeof SECTOR_WORKFLOW_DEFAULTS.restaurant_gastronomy.barcodeContinuousScan).toBe('boolean')

      expect(SECTOR_WORKFLOW_DEFAULTS.services_workshop.barcodeContinuousScan).toBe(false)
      expect(typeof SECTOR_WORKFLOW_DEFAULTS.services_workshop.barcodeContinuousScan).toBe('boolean')
    })

    it('verifies defaultProfitMargin is positive number for all 8 sectors', () => {
      for (const sector of EXPECTED_8_SECTORS) {
        const defaults = SECTOR_WORKFLOW_DEFAULTS[sector]
        expect(typeof defaults.defaultProfitMargin).toBe('number')
        expect(defaults.defaultProfitMargin).toBeGreaterThan(0)
      }
    })
  })

  describe('Exhaustive Validation across all 8 sectors in SECTOR_INFO', () => {
    it('ensures all 8 sectors have exhaustive and complete profiles', () => {
      for (const sector of EXPECTED_8_SECTORS) {
        const profile = SECTOR_INFO[sector]
        expect(profile, `Sector profile missing for ${sector}`).toBeDefined()
        expect(typeof profile.title).toBe('string')
        expect(profile.title.trim().length).toBeGreaterThan(0)

        expect(typeof profile.description).toBe('string')
        expect(profile.description.trim().length).toBeGreaterThan(0)

        expect(typeof profile.tag).toBe('string')
        expect(profile.tag.trim().length).toBeGreaterThan(0)

        expect(typeof profile.iconName).toBe('string')
        expect(profile.iconName.trim().length).toBeGreaterThan(0)

        expect(typeof profile.suggestedMargin).toBe('number')
        expect(profile.suggestedMargin).toBeGreaterThan(0)

        expect(Array.isArray(profile.features)).toBe(true)
        expect(profile.features.length).toBeGreaterThan(0)

        for (const key of REQUIRED_LABEL_KEYS) {
          const val = profile.labels[key]
          expect(typeof val, `Label ${key} in sector ${sector} must be string`).toBe('string')
          expect(val.trim().length, `Label ${key} in sector ${sector} cannot be empty`).toBeGreaterThan(0)
        }
      }
    })

    it('verifies BusinessSectorSchema validates all 8 sectors and rejects arbitrary input', () => {
      for (const sector of EXPECTED_8_SECTORS) {
        const result = BusinessSectorSchema.safeParse(sector)
        expect(result.success, `Schema should accept ${sector}`).toBe(true)
      }

      const invalidInputs = [
        'invalid_sector',
        '',
        123,
        null,
        undefined,
        {},
        [],
        'RESTAURANT_GASTRONOMY', // uppercase enum rejection (must be lowercase in code)
      ]

      for (const invalid of invalidInputs) {
        const result = BusinessSectorSchema.safeParse(invalid)
        expect(result.success, `Schema should reject ${String(invalid)}`).toBe(false)
      }
    })
  })
})
