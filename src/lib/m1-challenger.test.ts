import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ZodError } from 'zod'
import { BusinessSectorSchema } from './validations'
import {
  SECTOR_INFO,
  SECTOR_WORKFLOW_DEFAULTS,
  DEFAULT_BUSINESS_WORKFLOW,
  WORKFLOW_STORAGE_KEY,
  WORKFLOW_CHANGED_EVENT,
  getBusinessWorkflow,
  saveBusinessWorkflow,
  getSectorProfile,
  type BusinessSector,
  type BusinessWorkflowConfig,
} from './business-workflow'

describe('M1 Empirical Challenge Suite — Challenger 2', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // 1. BusinessSectorSchema Validation Tests
  // ───────────────────────────────────────────────────────────────────────────
  describe('Challenge 1: BusinessSectorSchema empirical validation', () => {
    const validSectors: BusinessSector[] = [
      'retail_general',
      'technology_repair',
      'fashion_apparel',
      'grocery_supermarket',
      'hardware_construction',
      'pharmacy_health',
      'services_workshop',
      'restaurant_gastronomy',
    ]

    it('debe validar y parsear exitosamente los 8 sectores soportados', () => {
      expect(validSectors).toHaveLength(8)

      for (const sector of validSectors) {
        // Validación con safeParse
        const safeResult = BusinessSectorSchema.safeParse(sector)
        expect(safeResult.success).toBe(true)
        if (safeResult.success) {
          expect(safeResult.data).toBe(sector)
        }

        // Validación con parse directo
        const parsed = BusinessSectorSchema.parse(sector)
        expect(parsed).toBe(sector)
      }
    })

    const invalidInputs: Array<{ input: unknown; description: string }> = [
      { input: 'restaurant', description: 'string parcial "restaurant"' },
      { input: 'gastronomy', description: 'string parcial "gastronomy"' },
      { input: '', description: 'string vacío ""' },
      { input: 'RETAIL_GENERAL', description: 'string en mayúsculas "RETAIL_GENERAL"' },
      { input: 'RESTAURANT_GASTRONOMY', description: 'string en mayúsculas "RESTAURANT_GASTRONOMY"' },
      { input: ' restaurant_gastronomy', description: 'string con espacio inicial' },
      { input: 'restaurant_gastronomy ', description: 'string con espacio final' },
      { input: null, description: 'valor null' },
      { input: undefined, description: 'valor undefined' },
      { input: 123, description: 'número entero 123' },
      { input: 0, description: 'número 0' },
      { input: NaN, description: 'número NaN' },
      { input: true, description: 'booleano true' },
      { input: false, description: 'booleano false' },
      { input: {}, description: 'objeto vacío {}' },
      { input: [], description: 'array vacío []' },
      { input: ['restaurant_gastronomy'], description: 'array con sector válido' },
    ]

    for (const { input, description } of invalidInputs) {
      it(`debe rechazar ${description} con ZodError en safeParse y parse`, () => {
        // safeParse debe devolver success: false y ZodError
        const safeResult = BusinessSectorSchema.safeParse(input)
        expect(safeResult.success).toBe(false)
        if (!safeResult.success) {
          expect(safeResult.error).toBeInstanceOf(ZodError)
          expect(safeResult.error.issues.length).toBeGreaterThan(0)
        }

        // parse() debe lanzar ZodError
        expect(() => BusinessSectorSchema.parse(input)).toThrowError(ZodError)
      })
    }
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 2. saveBusinessWorkflow and getBusinessWorkflow Empirical Tests
  // ───────────────────────────────────────────────────────────────────────────
  describe('Challenge 2: saveBusinessWorkflow and getBusinessWorkflow behavior', () => {
    let mockStore: Record<string, string> = {}
    let dispatchedEvents: Array<{ event: string; detail: unknown }> = []

    const setupBrowserEnv = () => {
      mockStore = {}
      dispatchedEvents = []

      const localStorageMock = {
        getItem: vi.fn((key: string) => mockStore[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          mockStore[key] = value
        }),
        removeItem: vi.fn((key: string) => {
          delete mockStore[key]
        }),
        clear: vi.fn(() => {
          mockStore = {}
        }),
      }

      // Creamos un CustomEvent dummy para node
      class MockCustomEvent {
        type: string
        detail: unknown
        constructor(type: string, init?: { detail: unknown }) {
          this.type = type
          this.detail = init?.detail
        }
      }

      const windowMock = {
        localStorage: localStorageMock,
        dispatchEvent: vi.fn((event: { type: string; detail: unknown }) => {
          dispatchedEvents.push({ event: event.type, detail: event.detail })
          return true
        }),
      }

      vi.stubGlobal('window', windowMock)
      vi.stubGlobal('localStorage', localStorageMock)
      vi.stubGlobal('CustomEvent', MockCustomEvent)
    }

    const teardownBrowserEnv = () => {
      vi.unstubAllGlobals()
      mockStore = {}
      dispatchedEvents = []
    }

    describe('En entorno de navegador (DOM / client-side)', () => {
      beforeEach(() => {
        setupBrowserEnv()
      })

      afterEach(() => {
        teardownBrowserEnv()
      })

      it('debe actualizar el workflow a restaurant_gastronomy combinando defaults con allowCreditSales: false', () => {
        // Inicialmente sin configuración previa en localStorage
        const initial = getBusinessWorkflow()
        expect(initial.sector).toBe('retail_general')
        expect(initial.allowCreditSales).toBe(true)

        // Actualizamos aplicando el sector y sus defaults declarados
        const updatePayload: Partial<BusinessWorkflowConfig> = {
          sector: 'restaurant_gastronomy',
          ...SECTOR_WORKFLOW_DEFAULTS.restaurant_gastronomy,
        }

        const saved = saveBusinessWorkflow(updatePayload)

        // 1. Verificar retorno de saveBusinessWorkflow
        expect(saved.sector).toBe('restaurant_gastronomy')
        expect(saved.allowCreditSales).toBe(false)
        expect(saved.barcodeContinuousScan).toBe(false)
        expect(saved.defaultProfitMargin).toBe(45)

        // 2. Verificar persistencia en localStorage
        expect(mockStore[WORKFLOW_STORAGE_KEY]).toBeDefined()
        const storedJson = JSON.parse(mockStore[WORKFLOW_STORAGE_KEY])
        expect(storedJson.sector).toBe('restaurant_gastronomy')
        expect(storedJson.allowCreditSales).toBe(false)

        // 3. Verificar que getBusinessWorkflow recupera la configuración persistida
        const reloaded = getBusinessWorkflow()
        expect(reloaded.sector).toBe('restaurant_gastronomy')
        expect(reloaded.allowCreditSales).toBe(false)
        expect(reloaded.barcodeContinuousScan).toBe(false)

        // 4. Verificar que se emitió el evento de cambio
        expect(dispatchedEvents).toHaveLength(1)
        expect(dispatchedEvents[0].event).toBe(WORKFLOW_CHANGED_EVENT)
        expect((dispatchedEvents[0].detail as BusinessWorkflowConfig).allowCreditSales).toBe(false)
        expect((dispatchedEvents[0].detail as BusinessWorkflowConfig).sector).toBe('restaurant_gastronomy')
      })

      it('STRESS TEST: saveBusinessWorkflow preserva campos adicionales al mutar a restaurant_gastronomy', () => {
        // Pre-establecer configuración personalizada con nombre y slogan
        saveBusinessWorkflow({
          companyName: 'Bistró Gourmet Nova',
          slogan: 'Cocina de autor y pasión',
          brandColor: '#ea580c',
        })

        // Cambiar sector a restaurant_gastronomy con defaults
        const updated = saveBusinessWorkflow({
          sector: 'restaurant_gastronomy',
          ...SECTOR_WORKFLOW_DEFAULTS.restaurant_gastronomy,
        })

        expect(updated.companyName).toBe('Bistró Gourmet Nova')
        expect(updated.slogan).toBe('Cocina de autor y pasión')
        expect(updated.brandColor).toBe('#ea580c')
        expect(updated.sector).toBe('restaurant_gastronomy')
        expect(updated.allowCreditSales).toBe(false)
      })

      it('ADVERSARIAL TEST: si se llama saveBusinessWorkflow({ sector: "restaurant_gastronomy" }) SIN defaults explícitos, hereda allowCreditSales anterior', () => {
        // Este test documenta el comportamiento de shallow-merge de saveBusinessWorkflow:
        // Si el invocador omite pasar SECTOR_WORKFLOW_DEFAULTS, saveBusinessWorkflow solo mezcla las propiedades provistas.
        const currentBefore = getBusinessWorkflow()
        expect(currentBefore.allowCreditSales).toBe(true)

        // Invocación ingenua pasando solo { sector: 'restaurant_gastronomy' }
        const naiveResult = saveBusinessWorkflow({ sector: 'restaurant_gastronomy' })
        expect(naiveResult.sector).toBe('restaurant_gastronomy')
        // Observación empírica: saveBusinessWorkflow hace { ...current, ...partial }
        // Por lo tanto, si partial no incluye allowCreditSales: false, conserva el valor previo (true)
        expect(naiveResult.allowCreditSales).toBe(true)

        // Corolario: para garantizar allowCreditSales: false, el invocador o la función DEBE
        // fusionar explícitamente SECTOR_WORKFLOW_DEFAULTS[sector] (como lo hace admin/page.tsx, auth.actions.ts y settings.service.ts)
        const robustResult = saveBusinessWorkflow({
          sector: 'restaurant_gastronomy',
          ...SECTOR_WORKFLOW_DEFAULTS.restaurant_gastronomy,
        })
        expect(robustResult.allowCreditSales).toBe(false)
      })

      it('BUG DISCOVERY / ADVERSARIAL: getBusinessWorkflow sufre desincronización de cache ante JSON corrupto en localStorage', () => {
        // Establecer un workflow válido previo
        saveBusinessWorkflow({
          sector: 'restaurant_gastronomy',
          ...SECTOR_WORKFLOW_DEFAULTS.restaurant_gastronomy,
        })
        expect(getBusinessWorkflow().sector).toBe('restaurant_gastronomy')

        // Ahora simulamos corrupción de datos en localStorage
        mockStore[WORKFLOW_STORAGE_KEY] = 'INVALID_JSON{{{['

        // Primera llamada: JSON.parse falla en el try, cae al catch y retorna DEFAULT_BUSINESS_WORKFLOW
        const firstCall = getBusinessWorkflow()
        expect(firstCall.sector).toBe('retail_general')

        // Segunda llamada inmediata: como cachedRaw ya fue asignado antes de JSON.parse,
        // la línea 340 (raw === cachedRaw && cachedWorkflow) es VERDADERA y retorna cachedWorkflow
        // sin pasar por el catch, devolviendo el estado stale 'restaurant_gastronomy'.
        const secondCall = getBusinessWorkflow()
        // Evidencia empírica del fallo de cache:
        expect(secondCall.sector).toBe('restaurant_gastronomy')
      })

      it('Resiliencia: getBusinessWorkflow maneja localStorage vacío o null retornando DEFAULT_BUSINESS_WORKFLOW', () => {
        // Caso B: String vacío
        mockStore[WORKFLOW_STORAGE_KEY] = ''
        const fallbackB = getBusinessWorkflow()
        expect(fallbackB.sector).toBe('retail_general')

        // Caso C: null en storage
        delete mockStore[WORKFLOW_STORAGE_KEY]
        const fallbackC = getBusinessWorkflow()
        expect(fallbackC.sector).toBe('retail_general')
      })
    })

    describe('En entorno SSR / Node (typeof window === "undefined")', () => {
      beforeEach(() => {
        teardownBrowserEnv()
      })

      it('getBusinessWorkflow retorna DEFAULT_BUSINESS_WORKFLOW en servidor', () => {
        const result = getBusinessWorkflow()
        expect(result).toEqual(DEFAULT_BUSINESS_WORKFLOW)
      })

      it('saveBusinessWorkflow retorna DEFAULT_BUSINESS_WORKFLOW de forma segura en servidor', () => {
        const result = saveBusinessWorkflow({ sector: 'restaurant_gastronomy' })
        expect(result).toEqual(DEFAULT_BUSINESS_WORKFLOW)
      })
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Integrity of 7 Pre-existing Sectors
  // ───────────────────────────────────────────────────────────────────────────
  describe('Challenge 3: Verificación de no-regresión en los 7 sectores preexistentes', () => {
    it('SECTOR_INFO debe contener exactamente 8 sectores comerciales', () => {
      const keys = Object.keys(SECTOR_INFO)
      expect(keys).toHaveLength(8)
      expect(keys).toEqual([
        'retail_general',
        'technology_repair',
        'fashion_apparel',
        'grocery_supermarket',
        'hardware_construction',
        'pharmacy_health',
        'services_workshop',
        'restaurant_gastronomy',
      ])
    })

    it('Sector 1: retail_general conserva sus propiedades originales', () => {
      const s = SECTOR_INFO.retail_general
      expect(s.title).toBe('Comercio General & Mostrador')
      expect(s.description).toBe('Ventas rápidas, artículos variados y atención ágil al público.')
      expect(s.tag).toBe('COMERCIO')
      expect(s.suggestedMargin).toBe(35)
      expect(s.iconName).toBe('Store')
      expect(s.features).toEqual(['Ventas de mostrador', 'Garantía legal 30 días', 'Margen óptimo 35%'])
      expect(s.labels.singular).toBe('Producto')
      expect(s.labels.plural).toBe('Productos')
      expect(s.labels.identifier).toBe('Código de barras / SKU')
      expect(s.labels.unit).toBe('unidades')
      expect(s.labels.clientRole).toBe('Consumidor Final')
      expect(s.labels.actionNew).toBe('Nuevo Producto')
      expect(s.labels.primaryAction).toBe('Nueva Venta')
      expect(SECTOR_WORKFLOW_DEFAULTS.retail_general.allowCreditSales).toBe(true)
    })

    it('Sector 2: technology_repair conserva sus propiedades originales', () => {
      const s = SECTOR_INFO.technology_repair
      expect(s.title).toBe('Tecnología, Telefonía & Servicio Técnico')
      expect(s.description).toBe('Control estricto de números de serie, repuestos y órdenes técnicas.')
      expect(s.tag).toBe('TECH·REPAIR')
      expect(s.suggestedMargin).toBe(40)
      expect(s.iconName).toBe('Smartphone')
      expect(s.features).toEqual(['Control de IMEI y serie', 'Garantía técnica 90 días', 'Margen repuestos 40%'])
      expect(s.labels.singular).toBe('Dispositivo / Repuesto')
      expect(s.labels.plural).toBe('Equipos & Repuestos')
      expect(s.labels.identifier).toBe('IMEI / Número de Serie')
      expect(s.labels.unit).toBe('unidades')
      expect(s.labels.clientRole).toBe('Titular del Equipo')
      expect(s.labels.actionNew).toBe('Registrar Dispositivo / Repuesto')
      expect(s.labels.primaryAction).toBe('Recepción & Venta')
      expect(SECTOR_WORKFLOW_DEFAULTS.technology_repair.allowCreditSales).toBe(true)
    })

    it('Sector 3: fashion_apparel conserva sus propiedades originales', () => {
      const s = SECTOR_INFO.fashion_apparel
      expect(s.title).toBe('Moda, Calzado & Confección')
      expect(s.description).toBe('Control de prendas, tallas, colores y políticas de cambio en mostrador.')
      expect(s.tag).toBe('FASHION')
      expect(s.suggestedMargin).toBe(50)
      expect(s.iconName).toBe('Shirt')
      expect(s.features).toEqual(['Control de tallas y colores', 'Política de cambios 15 días', 'Margen óptimo 50%'])
      expect(s.labels.singular).toBe('Prenda / Calzado')
      expect(s.labels.plural).toBe('Prendas & Colecciones')
      expect(s.labels.identifier).toBe('SKU / Talla / Color')
      expect(s.labels.unit).toBe('prendas')
      expect(s.labels.clientRole).toBe('Cliente')
      expect(s.labels.actionNew).toBe('Registrar Prenda')
      expect(s.labels.primaryAction).toBe('Venta Mostrador')
      expect(SECTOR_WORKFLOW_DEFAULTS.fashion_apparel.allowCreditSales).toBe(true)
    })

    it('Sector 4: grocery_supermarket conserva sus propiedades originales', () => {
      const s = SECTOR_INFO.grocery_supermarket
      expect(s.title).toBe('Minimarket, Abarrotes & Alimentos')
      expect(s.description).toBe('Alta rotación, escaneo rápido de código de barras y tickets de caja.')
      expect(s.tag).toBe('MINIMARKET')
      expect(s.suggestedMargin).toBe(25)
      expect(s.iconName).toBe('ShoppingBasket')
      expect(s.features).toEqual(['Escaneo de alta velocidad', 'Control de mermas', 'Margen óptimo 25%'])
      expect(s.labels.singular).toBe('Artículo / Abarrote')
      expect(s.labels.plural).toBe('Abarrotes & Víveres')
      expect(s.labels.identifier).toBe('Código de Barras')
      expect(s.labels.unit).toBe('piezas')
      expect(s.labels.clientRole).toBe('Cliente')
      expect(s.labels.actionNew).toBe('Registrar Abarrote')
      expect(s.labels.primaryAction).toBe('Despacho Caja')
      expect(SECTOR_WORKFLOW_DEFAULTS.grocery_supermarket.allowCreditSales).toBe(false)
    })

    it('Sector 5: hardware_construction conserva sus propiedades originales', () => {
      const s = SECTOR_INFO.hardware_construction
      expect(s.title).toBe('Ferretería & Materiales')
      expect(s.description).toBe('Ventas por volumen, cotizaciones y gestión de créditos a maestros de obra.')
      expect(s.tag).toBe('FERRETERÍA')
      expect(s.suggestedMargin).toBe(30)
      expect(s.iconName).toBe('Wrench')
      expect(s.features).toEqual(['Venta por volumen/medida', 'Crédito a constructores', 'Margen óptimo 30%'])
      expect(s.labels.singular).toBe('Material / Herramienta')
      expect(s.labels.plural).toBe('Materiales & Herramientas')
      expect(s.labels.identifier).toBe('Código / Referencia')
      expect(s.labels.unit).toBe('metros/kilos/pzas')
      expect(s.labels.clientRole).toBe('Contratista / Maestro')
      expect(s.labels.actionNew).toBe('Registrar Material')
      expect(s.labels.primaryAction).toBe('Remisión / Venta')
      expect(SECTOR_WORKFLOW_DEFAULTS.hardware_construction.allowCreditSales).toBe(true)
    })

    it('Sector 6: pharmacy_health conserva sus propiedades originales', () => {
      const s = SECTOR_INFO.pharmacy_health
      expect(s.title).toBe('Droguería & Farmacia')
      expect(s.description).toBe('Control de lotes, fechas de vencimiento y despacho seguro de medicamentos.')
      expect(s.tag).toBe('FARMACIA')
      expect(s.suggestedMargin).toBe(30)
      expect(s.iconName).toBe('HeartPulse')
      expect(s.features).toEqual(['Control de lotes y vencimiento', 'Dispensación segura', 'Margen óptimo 30%'])
      expect(s.labels.singular).toBe('Medicamento / Fármaco')
      expect(s.labels.plural).toBe('Medicamentos & Salud')
      expect(s.labels.identifier).toBe('Registro Sanitario / Lote')
      expect(s.labels.unit).toBe('cajas/blísters')
      expect(s.labels.clientRole).toBe('Paciente / Cliente')
      expect(s.labels.actionNew).toBe('Registrar Medicamento')
      expect(s.labels.primaryAction).toBe('Dispensación')
      expect(SECTOR_WORKFLOW_DEFAULTS.pharmacy_health.allowCreditSales).toBe(true)
    })

    it('Sector 7: services_workshop conserva sus propiedades originales', () => {
      const s = SECTOR_INFO.services_workshop
      expect(s.title).toBe('Servicios Profesionales & Talleres')
      expect(s.description).toBe('Cotizaciones, mano de obra, facturación de servicios y contratos.')
      expect(s.tag).toBe('SERVICIOS')
      expect(s.suggestedMargin).toBe(45)
      expect(s.iconName).toBe('Briefcase')
      expect(s.features).toEqual(['Tarifas de mano de obra', 'Garantía 30 días', 'Margen óptimo 45%'])
      expect(s.labels.singular).toBe('Servicio / Labor')
      expect(s.labels.plural).toBe('Servicios & Órdenes')
      expect(s.labels.identifier).toBe('Código de Servicio')
      expect(s.labels.unit).toBe('horas/servicios')
      expect(s.labels.clientRole).toBe('Cliente / Contratante')
      expect(s.labels.actionNew).toBe('Registrar Servicio')
      expect(s.labels.primaryAction).toBe('Orden de Servicio')
      expect(SECTOR_WORKFLOW_DEFAULTS.services_workshop.allowCreditSales).toBe(true)
      expect(SECTOR_WORKFLOW_DEFAULTS.services_workshop.barcodeContinuousScan).toBe(false)
    })

    it('getSectorProfile fallback sigue resolviendo retail_general sin alterar datos', () => {
      expect(getSectorProfile(null)).toEqual(SECTOR_INFO.retail_general)
      expect(getSectorProfile(undefined)).toEqual(SECTOR_INFO.retail_general)
      // @ts-expect-error probando valor arbitrario inválido
      expect(getSectorProfile('sector_inexistente')).toEqual(SECTOR_INFO.retail_general)
    })
  })
})
