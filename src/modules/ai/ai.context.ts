import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/format'
import { getSectorProfile, type BusinessSector, type SectorProfile } from '@/lib/business-workflow'

export interface BusinessSnapshot {
  company: {
    name: string
    storeName: string
    currency: string
    lowStockThreshold: number
    webPendingExpiryHours: number
  }
  sector: {
    key: BusinessSector
    title: string
    tag: string
    suggestedMargin: number
    labels: SectorProfile['labels']
  }
  salesToday: { count: number; total: number }
  salesThisMonth: { count: number; total: number }
  pendingCredit: { total: number; salesCount: number }
  inventory: {
    products: number
    units: number
    lowStockCount: number
    outOfStockCount: number
    lowStockTop: Array<{ name: string; stock: number; threshold: number; category: string | null }>
  }
  webOrders: Record<'PENDING' | 'CONFIRMED' | 'CONVERTED' | 'CANCELLED', number>
  clients: { total: number; newThisMonth: number }
  contactUnread: number
  webVisibleProducts: number
  askedAt: string
}

export function dateStartOfDay(): Date {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  return start
}

export function dateStartOfMonth(): Date {
  const start = new Date()
  start.setDate(1)
  start.setHours(0, 0, 0, 0)
  return start
}

export function dateDaysAgo(days: number): Date {
  const start = new Date()
  start.setDate(start.getDate() - days)
  start.setHours(0, 0, 0, 0)
  return start
}

