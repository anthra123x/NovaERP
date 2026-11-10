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

describe('getDashboardOverviewService SQL Aggregations and DTO Contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // 1. salesTodayData
    prismaMocks.sale.aggregate.mockResolvedValueOnce({
      _count: { id: 10 },
      _sum: { total: 1500000 },
    })

    // 2. profitTodayRaw ($queryRaw)
    prismaMocks.$queryRaw.mockResolvedValueOnce([{ profit: 450000 }])

    // 3. salesMonthData
    prismaMocks.sale.aggregate.mockResolvedValueOnce({
      _count: { id: 85 },
      _sum: { total: 12500000 },
    })

    // 4. incomeTodaySales
    prismaMocks.sale.aggregate.mockResolvedValueOnce({
      _sum: { total: 1200000 },
    })

    // 5. incomeTodayPayments
    prismaMocks.payment.aggregate.mockResolvedValueOnce({
      _sum: { amount: 300000 },
    })

    // 6. creditSummaryRaw ($queryRaw)
    prismaMocks.$queryRaw.mockResolvedValueOnce([
      { pendingTotal: 2500000, debtorCount: 8 },
    ])

    // 7. webOrdersPendingCount
    prismaMocks.webOrder.count.mockResolvedValueOnce(3)

    // 8. webOrdersPendingSum
    prismaMocks.webOrder.aggregate.mockResolvedValueOnce({
      _sum: { total: 450000 },
    })

    // 9. webPendingList
    prismaMocks.webOrder.findMany.mockResolvedValueOnce([
      {
        id: 'w-1',
        reference: 'ORD-1001',
        customerName: 'Carlos',
        customerPhone: '3001234567',
        total: 150000,
        createdAt: new Date('2026-11-09T10:00:00Z'),
      },
    ])

    // 10. lowStockList ($queryRaw)
    prismaMocks.$queryRaw.mockResolvedValueOnce([
      { id: 'p-1', name: 'Olla', stock: 2, lowStockThreshold: 5, salePrice: 85000 },
    ])

    // 11. lowStockTotalCountRaw ($queryRaw)
    prismaMocks.$queryRaw.mockResolvedValueOnce([{ count: 4 }])

    // 12. outOfStockCount
    prismaMocks.product.count.mockResolvedValueOnce(1)

    // 13. totalProducts
    prismaMocks.product.count.mockResolvedValueOnce(45)

    // 14. totalClients & newClientsThisMonth
    prismaMocks.client.count.mockResolvedValueOnce(120)
    prismaMocks.client.count.mockResolvedValueOnce(12)

    // 15. recentSales
    prismaMocks.sale.findMany.mockResolvedValueOnce([
      {
        id: 's-1',
        invoiceNumber: 'CIL-50',
        total: 150000,
        paymentMethod: 'CASH',
        saleDate: new Date('2026-11-09T12:00:00Z'),
        client: { id: 'c-1', name: 'Maria' },
      },
    ])

    // 16. salesByMonthData ($queryRaw)
    prismaMocks.$queryRaw.mockResolvedValueOnce([
      { month: '2026-10', total: 10000000, count: 70 },
      { month: '2026-11', total: 12500000, count: 85 },
    ])

    // 17. topProductsRaw ($queryRaw)
    prismaMocks.$queryRaw.mockResolvedValueOnce([
      { productId: 'p-1', name: 'Olla a Presión', quantity: 25, total: 2125000 },
    ])

    // 18. salesByPayment
    prismaMocks.sale.groupBy.mockResolvedValueOnce([
      { paymentMethod: 'CASH', _count: { id: 50 }, _sum: { total: 7500000 } },
      { paymentMethod: 'CREDITO', _count: { id: 35 }, _sum: { total: 5000000 } },
    ])
  })

  it('aggregates dashboard overview in SQL and conforms strictly to DashboardOverview DTO contract', async () => {
    const data = await getDashboardOverviewService()

    // salesToday
    expect(data.salesToday).toEqual({
      count: 10,
      total: 1500000,
      profit: 450000,
      averageTicket: 150000,
      profitMarginPercent: 30, // 450000 / 1500000 * 100
    })

    // salesThisMonth
    expect(data.salesThisMonth).toEqual({
      count: 85,
      total: 12500000,
    })

    // incomeToday = 1200000 + 300000
    expect(data.incomeToday).toBe(1500000)

    // pendingCredit via SQL aggregate
    expect(data.pendingCreditTotal).toBe(2500000)
    expect(data.pendingCreditClientsCount).toBe(8)

    // webOrdersSummary
    expect(data.webOrdersSummary.pendingCount).toBe(3)
    expect(data.webOrdersSummary.pendingOrdersTotal).toBe(450000)
    expect(data.webOrdersSummary.pendingOrders).toHaveLength(1)

    // inventorySummary
    expect(data.inventorySummary.totalProducts).toBe(45)
    expect(data.inventorySummary.lowStockCount).toBe(4)
    expect(data.inventorySummary.outOfStockCount).toBe(1)
    expect(data.inventorySummary.lowStockProducts).toHaveLength(1)

    // clientStats
    expect(data.clientStats).toEqual({
      totalClients: 120,
      newClientsThisMonth: 12,
    })

    // salesByMonth: continuous 6 months
    expect(data.salesByMonth).toHaveLength(6)

    // topProducts resolved in SQL
    expect(data.topProducts).toEqual([
      {
        productId: 'p-1',
        name: 'Olla a Presión',
        quantity: 25,
        total: 2125000,
      },
    ])
  })
})
