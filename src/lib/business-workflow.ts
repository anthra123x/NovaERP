export type BusinessSector =
  | 'retail_general'
  | 'technology_repair'
  | 'fashion_apparel'
  | 'grocery_supermarket'
  | 'hardware_construction'
  | 'pharmacy_health'
  | 'services_workshop'

export type TaxRegime =
  | 'responsable_iva'
  | 'no_responsable_iva'
  | 'simple_tributacion'
  | 'persona_natural'

export type TaxIdType = 'NIT' | 'RUT' | 'RFC' | 'RUC' | 'CC' | 'CIF'

export interface BusinessWorkflowConfig {
  sector: BusinessSector
  slogan: string
  taxIdType: TaxIdType
  taxIdDv: string
  taxRegime: TaxRegime
  stateRegion: string
  website: string

  // Flujo de Ventas & Mostrador POS
  allowCreditSales: boolean
  requireClientOnSale: boolean
  allowNegativeStock: boolean
  allowCashierDiscounts: boolean
  autoPrintReceipt: boolean
  defaultClientName: string

  // Parámetros Fiscales / DIAN
  dianResolutionNumber: string
  dianResolutionDate: string
  dianRangeFrom: number
  dianRangeTo: number

  // Flujo de Inventario & Almacén
  defaultProfitMargin: number
  barcodeContinuousScan: boolean
  requireAdjustmentReason: boolean

  // Identidad Visual & Marca
  companyName?: string
  logoUrl?: string | null
  brandColor?: string
}

export const WORKFLOW_STORAGE_KEY = 'nova_business_workflow_config'
export const WORKFLOW_CHANGED_EVENT = 'nova_business_workflow_changed'

export const DEFAULT_BUSINESS_WORKFLOW: BusinessWorkflowConfig = {
  sector: 'retail_general',
  slogan: 'Calidad, confianza y el mejor servicio',
  taxIdType: 'NIT',
  taxIdDv: '1',
  taxRegime: 'no_responsable_iva',
  stateRegion: 'Colombia',
  website: '',

  allowCreditSales: true,
  requireClientOnSale: false,
  allowNegativeStock: false,
  allowCashierDiscounts: true,
  autoPrintReceipt: false,
  defaultClientName: 'Consumidor Final',

  dianResolutionNumber: '',
  dianResolutionDate: '',
  dianRangeFrom: 1,
  dianRangeTo: 10000,

  defaultProfitMargin: 35,
  barcodeContinuousScan: true,
  requireAdjustmentReason: true,

  companyName: 'Nova ERP',
  logoUrl: null,
  brandColor: '#10b981',
}

export interface SectorLabels {
  singular: string
  plural: string
  identifier: string
  identifierPlaceholder: string
  unit: string
  clientRole: string
  actionNew: string
  primaryAction: string
  searchPlaceholder: string
}

export interface SectorProfile {
  title: string
  description: string
  tag: string
  defaultFooter: string
  suggestedMargin: number
  iconName: string
  features: string[]
  labels: SectorLabels
}

