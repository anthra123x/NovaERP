import { prisma } from '@/lib/prisma'

export interface DashboardOverview {
  salesToday: {
    count: number
    total: number
    profit: number
    averageTicket: number
    profitMarginPercent: number
  }
  salesThisMonth: {
    count: number
    total: number
  }
  incomeToday: number
  pendingCreditTotal: number
  pendingCreditClientsCount: number
  webOrdersSummary: {
    pendingCount: number
    pendingOrdersTotal: number
    pendingOrders: Array<{
      id: string
      reference: string | null
      customerName: string
      customerPhone: string
      total: number
      createdAt: Date
    }>
  }
  inventorySummary: {
    totalProducts: number
    lowStockCount: number
    outOfStockCount: number
    lowStockProducts: Array<{
      id: string
      name: string
      stock: number
      lowStockThreshold: number
      salePrice: number
    }>
  }
  clientStats: {
    totalClients: number
    newClientsThisMonth: number
  }
  recentSales: Array<{
    id: string
    invoiceNumber: string
    total: number
    paymentMethod: string
    saleDate: Date
    client: { id: string; name: string } | null
  }>
  salesByPayment: Array<{
    paymentMethod: string
    _count: { id: number }
    _sum: { total: number | null }
  }>
  salesByMonth: Array<{
    month: string
    total: number
    count: number
  }>
  topProducts: Array<{
    productId: string
    quantity: number
    total: number
    name: string
  }>
}