export async function collectBusinessData(): Promise<BusinessSnapshot> {
  const [settings, storeSetting, workflowSetting] = await Promise.all([
    prisma.systemSettings.findFirst({
      select: {
        companyName: true,
        currency: true,
        lowStockThreshold: true,
        webPendingExpiryHours: true,
      },
    }),
    prisma.storeSetting.findUnique({ where: { key: 'store' } }),
    prisma.storeSetting.findUnique({ where: { key: 'business_workflow' } }),
  ])

  const rawWorkflow =
    workflowSetting && typeof workflowSetting.value === 'object' && workflowSetting.value !== null
      ? (workflowSetting.value as Record<string, unknown>)
      : {}
  const sectorKey = (rawWorkflow.sector as BusinessSector) || 'technology_repair'
  const sectorProfile = getSectorProfile(sectorKey)

  const sector = {
    key: sectorKey,
    title: sectorProfile.title,
    tag: sectorProfile.tag,
    suggestedMargin: sectorProfile.suggestedMargin,
    labels: sectorProfile.labels,
  }

  const lowStockThreshold = settings?.lowStockThreshold ?? 5
  const company = {
    name: settings?.companyName || 'Cilmax',
    storeName:
      typeof storeSetting?.value === 'object' &&
      storeSetting.value !== null &&
      (storeSetting.value as Record<string, unknown>).storeName
        ? String((storeSetting.value as Record<string, unknown>).storeName)
        : settings?.companyName || 'Cilmax',
    currency: settings?.currency || 'COP',
    lowStockThreshold,
    webPendingExpiryHours: settings?.webPendingExpiryHours ?? 24,
  }

  const dayStart = dateStartOfDay()
  const monthStart = dateStartOfMonth()

  const [
    salesTodayData,
    salesMonthData,
    creditSummaryRaw,
    totalProducts,
    unitsAgg,
    lowStockCountRaw,
    outOfStockCount,
    lowStockTopRaw,
    webOrderGroups,
    clientsTotal,
    clientsNew,
    contactUnread,
    webVisible,
  ] = await Promise.all([
    // 1. Ventas hoy (agregadas en SQL)
    prisma.sale.aggregate({
      where: { status: 'COMPLETED', saleDate: { gte: dayStart } },
      _count: { id: true },
      _sum: { total: true },
    }),
    // 2. Ventas mes (agregadas en SQL)
    prisma.sale.aggregate({
      where: { status: 'COMPLETED', saleDate: { gte: monthStart } },
      _count: { id: true },
      _sum: { total: true },
    }),
    // 3. Cartera a crédito pendiente agregada en SQL
    prisma.$queryRaw<Array<{ total: number; salesCount: number }>>`
      SELECT
        COALESCE(SUM(s.total - COALESCE(p.paid, 0)), 0)::float AS total,
        COUNT(*)::int AS "salesCount"
      FROM sales s
      LEFT JOIN (
        SELECT "saleId", SUM(amount) AS paid
        FROM payments
        GROUP BY "saleId"
      ) p ON p."saleId" = s.id
      WHERE s."paymentMethod" = 'CREDITO'
        AND s.status = 'COMPLETED'
        AND (s.total - COALESCE(p.paid, 0)) > 0.005
    `,
    // 4. Conteo de productos activos
    prisma.product.count({ where: { deletedAt: null } }),
    // 5. Total de unidades en stock
    prisma.product.aggregate({
      where: { deletedAt: null },
      _sum: { stock: true },
    }),
    // 6. Conteo de stock bajo
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count
      FROM products
      WHERE "deletedAt" IS NULL
        AND stock <= "lowStockThreshold"
    `,
    // 7. Conteo de agotados
    prisma.product.count({ where: { deletedAt: null, stock: { lte: 0 } } }),
    // 8. Top 10 productos con stock bajo (con categoría)
    prisma.$queryRaw<Array<{ name: string; stock: number; threshold: number; category: string | null }>>`
      SELECT
        p.name,
        p.stock,
        p."lowStockThreshold" AS threshold,
        c.name AS category
      FROM products p
      LEFT JOIN product_categories c ON c.id = p."categoryId"
      WHERE p."deletedAt" IS NULL
        AND p.stock <= p."lowStockThreshold"
      ORDER BY p.stock ASC
      LIMIT 10
    `,
    // 9. Pedidos web agrupados por estado
    prisma.webOrder.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    // 10. Clientes totales
    prisma.client.count({ where: { deletedAt: null } }),
    // 11. Clientes nuevos del mes
    prisma.client.count({ where: { deletedAt: null, createdAt: { gte: monthStart } } }),
    // 12. Mensajes de contacto no leídos
    prisma.contactMessage.count({ where: { read: false } }),
    // 13. Productos visibles en web
    prisma.product.count({ where: { deletedAt: null, webVisible: true } }),
  ])

  const salesTodayCount = salesTodayData?._count?.id ?? 0
  const salesTodayTotal = salesTodayData?._sum?.total ?? 0
  const salesMonthCount = salesMonthData?._count?.id ?? 0
  const salesMonthTotal = salesMonthData?._sum?.total ?? 0

  const creditTotal = Number(creditSummaryRaw?.[0]?.total ?? 0)
  const creditSalesCount = Number(creditSummaryRaw?.[0]?.salesCount ?? 0)

  const lowStockCount = Number(lowStockCountRaw?.[0]?.count ?? 0)

  const webOrderCounts: BusinessSnapshot['webOrders'] = {
    PENDING: 0,
    CONFIRMED: 0,
    CONVERTED: 0,
    CANCELLED: 0,
  }
  for (const group of webOrderGroups ?? []) {
    if (group.status in webOrderCounts) {
      webOrderCounts[group.status as keyof typeof webOrderCounts] = group._count?.id ?? 0
    }
  }

  const lowStockTop = (lowStockTopRaw ?? []).map((p) => ({
    name: p.name,
    stock: Number(p.stock),
    threshold: Number(p.threshold),
    category: p.category ?? null,
  }))

  return {
    company,
    sector,
    salesToday: { count: salesTodayCount, total: salesTodayTotal },
    salesThisMonth: { count: salesMonthCount, total: salesMonthTotal },
    pendingCredit: { total: creditTotal, salesCount: creditSalesCount },
    inventory: {
      products: totalProducts ?? 0,
      units: unitsAgg?._sum?.stock ?? 0,
      lowStockCount,
      outOfStockCount: outOfStockCount ?? 0,
      lowStockTop,
    },
    webOrders: webOrderCounts,
    clients: { total: clientsTotal ?? 0, newThisMonth: clientsNew ?? 0 },
    contactUnread: contactUnread ?? 0,
    webVisibleProducts: webVisible ?? 0,
    askedAt: new Date().toISOString(),
  }
}

export function businessSnapshotToText(snapshot: BusinessSnapshot): string {
  const cur = snapshot.company.currency
  const format = (n: number) => formatCurrency(n, cur)
  const sector = snapshot.sector
  const lbl = sector?.labels ?? {
    singular: 'Producto',
    plural: 'Productos',
    identifier: 'Código / SKU',
    identifierPlaceholder: 'SKU o Código de barras',
    unit: 'unidades',
    clientRole: 'Cliente',
    actionNew: 'Nuevo Producto',
    primaryAction: 'Nueva Venta',
    searchPlaceholder: 'Buscar productos...',
  }

  const lines = [
    `Empresa: ${snapshot.company.name}${snapshot.company.storeName !== snapshot.company.name ? ` | Tienda online: ${snapshot.company.storeName}` : ''}`,
    sector ? `Sector: [${sector.tag}] ${sector.title} (Margen recomendado: ${sector.suggestedMargin}%)` : '',
    `Fecha de los datos: ${new Date(snapshot.askedAt).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}`,
    '',
    'Ventas:',
    `  • Hoy: ${snapshot.salesToday.count} ventas por ${format(snapshot.salesToday.total)}`,
    `  • Este mes: ${snapshot.salesThisMonth.count} ventas por ${format(snapshot.salesThisMonth.total)}`,
    `  • Crédito pendiente de cobro: ${format(snapshot.pendingCredit.total)} (${snapshot.pendingCredit.salesCount} ventas a crédito)`,
    '',
    `Catálogo e Inventario (${lbl.plural}):`,
    `  • ${snapshot.inventory.products} ${lbl.plural.toLowerCase()} activos, ${snapshot.inventory.units} ${lbl.unit} en stock`,
    `  • ${snapshot.inventory.lowStockCount} ${lbl.plural.toLowerCase()} con stock bajo (umbral <= ${snapshot.company.lowStockThreshold})`,
    `  • ${snapshot.inventory.outOfStockCount} ${lbl.plural.toLowerCase()} agotados`,
    `  • ${lbl.plural} con stock bajo (top 10):`,
    ...(snapshot.inventory.lowStockTop.length
      ? snapshot.inventory.lowStockTop.map(
          (p) => `    - ${p.name}: ${p.stock} ${lbl.unit} (mín ${p.threshold})${p.category ? ` - ${p.category}` : ''}`,
        )
      : ['    (ninguno)']),
    '',
    'Tienda online:',
    `  • Pedidos: ${snapshot.webOrders.PENDING} pendientes, ${snapshot.webOrders.CONFIRMED} confirmados, ${snapshot.webOrders.CONVERTED} convertidos, ${snapshot.webOrders.CANCELLED} cancelados`,
    `  • Los pedidos pendientes se cancelan automáticamente tras ${snapshot.company.webPendingExpiryHours} horas sin confirmar`,
    `  • ${snapshot.webVisibleProducts} ${lbl.plural.toLowerCase()} visibles en el catálogo web`,
    '',
    `${lbl.clientRole}s:`,
    `  • ${snapshot.clients.total} ${lbl.clientRole.toLowerCase()}s registrados, ${snapshot.clients.newThisMonth} nuevos este mes`,
    `  • ${snapshot.contactUnread} mensajes de contacto sin leer`,
  ].filter(Boolean)

  return lines.join('\n')
}

export function buildSystemPrompt(snapshot: BusinessSnapshot): string {
  const cur = snapshot.company.currency
  const sector = snapshot.sector
  const lbl = sector?.labels ?? {
    singular: 'Producto',
    plural: 'Productos',
    identifier: 'Código / SKU',
    identifierPlaceholder: 'SKU o Código de barras',
    unit: 'unidades',
    clientRole: 'Cliente',
    actionNew: 'Nuevo Producto',
    primaryAction: 'Nueva Venta',
    searchPlaceholder: 'Buscar productos...',
  }

  return [
    `Eres el copiloto inteligente del ERP Nova para "${snapshot.company.name}"${sector ? `, adaptado al sector [${sector.tag}] (${sector.title})` : ''}.`,
    `En este negocio, los ítems de catálogo se denominan "${lbl.plural}" (unidad de medida: "${lbl.unit}"), el identificador es "${lbl.identifier}", y los clientes son "${lbl.clientRole}s".`,
    sector ? `Margen de beneficio objetivo para este sector: ~${sector.suggestedMargin}%. Prioriza recomendaciones que optimicen la rotación y liquidez.` : '',
    'Respondes en ESPAÑOL neutro, de forma breve, concisa, analítica y ejecutiva (estilo hoja de cálculo). Hablas de tú al dueño.',
    '',
    `Moneda: ${cur}. Todas las cantidades deben expresarse con el formato de moneda local.`,
    '',
    'CONTEXTO ACTUAL DEL NEGOCIO (datos reales de la base de datos, no inventados):',
    businessSnapshotToText(snapshot),
    '',
    'Reglas de negocio que debes respetar al responder:',
    `1. El stock de un ${lbl.singular.toLowerCase()} es la única fuente de verdad; no lo inventes.`,
    '2. Una venta solo pesa en ingresos si su estado es completada (COMPLETED).',
    '3. Los productos y clientes eliminados no cuentan en ningún resumen.',
    '4. Los pedidos de la tienda online nacen pendientes (PENDING) y se confirman manualmente; el stock se descuenta al confirmar.',
    '5. Puedes referir al usuario a las secciones del sistema (Ventas, Inventario, Tienda online, Reportes) cuando una acción requiera su intervención.',
    '',
    'FORMATO DE RESPUESTA:',
    'Debes responder SIEMPRE en una sola línea con JSON válido, sin texto fuera del JSON. Dos opciones:',
    '1. Si la pregunta se responde con el contexto actual o con conocimientos generales: {"text": "tu respuesta breve en español"}',
    '2. Si necesitas datos vivos más detallados (ej. lista de productos agotados, detalle de pedidos, últimas ventas): {"tool": "nombre_de_la_herramienta", "args": {}}',
    'Herramientas disponibles:',
    '  - generate_executive_report: genera informe ejecutivo global (ventas, márgenes, web, inventario, cartera).',
    '  - generate_sales_report: reporte detallado de ventas por período (args: period en "today","7d","30d","this_month","this_year").',
    '  - generate_inventory_report: reporte de inventario valorizado (costo vs venta), margen proyectado y reposición.',
    '  - generate_client_report: reporte de clientes, top compradores y deudores de crédito.',
    '  - generate_channel_report: comparativa de ventas Mostrador Físico vs Tienda Online Web.',
    '  - search_products: búsqueda en catálogo por nombre, código o categoría con existencias y precios (args: query).',
    '  - adjust_product_stock: ajuste de existencias de un producto registrando movimiento (args: productId, quantityChange, reason).',
    '  - search_clients: búsqueda de clientes por nombre o teléfono con historial y saldo (args: query).',
    '  - manage_web_order: consultar o gestionar pedidos web (args: referenceOrId, newStatus "CONFIRMED"|"CANCELLED").',
    '  - get_sales_summary: estadísticas de ventas por período (args: period en "today","7d","30d","this_month","this_year").',
    '  - get_inventory_status: inventario, productos con stock bajo y agotados, valor del stock.',
    '  - get_web_orders_status: pedidos de la tienda online por estado y pendientes más antiguos.',
    '  - get_recent_sales: últimas ventas (args: limit, número entero, por defecto 5).',
    '  - get_client_summary: clientes, nuevos del mes y mayores compradores.',
    '  - get_pending_credit: créditos pendientes de cobro.',
    '  - get_contact_messages: mensajes de contacto y reseñas recientes.',
    '  - get_finance_summary: ingresos vs gastos del mes.',
    '  - get_business_snapshot: vista general actualizada completo.',
    '',
    'Nunca inventes cifras ni afirmes datos que no vengan de fuentes confiables. Si no tienes el dato, dilo y sugiere dónde consultarlo.',
  ].join('\n')
}