export const SECTOR_INFO: Record<BusinessSector, SectorProfile> = {
  retail_general: {
    title: 'Comercio General & Mostrador',
    description: 'Ventas rápidas, artículos variados y atención ágil al público.',
    tag: 'COMERCIO',
    defaultFooter: 'Garantía legal sobre productos de conformidad con la ley aplicable. Conserve su factura para cualquier reclamo.',
    suggestedMargin: 35,
    iconName: 'Store',
    features: ['Ventas de mostrador', 'Garantía legal 30 días', 'Margen óptimo 35%'],
    labels: {
      singular: 'Producto',
      plural: 'Productos',
      identifier: 'Código de barras / SKU',
      identifierPlaceholder: 'Ej: 7701234567890 o REF-101',
      unit: 'unidades',
      clientRole: 'Consumidor Final',
      actionNew: 'Nuevo Producto',
      primaryAction: 'Nueva Venta',
      searchPlaceholder: 'Buscar productos por nombre o código de barras...',
    },
  },
  technology_repair: {
    title: 'Tecnología, Telefonía & Servicio Técnico',
    description: 'Control estricto de números de serie, repuestos y órdenes técnicas.',
    tag: 'TECH·REPAIR',
    defaultFooter: 'Garantía de 90 días en repuestos y servicio técnico. No cubre humedad, golpes o intervención por terceros.',
    suggestedMargin: 40,
    iconName: 'Smartphone',
    features: ['Control de IMEI y serie', 'Garantía técnica 90 días', 'Margen repuestos 40%'],
    labels: {
      singular: 'Dispositivo / Repuesto',
      plural: 'Equipos & Repuestos',
      identifier: 'IMEI / Número de Serie',
      identifierPlaceholder: 'Ej: IMEI: 356789012345678 o S/N: TECH-99',
      unit: 'unidades',
      clientRole: 'Titular del Equipo',
      actionNew: 'Registrar Dispositivo / Repuesto',
      primaryAction: 'Recepción & Venta',
      searchPlaceholder: 'Buscar por nombre, IMEI, número de serie o modelo...',
    },
  },
  fashion_apparel: {
    title: 'Moda, Calzado & Confección',
    description: 'Control de prendas, tallas, colores y políticas de cambio en mostrador.',
    tag: 'FASHION',
    defaultFooter: 'Cambios permitidos dentro de los 15 días calendario siguientes a la compra, con etiquetas originales y prenda sin uso.',
    suggestedMargin: 50,
    iconName: 'Shirt',
    features: ['Control de tallas y colores', 'Política de cambios 15 días', 'Margen óptimo 50%'],
    labels: {
      singular: 'Prenda / Calzado',
      plural: 'Prendas & Colecciones',
      identifier: 'SKU / Talla / Color',
      identifierPlaceholder: 'Ej: CAM-AZ-L (Azul, Talla L)',
      unit: 'prendas',
      clientRole: 'Cliente',
      actionNew: 'Registrar Prenda',
      primaryAction: 'Venta Mostrador',
      searchPlaceholder: 'Buscar por prenda, referencia, talla o color...',
    },
  },
  grocery_supermarket: {
    title: 'Minimarket, Abarrotes & Alimentos',
    description: 'Alta rotación, escaneo rápido de código de barras y tickets de caja.',
    tag: 'MINIMARKET',
    defaultFooter: 'Verifique su vuelto y mercancía antes de retirarse de la caja. Productos perecederos no tienen cambio.',
    suggestedMargin: 25,
    iconName: 'ShoppingBasket',
    features: ['Escaneo de alta velocidad', 'Control de mermas', 'Margen óptimo 25%'],
    labels: {
      singular: 'Artículo / Abarrote',
      plural: 'Abarrotes & Víveres',
      identifier: 'Código de Barras',
      identifierPlaceholder: 'Ej: 7702001002003 (EAN-13)',
      unit: 'piezas',
      clientRole: 'Cliente',
      actionNew: 'Registrar Abarrote',
      primaryAction: 'Despacho Caja',
      searchPlaceholder: 'Escanear código de barras o escribir producto...',
    },
  },
  hardware_construction: {
    title: 'Ferretería & Materiales',
    description: 'Ventas por volumen, cotizaciones y gestión de créditos a maestros de obra.',
    tag: 'FERRETERÍA',
    defaultFooter: 'Materiales eléctricos y cortados a medida no tienen cambio. Precios sujetos a cambio sin previo aviso.',
    suggestedMargin: 30,
    iconName: 'Wrench',
    features: ['Venta por volumen/medida', 'Crédito a constructores', 'Margen óptimo 30%'],
    labels: {
      singular: 'Material / Herramienta',
      plural: 'Materiales & Herramientas',
      identifier: 'Código / Referencia',
      identifierPlaceholder: 'Ej: TUB-PVC-1/2-3M o REF-F09',
      unit: 'metros/kilos/pzas',
      clientRole: 'Contratista / Maestro',
      actionNew: 'Registrar Material',
      primaryAction: 'Remisión / Venta',
      searchPlaceholder: 'Buscar material por calibre, medida o referencia...',
    },
  },
  pharmacy_health: {
    title: 'Droguería & Farmacia',
    description: 'Control de lotes, fechas de vencimiento y despacho seguro de medicamentos.',
    tag: 'FARMACIA',
    defaultFooter: 'Medicamentos y productos de uso personal no tienen cambio de conformidad con la normativa sanitaria vigente.',
    suggestedMargin: 30,
    iconName: 'HeartPulse',
    features: ['Control de lotes y vencimiento', 'Dispensación segura', 'Margen óptimo 30%'],
    labels: {
      singular: 'Medicamento / Fármaco',
      plural: 'Medicamentos & Salud',
      identifier: 'Registro Sanitario / Lote',
      identifierPlaceholder: 'Ej: INVIMA 2021M-001 / Lote: L40',
      unit: 'cajas/blísters',
      clientRole: 'Paciente / Cliente',
      actionNew: 'Registrar Medicamento',
      primaryAction: 'Dispensación',
      searchPlaceholder: 'Buscar por principio activo, marca comercial o lote...',
    },
  },
  services_workshop: {
    title: 'Servicios Profesionales & Talleres',
    description: 'Cotizaciones, mano de obra, facturación de servicios y contratos.',
    tag: 'SERVICIOS',
    defaultFooter: 'Garantía de servicio de 30 días calendario sobre mano de obra realizada. Aceptación tácita según cotización previa.',
    suggestedMargin: 45,
    iconName: 'Briefcase',
    features: ['Tarifas de mano de obra', 'Garantía 30 días', 'Margen óptimo 45%'],
    labels: {
      singular: 'Servicio / Labor',
      plural: 'Servicios & Órdenes',
      identifier: 'Código de Servicio',
      identifierPlaceholder: 'Ej: SRV-MANT-01 o SRV-DIAG',
      unit: 'horas/servicios',
      clientRole: 'Cliente / Contratante',
      actionNew: 'Registrar Servicio',
      primaryAction: 'Orden de Servicio',
      searchPlaceholder: 'Buscar servicios por descripción o código...',
    },
  },
}