export async function getDashboardOverviewService(): Promise<DashboardOverview> {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
  const sixMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [
    salesTodayData,
    profitTodayRaw,
    salesMonthData,
    incomeTodaySales,
    incomeTodayPayments,
    creditSummaryRaw,
    webOrdersPendingCount,
    webOrdersPendingSum,
    webPendingList,
    lowStockList,
    lowStockTotalCountRaw,
    outOfStockCount,
    totalProducts,
    totalClients,
    newClientsThisMonth,
    recentSales,
    salesByMonthData,
    topProductsRaw,
    salesByPayment,
  ] = await Promise.all([
    // 1. Ventas de hoy
    prisma.sale.aggregate({
      where: { status: 'COMPLETED', saleDate: { gte: startOfDay, lte: endOfDay } },
      _count: { id: true },
      _sum: { total: true },
    }),
    // 2. Ganancia real de hoy calculada directamente en SQL
    prisma.$queryRaw<Array<{ profit: number }>>`
      SELECT
        COALESCE(SUM(si.total - (COALESCE(p."costPrice", 0) * si.quantity)), 0)::float AS profit
      FROM sale_items si
      JOIN sales s ON s.id = si."saleId"
      LEFT JOIN products p ON p.id = si."productId"
      WHERE s.status = 'COMPLETED'
        AND s."saleDate" >= ${startOfDay}
        AND s."saleDate" <= ${endOfDay}
    `,
    // 3. Ventas del mes actual
    prisma.sale.aggregate({
      where: { status: 'COMPLETED', saleDate: { gte: startOfMonth } },
      _count: { id: true },
      _sum: { total: true },
    }),
    // 4. Ingresos de hoy en caja (no crédito)
    prisma.sale.aggregate({
      where: {
        status: 'COMPLETED',
        saleDate: { gte: startOfDay, lte: endOfDay },
        paymentMethod: { not: 'CREDITO' },
      },
      _sum: { total: true },
    }),
    // 5. Abonos de créditos recibidos hoy en caja
    prisma.payment.aggregate({
      where: { paymentDate: { gte: startOfDay, lte: endOfDay } },
      _sum: { amount: true },
    }),
    // 6. Cartera a crédito pendiente agregada en SQL (sin descargar historial completo a RAM)
    prisma.$queryRaw<Array<{ pendingTotal: number; debtorCount: number }>>`
      SELECT
        COALESCE(SUM(s.total - COALESCE(p.paid, 0)), 0)::float AS "pendingTotal",
        COUNT(DISTINCT s."clientId")::int AS "debtorCount"
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
    // 7. Pedidos web pendientes (conteo)
    prisma.webOrder.count({
      where: { status: 'PENDING' },
    }),
    // 8. Monto total de pedidos web pendientes
    prisma.webOrder.aggregate({
      where: { status: 'PENDING' },
      _sum: { total: true },
    }),
    // 9. Lista de pedidos web pendientes
    prisma.webOrder.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        reference: true,
        customerName: true,
        customerPhone: true,
        total: true,
        createdAt: true,
      },
    }),
    // 10. Productos con stock bajo (críticos)
    prisma.$queryRaw<Array<{ id: string; name: string; stock: number; lowStockThreshold: number; salePrice: number }>>`
      SELECT id, name, stock, "lowStockThreshold", "salePrice"
      FROM products
      WHERE "deletedAt" IS NULL
        AND stock <= "lowStockThreshold"
      ORDER BY stock ASC
      LIMIT 10
    `,
    // 11. Conteo REAL de todos los productos con stock bajo
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int as count
      FROM products
      WHERE "deletedAt" IS NULL
        AND stock <= "lowStockThreshold"
    `,
    // 12. Total productos agotados (stock <= 0)
    prisma.product.count({
      where: { deletedAt: null, stock: { lte: 0 } },
    }),
    // 13. Total productos activos en catálogo
    prisma.product.count({ where: { deletedAt: null } }),
    // 14. Estadísticas de clientes optimizadas (conteos directos sin traer compras a memoria)
    prisma.client.count({ where: { deletedAt: null } }),
    prisma.client.count({
      where: {
        deletedAt: null,
        createdAt: { gte: startOfMonth },
      },
    }),
    // 15. Ventas recientes
    prisma.sale.findMany({
      take: 7,
      orderBy: { saleDate: 'desc' },
      where: { status: 'COMPLETED' },
      select: {
        id: true,
        invoiceNumber: true,
        total: true,
        paymentMethod: true,
        saleDate: true,
        client: { select: { id: true, name: true } },
      },
    }),
    // 16. Ventas por mes agregadas en SQL (últimos 6 meses)
    prisma.$queryRaw<Array<{ month: string; total: number; count: number }>>`
      SELECT
        to_char(date_trunc('month', "saleDate"), 'YYYY-MM') AS month,
        COALESCE(SUM(total), 0)::float AS total,
        COUNT(*)::int AS count
      FROM sales
      WHERE status = 'COMPLETED'
        AND "saleDate" >= ${sixMonthsAgoStart}
      GROUP BY date_trunc('month', "saleDate")
      ORDER BY month ASC
    `,
    // 17. Top productos más vendidos con nombre resuelto en SQL (últimos 30 días)
    prisma.$queryRaw<Array<{ productId: string; name: string; quantity: number; total: number }>>`
      SELECT
        si."productId",
        COALESCE(p.name, 'Producto desconocido') AS name,
        COALESCE(SUM(si.quantity), 0)::int AS quantity,
        COALESCE(SUM(si.total), 0)::float AS total
      FROM sale_items si
      JOIN sales s ON s.id = si."saleId"
      LEFT JOIN products p ON p.id = si."productId"
      WHERE s.status = 'COMPLETED'
        AND s."saleDate" >= ${thirtyDaysAgo}
      GROUP BY si."productId", p.name
      ORDER BY quantity DESC
      LIMIT 6
    `,
    // 18. Ventas por método de pago
    prisma.sale.groupBy({
      by: ['paymentMethod'],
      where: { status: 'COMPLETED' },
      _count: { id: true },
      _sum: { total: true },
      orderBy: { _sum: { total: 'desc' } },
    }),
  ])

  // Métricas de ventas hoy
  const salesCountToday = salesTodayData._count.id ?? 0
  const salesTotalToday = salesTodayData._sum.total ?? 0
  const averageTicketToday = salesCountToday > 0 ? Math.round(salesTotalToday / salesCountToday) : 0

  // Margen de ganancia hoy
  const profitToday = Number(profitTodayRaw[0]?.profit ?? 0)
  const cleanProfitToday = Math.max(0, profitToday)
  const profitMarginPercent = salesTotalToday > 0 ? Math.round((cleanProfitToday / salesTotalToday) * 100) : 0

  // Ingreso total recibido hoy en caja
  const incomeToday = (incomeTodaySales._sum.total ?? 0) + (incomeTodayPayments._sum.amount ?? 0)

  // Saldo de créditos pendientes y clientes con deuda
  const pendingCreditTotal = Number(creditSummaryRaw[0]?.pendingTotal ?? 0)
  const pendingCreditClientsCount = Number(creditSummaryRaw[0]?.debtorCount ?? 0)

  // Mapeo mensual continuo (6 meses consecutivos)
  const monthlyMap: Record<string, { month: string; total: number; count: number }> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyMap[key] = { month: key, total: 0, count: 0 }
  }
  for (const s of salesByMonthData) {
    if (monthlyMap[s.month]) {
      monthlyMap[s.month].total = Number(s.total)
      monthlyMap[s.month].count = Number(s.count)
    }
  }
  const salesByMonth = Object.values(monthlyMap)

  // Mapeo top productos
  const topProducts = topProductsRaw.map((item) => ({
    productId: item.productId,
    quantity: Number(item.quantity ?? 0),
    total: Number(item.total ?? 0),
    name: item.name ?? 'Producto desconocido',
  }))

  const realLowStockCount = Number(lowStockTotalCountRaw[0]?.count ?? lowStockList.length)

  return {
    salesToday: {
      count: salesCountToday,
      total: salesTotalToday,
      profit: cleanProfitToday,
      averageTicket: averageTicketToday,
      profitMarginPercent,
    },
    salesThisMonth: {
      count: salesMonthData._count.id ?? 0,
      total: salesMonthData._sum.total ?? 0,
    },
    incomeToday,
    pendingCreditTotal,
    pendingCreditClientsCount,
    webOrdersSummary: {
      pendingCount: webOrdersPendingCount,
      pendingOrdersTotal: webOrdersPendingSum._sum.total ?? 0,
      pendingOrders: webPendingList,
    },
    inventorySummary: {
      totalProducts,
      lowStockCount: realLowStockCount,
      outOfStockCount,
      lowStockProducts: lowStockList,
    },
    clientStats: {
      totalClients: totalClients ?? 0,
      newClientsThisMonth: newClientsThisMonth ?? 0,
    },
    recentSales,
    salesByPayment: salesByPayment as Array<{
      paymentMethod: string
      _count: { id: number }
      _sum: { total: number | null }
    }>,
    salesByMonth,
    topProducts,
  }
}
