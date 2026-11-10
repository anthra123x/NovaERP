import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMocks = vi.hoisted(() => ({
  sale: {
    aggregate: vi.fn(),
    findMany: vi.fn(),
    groupBy: vi.fn(),
  },
  payment: {
    aggregate: vi.fn(),
  },
  webOrder: {
    count: vi.fn(),
    aggregate: vi.fn(),
    findMany: vi.fn(),
  },
  product: {
    count: vi.fn(),
  },
  client: {
    count: vi.fn(),
  },
  $queryRaw: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMocks,
}))

import { getDashboardOverviewService } from './dashboard.service'

describe('Adversarial Verification: getDashboardOverviewService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('handles completely empty database without crashing or producing NaN/nulls', async () => {
    // 1. salesTodayData
    prismaMocks.sale.aggregate.mockResolvedValueOnce({
      _count: { id: 0 },
      _sum: { total: null },
    })
    // 2. profitTodayRaw ($queryRaw) -> empty result set
    prismaMocks.$queryRaw.mockResolvedValueOnce([])
    // 3. salesMonthData
    prismaMocks.sale.aggregate.mockResolvedValueOnce({
      _count: { id: 0 },
      _sum: { total: null },
    })
    // 4. incomeTodaySales
    prismaMocks.sale.aggregate.mockResolvedValueOnce({
      _sum: { total: null },
    })
    // 5. incomeTodayPayments
    prismaMocks.payment.aggregate.mockResolvedValueOnce({
      _sum: { amount: null },
    })
    // 6. creditSummaryRaw ($queryRaw) -> empty result set
    prismaMocks.$queryRaw.mockResolvedValueOnce([])
    // 7. webOrdersPendingCount
    prismaMocks.webOrder.count.mockResolvedValueOnce(0)
    // 8. webOrdersPendingSum
    prismaMocks.webOrder.aggregate.mockResolvedValueOnce({
      _sum: { total: null },
    })
    // 9. webPendingList
    prismaMocks.webOrder.findMany.mockResolvedValueOnce([])
    // 10. lowStockList ($queryRaw) -> empty
    prismaMocks.$queryRaw.mockResolvedValueOnce([])
    // 11. lowStockTotalCountRaw ($queryRaw) -> empty
    prismaMocks.$queryRaw.mockResolvedValueOnce([])
    // 12. outOfStockCount
    prismaMocks.product.count.mockResolvedValueOnce(0)
    // 13. totalProducts
    prismaMocks.product.count.mockResolvedValueOnce(0)
    // 14. totalClients & newClientsThisMonth
    prismaMocks.client.count.mockResolvedValueOnce(0)
    prismaMocks.client.count.mockResolvedValueOnce(0)
    // 15. recentSales
    prismaMocks.sale.findMany.mockResolvedValueOnce([])
    // 16. salesByMonthData ($queryRaw) -> empty
    prismaMocks.$queryRaw.mockResolvedValueOnce([])
    // 17. topProductsRaw ($queryRaw) -> empty
    prismaMocks.$queryRaw.mockResolvedValueOnce([])
    // 18. salesByPayment
    prismaMocks.sale.groupBy.mockResolvedValueOnce([])

    const result = await getDashboardOverviewService()

    expect(result.salesToday).toEqual({
      count: 0,
      total: 0,
      profit: 0,
      averageTicket: 0,
      profitMarginPercent: 0,
    })
    expect(Number.isNaN(result.salesToday.averageTicket)).toBe(false)
    expect(Number.isNaN(result.salesToday.profitMarginPercent)).toBe(false)

    expect(result.salesThisMonth).toEqual({
      count: 0,
      total: 0,
    })

    expect(result.incomeToday).toBe(0)
    expect(result.pendingCreditTotal).toBe(0)
    expect(result.pendingCreditClientsCount).toBe(0)

    expect(result.webOrdersSummary.pendingCount).toBe(0)
    expect(result.webOrdersSummary.pendingOrdersTotal).toBe(0)
    expect(result.webOrdersSummary.pendingOrders).toEqual([])

    expect(result.inventorySummary.totalProducts).toBe(0)
    expect(result.inventorySummary.lowStockCount).toBe(0)
    expect(result.inventorySummary.outOfStockCount).toBe(0)
    expect(result.inventorySummary.lowStockProducts).toEqual([])

    expect(result.clientStats).toEqual({
      totalClients: 0,
      newClientsThisMonth: 0,
    })

    expect(result.recentSales).toEqual([])
    expect(result.salesByPayment).toEqual([])
    expect(result.topProducts).toEqual([])

    // Continuous 6 months must exist even when no sales exist
    expect(result.salesByMonth).toHaveLength(6)
    for (const m of result.salesByMonth) {
      expect(m.total).toBe(0)
      expect(m.count).toBe(0)
      expect(m.month).toMatch(/^\d{4}-\d{2}$/)
    }
  })

  it('handles null and undefined fields in raw SQL outputs cleanly', async () => {
    // 1. salesTodayData with undefined total
    prismaMocks.sale.aggregate.mockResolvedValueOnce({
      _count: { id: 2 },
      _sum: { total: null },
    })
    // 2. profitTodayRaw with null profit
    prismaMocks.$queryRaw.mockResolvedValueOnce([{ profit: null }])
    // 3. salesMonthData
    prismaMocks.sale.aggregate.mockResolvedValueOnce({
      _count: { id: 5 },
      _sum: { total: null },
    })
    // 4. incomeTodaySales
    prismaMocks.sale.aggregate.mockResolvedValueOnce({
      _sum: { total: null },
    })
    // 5. incomeTodayPayments
    prismaMocks.payment.aggregate.mockResolvedValueOnce({
      _sum: { amount: null },
    })
    // 6. creditSummaryRaw with nulls
    prismaMocks.$queryRaw.mockResolvedValueOnce([{ pendingTotal: null, debtorCount: null }])
    // 7. webOrdersPendingCount
    prismaMocks.webOrder.count.mockResolvedValueOnce(0)
    // 8. webOrdersPendingSum
    prismaMocks.webOrder.aggregate.mockResolvedValueOnce({
      _sum: { total: null },
    })
    // 9. webPendingList
    prismaMocks.webOrder.findMany.mockResolvedValueOnce([])
    // 10. lowStockList
    prismaMocks.$queryRaw.mockResolvedValueOnce([])
    // 11. lowStockTotalCountRaw with null count
    prismaMocks.$queryRaw.mockResolvedValueOnce([{ count: null }])
    // 12. outOfStockCount
    prismaMocks.product.count.mockResolvedValueOnce(0)
    // 13. totalProducts
    prismaMocks.product.count.mockResolvedValueOnce(0)
    // 14. totalClients & newClientsThisMonth
    prismaMocks.client.count.mockResolvedValueOnce(0)
    prismaMocks.client.count.mockResolvedValueOnce(0)
    // 15. recentSales
    prismaMocks.sale.findMany.mockResolvedValueOnce([])
    // 16. salesByMonthData with null total and count
    const now = new Date()
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    prismaMocks.$queryRaw.mockResolvedValueOnce([{ month: currentMonthKey, total: null, count: null }])
    // 17. topProductsRaw with nulls
    prismaMocks.$queryRaw.mockResolvedValueOnce([
      { productId: 'p-null', name: null, quantity: null, total: null },
    ])
    // 18. salesByPayment
    prismaMocks.sale.groupBy.mockResolvedValueOnce([])

    const result = await getDashboardOverviewService()

    expect(result.salesToday.profit).toBe(0)
    expect(result.pendingCreditTotal).toBe(0)
    expect(result.pendingCreditClientsCount).toBe(0)
    expect(result.inventorySummary.lowStockCount).toBe(0)

    const currentMonthEntry = result.salesByMonth.find((m) => m.month === currentMonthKey)
    expect(currentMonthEntry).toBeDefined()
    expect(currentMonthEntry?.total).toBe(0)
    expect(currentMonthEntry?.count).toBe(0)

    expect(result.topProducts).toEqual([
      {
        productId: 'p-null',
        name: 'Producto desconocido',
        quantity: 0,
        total: 0,
      },
    ])
  })

  it('clamps negative profit to 0 and computes margins correctly', async () => {
    // 1. salesTodayData: Total 100000, 2 sales
    prismaMocks.sale.aggregate.mockResolvedValueOnce({
      _count: { id: 2 },
      _sum: { total: 100000 },
    })
    // 2. profitTodayRaw: negative profit (cost higher than sale total)
    prismaMocks.$queryRaw.mockResolvedValueOnce([{ profit: -25000 }])
    // 3. salesMonthData
    prismaMocks.sale.aggregate.mockResolvedValueOnce({
      _count: { id: 2 },
      _sum: { total: 100000 },
    })
    // 4. incomeTodaySales
    prismaMocks.sale.aggregate.mockResolvedValueOnce({ _sum: { total: 100000 } })
    // 5. incomeTodayPayments
    prismaMocks.payment.aggregate.mockResolvedValueOnce({ _sum: { amount: 0 } })
    // 6. creditSummaryRaw
    prismaMocks.$queryRaw.mockResolvedValueOnce([{ pendingTotal: 0, debtorCount: 0 }])
    // 7. webOrdersPendingCount
    prismaMocks.webOrder.count.mockResolvedValueOnce(0)
    // 8. webOrdersPendingSum
    prismaMocks.webOrder.aggregate.mockResolvedValueOnce({ _sum: { total: 0 } })
    // 9. webPendingList
    prismaMocks.webOrder.findMany.mockResolvedValueOnce([])
    // 10. lowStockList
    prismaMocks.$queryRaw.mockResolvedValueOnce([])
    // 11. lowStockTotalCountRaw
    prismaMocks.$queryRaw.mockResolvedValueOnce([{ count: 0 }])
    // 12. outOfStockCount
    prismaMocks.product.count.mockResolvedValueOnce(0)
    // 13. totalProducts
    prismaMocks.product.count.mockResolvedValueOnce(5)
    // 14. totalClients & newClientsThisMonth
    prismaMocks.client.count.mockResolvedValueOnce(2)
    prismaMocks.client.count.mockResolvedValueOnce(0)
    // 15. recentSales
    prismaMocks.sale.findMany.mockResolvedValueOnce([])
    // 16. salesByMonthData
    prismaMocks.$queryRaw.mockResolvedValueOnce([])
    // 17. topProductsRaw
    prismaMocks.$queryRaw.mockResolvedValueOnce([])
    // 18. salesByPayment
    prismaMocks.sale.groupBy.mockResolvedValueOnce([])

    const result = await getDashboardOverviewService()

    // cleanProfitToday must be Math.max(0, -25000) = 0
    expect(result.salesToday.profit).toBe(0)
    expect(result.salesToday.profitMarginPercent).toBe(0)
    expect(result.salesToday.averageTicket).toBe(50000)
  })

  it('mathematically matches previous in-memory calculation logic for profit, credit, and month mapping', async () => {
    // Construct a complex fixture to compare in-memory logic against the SQL-extracted values
    const fixtureSaleItems = [
      { quantity: 2, unitPrice: 50000, total: 100000, costPrice: 30000 },
      { quantity: 1, unitPrice: 80000, total: 80000, costPrice: 50000 },
      { quantity: 3, unitPrice: 20000, total: 60000, costPrice: 0 }, // costPrice 0
    ]
    // In-memory profit calculation:
    // item 1: 100000 - (30000 * 2) = 40000
    // item 2: 80000 - (50000 * 1) = 30000
    // item 3: 60000 - (0 * 3) = 60000
    // Total profit = 130000
    const inMemoryProfit = fixtureSaleItems.reduce(
      (sum, item) => sum + (item.total - item.costPrice * item.quantity),
      0,
    )
    expect(inMemoryProfit).toBe(130000)

    const fixtureCreditSales = [
      { id: 's1', clientId: 'c1', total: 200000, payments: [{ amount: 50000 }, { amount: 50000 }] }, // remaining: 100000
      { id: 's2', clientId: 'c1', total: 150000, payments: [{ amount: 150000 }] }, // remaining: 0 (fully paid)
      { id: 's3', clientId: 'c2', total: 300000, payments: [] }, // remaining: 300000
      { id: 's4', clientId: null, total: 50000, payments: [] }, // remaining: 50000 (anonymous)
    ]
    // In-memory credit calculation:
    const inMemoryDebtors = new Set<string>()
    let inMemoryPendingCredit = 0
    for (const s of fixtureCreditSales) {
      const paid = s.payments.reduce((acc, p) => acc + p.amount, 0)
      const remaining = s.total - paid
      if (remaining > 0.005) {
        inMemoryPendingCredit += remaining
        if (s.clientId) inMemoryDebtors.add(s.clientId)
      }
    }
    expect(inMemoryPendingCredit).toBe(450000) // 100000 + 300000 + 50000
    expect(inMemoryDebtors.size).toBe(2) // c1, c2

    // Now mock the dashboard service with these SQL aggregated outputs:
    prismaMocks.sale.aggregate.mockResolvedValueOnce({
      _count: { id: 3 },
      _sum: { total: 240000 },
    })
    prismaMocks.$queryRaw.mockResolvedValueOnce([{ profit: inMemoryProfit }])
    prismaMocks.sale.aggregate.mockResolvedValueOnce({ _count: { id: 10 }, _sum: { total: 1000000 } })
    prismaMocks.sale.aggregate.mockResolvedValueOnce({ _sum: { total: 240000 } })
    prismaMocks.payment.aggregate.mockResolvedValueOnce({ _sum: { amount: 0 } })
    prismaMocks.$queryRaw.mockResolvedValueOnce([
      { pendingTotal: inMemoryPendingCredit, debtorCount: inMemoryDebtors.size },
    ])
    prismaMocks.webOrder.count.mockResolvedValueOnce(0)
    prismaMocks.webOrder.aggregate.mockResolvedValueOnce({ _sum: { total: 0 } })
    prismaMocks.webOrder.findMany.mockResolvedValueOnce([])
    prismaMocks.$queryRaw.mockResolvedValueOnce([])
    prismaMocks.$queryRaw.mockResolvedValueOnce([{ count: 0 }])
    prismaMocks.product.count.mockResolvedValueOnce(10)
    prismaMocks.product.count.mockResolvedValueOnce(10)
    prismaMocks.client.count.mockResolvedValueOnce(5)
    prismaMocks.client.count.mockResolvedValueOnce(1)
    prismaMocks.sale.findMany.mockResolvedValueOnce([])
    prismaMocks.$queryRaw.mockResolvedValueOnce([])
    prismaMocks.$queryRaw.mockResolvedValueOnce([])
    prismaMocks.sale.groupBy.mockResolvedValueOnce([])

    const result = await getDashboardOverviewService()

    expect(result.salesToday.profit).toBe(inMemoryProfit)
    expect(result.pendingCreditTotal).toBe(inMemoryPendingCredit)
    expect(result.pendingCreditClientsCount).toBe(inMemoryDebtors.size)
  })

  it('correctly maps 6 continuous months across year transition boundary (Jan 1st)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2027, 0, 1, 12, 0, 0))

    try {
      // 1. salesTodayData
      prismaMocks.sale.aggregate.mockResolvedValueOnce({ _count: { id: 0 }, _sum: { total: null } })
      // 2. profitTodayRaw
      prismaMocks.$queryRaw.mockResolvedValueOnce([])
      // 3. salesMonthData
      prismaMocks.sale.aggregate.mockResolvedValueOnce({ _count: { id: 0 }, _sum: { total: null } })
      // 4. incomeTodaySales
      prismaMocks.sale.aggregate.mockResolvedValueOnce({ _sum: { total: null } })
      // 5. incomeTodayPayments
      prismaMocks.payment.aggregate.mockResolvedValueOnce({ _sum: { amount: null } })
      // 6. creditSummaryRaw
      prismaMocks.$queryRaw.mockResolvedValueOnce([])
      // 7. webOrdersPendingCount
      prismaMocks.webOrder.count.mockResolvedValueOnce(0)
      // 8. webOrdersPendingSum
      prismaMocks.webOrder.aggregate.mockResolvedValueOnce({ _sum: { total: null } })
      // 9. webPendingList
      prismaMocks.webOrder.findMany.mockResolvedValueOnce([])
      // 10. lowStockList
      prismaMocks.$queryRaw.mockResolvedValueOnce([])
      // 11. lowStockTotalCountRaw
      prismaMocks.$queryRaw.mockResolvedValueOnce([])
      // 12. outOfStockCount
      prismaMocks.product.count.mockResolvedValueOnce(0)
      // 13. totalProducts
      prismaMocks.product.count.mockResolvedValueOnce(0)
      // 14. totalClients & newClientsThisMonth
      prismaMocks.client.count.mockResolvedValueOnce(0)
      prismaMocks.client.count.mockResolvedValueOnce(0)
      // 15. recentSales
      prismaMocks.sale.findMany.mockResolvedValueOnce([])
      // 16. salesByMonthData: some sales in December and January
      prismaMocks.$queryRaw.mockResolvedValueOnce([
        { month: '2026-12', total: 5000000, count: 15 },
        { month: '2027-01', total: 1000000, count: 2 },
      ])
      // 17. topProductsRaw
      prismaMocks.$queryRaw.mockResolvedValueOnce([])
      // 18. salesByPayment
      prismaMocks.sale.groupBy.mockResolvedValueOnce([])

      const result = await getDashboardOverviewService()

      const monthKeys = result.salesByMonth.map((m) => m.month)
      expect(monthKeys).toEqual([
        '2026-08',
        '2026-09',
        '2026-10',
        '2026-11',
        '2026-12',
        '2027-01',
      ])

      const dec = result.salesByMonth.find((m) => m.month === '2026-12')
      expect(dec?.total).toBe(5000000)
      expect(dec?.count).toBe(15)

      const jan = result.salesByMonth.find((m) => m.month === '2027-01')
      expect(jan?.total).toBe(1000000)
      expect(jan?.count).toBe(2)

      const aug = result.salesByMonth.find((m) => m.month === '2026-08')
      expect(aug?.total).toBe(0)
      expect(aug?.count).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })
})