/**
 * Retorna el perfil semántico y adaptativo del sector de negocio seleccionado
 */
export function getSectorProfile(sector?: BusinessSector | null): SectorProfile {
  if (!sector || !SECTOR_INFO[sector]) {
    return SECTOR_INFO.retail_general
  }
  return SECTOR_INFO[sector]
}

let cachedRaw: string | null = null
let cachedWorkflow: BusinessWorkflowConfig = DEFAULT_BUSINESS_WORKFLOW

/**
 * Obtiene la configuración de flujo de trabajo del negocio con estabilidad de referencia en memoria
 */
export function getBusinessWorkflow(): BusinessWorkflowConfig {
  if (typeof window === 'undefined') return DEFAULT_BUSINESS_WORKFLOW
  try {
    const raw = localStorage.getItem(WORKFLOW_STORAGE_KEY)
    if (raw === cachedRaw && cachedWorkflow) {
      return cachedWorkflow
    }
    cachedRaw = raw
    if (!raw) {
      cachedWorkflow = DEFAULT_BUSINESS_WORKFLOW
      return cachedWorkflow
    }
    const parsed = JSON.parse(raw)
    cachedWorkflow = { ...DEFAULT_BUSINESS_WORKFLOW, ...parsed }
    return cachedWorkflow
  } catch {
    return DEFAULT_BUSINESS_WORKFLOW
  }
}

/**
 * Guarda y propaga la configuración de flujos de trabajo del negocio
 */
export function saveBusinessWorkflow(
  partial: Partial<BusinessWorkflowConfig>,
): BusinessWorkflowConfig {
  if (typeof window === 'undefined') return DEFAULT_BUSINESS_WORKFLOW
  try {
    const current = getBusinessWorkflow()
    const updated: BusinessWorkflowConfig = { ...current, ...partial }
    const raw = JSON.stringify(updated)
    cachedRaw = raw
    cachedWorkflow = updated
    localStorage.setItem(WORKFLOW_STORAGE_KEY, raw)

    window.dispatchEvent(
      new CustomEvent(WORKFLOW_CHANGED_EVENT, {
        detail: updated,
      }),
    )

    return updated
  } catch {
    return DEFAULT_BUSINESS_WORKFLOW
  }
}



