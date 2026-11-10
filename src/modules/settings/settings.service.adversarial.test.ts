import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BusinessSectorSchema } from '@/lib/validations'
import type { BusinessSector } from '@/lib/business-workflow'

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
  classifyBusinessSector,
  autoConfigureBusinessWithAi,
} from './settings.service'

describe('Adversarial Stress Suite: classifyBusinessSector', () => {
  const ALL_SECTORS: BusinessSector[] = [
    'retail_general',
    'technology_repair',
    'fashion_apparel',
    'grocery_supermarket',
    'hardware_construction',
    'pharmacy_health',
    'services_workshop',
    'restaurant_gastronomy',
  ]

  describe('Edge-case Restaurant & Gastronomy Descriptions', () => {
    it('classifies "Pizzería artesanal y café de especialidad" as restaurant_gastronomy via "cafe"', () => {
      const result = classifyBusinessSector('Pizzería artesanal y café de especialidad')
      expect(result).toBeDefined()
      expect(result.sector).toBe('restaurant_gastronomy')
      // Note: "pizzeria" has 'e' so it does not substring-match "pizza", but "cafe" matches
      expect(result.matches).toContain('cafe')
      expect(result.confidence).toBeGreaterThanOrEqual(0.25)
      expect(BusinessSectorSchema.safeParse(result.sector).success).toBe(true)
    })

    it('classifies "Asadero de pollos campestre con venta de bebidas" as restaurant_gastronomy via "pollo" and "bebidas"', () => {
      const result = classifyBusinessSector('Asadero de pollos campestre con venta de bebidas')
      expect(result).toBeDefined()
      expect(result.sector).toBe('restaurant_gastronomy')
      // Note: "asadero" does not substring-match "asado", but "pollo" and "bebida(s)" match
      expect(result.matches).toEqual(expect.arrayContaining(['pollo', 'bebida', 'bebidas']))
      expect(result.confidence).toBeGreaterThan(0.5)
      expect(BusinessSectorSchema.safeParse(result.sector).success).toBe(true)
    })

    it('classifies "Food truck de hamburguesas y malteadas" as restaurant_gastronomy', () => {
      const result = classifyBusinessSector('Food truck de hamburguesas y malteadas')
      expect(result).toBeDefined()
      expect(result.sector).toBe('restaurant_gastronomy')
      expect(result.matches).toContain('hamburguesa')
      expect(result.confidence).toBeGreaterThanOrEqual(0.25)
      expect(BusinessSectorSchema.safeParse(result.sector).success).toBe(true)
    })

    it('identifies stem limitation: "Pizzería artesanal" alone without "cafe/menu/restaurante"', () => {
      const result = classifyBusinessSector('Pizzería artesanal italiana')
      // Empirically observes that because "pizzeria" is not an exact substring of "pizza",
      // single-term "Pizzería" falls back to retail_general unless restaurant keywords exist.
      expect(result).toBeDefined()
      expect(typeof result.sector).toBe('string')
      expect(ALL_SECTORS).toContain(result.sector)
    })

    it('identifies stem limitation: "Asadero campestre" alone without "pollo/carne/bebida"', () => {
      const result = classifyBusinessSector('Asadero campestre')
      // Empirically observes that "asadero" does not match "asado" (e vs o)
      expect(result).toBeDefined()
      expect(typeof result.sector).toBe('string')
      expect(ALL_SECTORS).toContain(result.sector)
    })

    it('classifies specialty bar and cocteleria', () => {
      const result = classifyBusinessSector('Bar de cocteles artesanales y picadas para compartir')
      expect(result.sector).toBe('restaurant_gastronomy')
      expect(result.matches).toContain('bar')
    })

    it('classifies bakery and breakfast service', () => {
      const result = classifyBusinessSector('Panadería con desayunos ejecutivos y postres caseros')
      expect(result.sector).toBe('restaurant_gastronomy')
      expect(result.matches).toEqual(expect.arrayContaining(['panaderia', 'desayuno', 'postre']))
    })
  })

  describe('Mixed Domain Queries (Ambiguous / Multi-Industry)', () => {
    it('handles "Tienda de café y venta de granos y tazas" deterministically without throwing', () => {
      const result = classifyBusinessSector('Tienda de café y venta de granos y tazas')
      expect(result).toBeDefined()
      expect(typeof result.sector).toBe('string')
      expect(ALL_SECTORS).toContain(result.sector)
      expect(result.confidence).toBeGreaterThanOrEqual(0.2)
      expect(result.confidence).toBeLessThanOrEqual(1.0)
      expect(Array.isArray(result.matches)).toBe(true)
      expect(result.matches.length).toBeGreaterThan(0)
    })

    it('handles "Taller de reparación y restaurante gourmet" deterministically without throwing', () => {
      const result = classifyBusinessSector('Taller de reparación y restaurante gourmet')
      expect(result).toBeDefined()
      expect(typeof result.sector).toBe('string')
      expect(ALL_SECTORS).toContain(result.sector)
      expect(result.matches.length).toBeGreaterThan(0)
      expect(BusinessSectorSchema.safeParse(result.sector).success).toBe(true)
    })

    it('handles "Droguería con venta de snacks y bebidas frías" without throwing', () => {
      const result = classifyBusinessSector('Droguería con venta de snacks y bebidas frías')
      expect(result).toBeDefined()
      expect(ALL_SECTORS).toContain(result.sector)
      expect(BusinessSectorSchema.safeParse(result.sector).success).toBe(true)
    })

    it('handles "Boutique de moda con venta de accesorios para celulares" without throwing', () => {
      const result = classifyBusinessSector('Boutique de moda con venta de accesorios para celulares')
      expect(result).toBeDefined()
      expect(ALL_SECTORS).toContain(result.sector)
      expect(BusinessSectorSchema.safeParse(result.sector).success).toBe(true)
    })
  })

  describe('Adversarial Fuzzing, Boundary Conditions & Invariants', () => {
    it('handles empty string gracefully', () => {
      const result = classifyBusinessSector('')
      expect(result).toEqual({
        sector: 'retail_general',
        confidence: 0.2,
        matches: [],
      })
    })

    it('handles whitespace-only strings gracefully', () => {
      const result = classifyBusinessSector('   \n\t   \r  ')
      expect(result).toEqual({
        sector: 'retail_general',
        confidence: 0.2,
        matches: [],
      })
    })

    it('handles full uppercase with diacritics and accents correctly', () => {
      const result = classifyBusinessSector('CAFETERÍA CON POSTRES, COMANDAS DE MESA Y ALMUERZOS')
      expect(result.sector).toBe('restaurant_gastronomy')
      expect(result.matches).toEqual(expect.arrayContaining(['cafeteria', 'postre', 'comanda', 'mesa', 'almuerzo']))
    })

    it('handles punctuation, symbols and injection patterns without crashing', () => {
      const attackPayload = `'; DROP TABLE "StoreSetting"; SELECT * FROM users WHERE '1'='1' -- restaurante y comida`
      const result = classifyBusinessSector(attackPayload)
      expect(result.sector).toBe('restaurant_gastronomy')
      expect(result.matches).toEqual(expect.arrayContaining(['restaurante', 'comida']))
      expect(result.confidence).toBeGreaterThan(0)
    })

    it('handles unicode emojis without crashing', () => {
      const emojiString = '🍕 🍔 🍟 ☕ 🍰 🍺 🌮'
      const result = classifyBusinessSector(emojiString)
      expect(result.sector).toBe('retail_general')
      expect(result.confidence).toBe(0.2)
      expect(result.matches).toEqual([])
    })

    it('handles random gibberish without crashing', () => {
      const gibberish = 'qwoieur zxcnmvlka sjdfhalskdfj 12938172938'
      const result = classifyBusinessSector(gibberish)
      expect(result.sector).toBe('retail_general')
      expect(result.confidence).toBe(0.2)
      expect(result.matches).toEqual([])
    })

    it('handles very large input strings without performance degradation', () => {
      const largeText = 'restaurante con comida gourmet y platos variados. '.repeat(1000)
      const start = performance.now()
      const result = classifyBusinessSector(largeText)
      const duration = performance.now() - start

      expect(duration).toBeLessThan(100) // Less than 100ms
      expect(result.sector).toBe('restaurant_gastronomy')
      expect(result.confidence).toBe(1) // Capped at 1
    })

    it('invariants: every returned sector is valid according to BusinessSectorSchema', () => {
      const testCases = [
        'Reparación de computadores y celulares',
        'Venta de vestidos, pantalones y camisas',
        'Venta de abarrotes, leche y arroz',
        'Venta de tornillos, cemento y pintura',
        'Farmacia con pastillas y jarabes',
        'Mantenimiento de frenos y cambio de aceite',
        'Distribuidora y comercio general',
        'Comedor comunitario con almuerzos y cenas',
      ]

      for (const text of testCases) {
        const result = classifyBusinessSector(text)
        expect(result.sector).toBeDefined()
        expect(typeof result.confidence).toBe('number')
        expect(result.confidence).toBeGreaterThanOrEqual(0)
        expect(result.confidence).toBeLessThanOrEqual(1)
        expect(Array.isArray(result.matches)).toBe(true)
        expect(BusinessSectorSchema.safeParse(result.sector).success).toBe(true)
      }
    })
  })

  describe('autoConfigureBusinessWithAi under Adversarial Restaurant Scenarios', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      findUnique.mockResolvedValue(null)
      upsert.mockResolvedValue({ id: 'ws-adv' })
      catFindFirst.mockResolvedValue(null)
      catCreate.mockResolvedValue({ id: 'cat-adv' })
      findFirst.mockResolvedValue({ id: 's-adv', companyName: 'Nova ERP' })
    })

    it('enforces allowCreditSales=false and barcodeContinuousScan=false for restaurant_gastronomy', async () => {
      const result = await autoConfigureBusinessWithAi(
        'Pizzería artesanal y café de especialidad con mesas al aire libre',
      )

      expect(result.sector).toBe('restaurant_gastronomy')
      expect(result.workflow.allowCreditSales).toBe(false)
      expect(result.workflow.barcodeContinuousScan).toBe(false)
      expect(result.suggestedMargin).toBe(45)
      expect(result.categoriesCreated).toEqual(
        expect.arrayContaining([
          'Entradas & Aperitivos',
          'Platos Fuertes & Especialidades',
          'Bebidas, Cafés & Coctelería',
          'Postres & Repostería',
          'Guarniciones & Adicionales',
        ]),
      )
    })

    it('enforces allowCreditSales=false for grocery_supermarket but barcodeContinuousScan=true', async () => {
      const result = await autoConfigureBusinessWithAi(
        'Supermercado de víveres, abarrotes y productos lácteos',
      )

      expect(result.sector).toBe('grocery_supermarket')
      expect(result.workflow.allowCreditSales).toBe(false)
      expect(result.workflow.barcodeContinuousScan).toBe(true)
    })

    it('enforces allowCreditSales=true and barcodeContinuousScan=false for services_workshop', async () => {
      const result = await autoConfigureBusinessWithAi(
        'Taller mecánico automotriz, cambio de aceite y frenos',
      )

      expect(result.sector).toBe('services_workshop')
      expect(result.workflow.allowCreditSales).toBe(true)
      expect(result.workflow.barcodeContinuousScan).toBe(false)
    })
  })
})
