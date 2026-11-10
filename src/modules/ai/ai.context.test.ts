import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMocks = vi.hoisted(() => ({
  systemSettings: {
    findFirst: vi.fn(),
  },
  storeSetting: {
    findUnique: vi.fn(),
  },
  sale: {
    aggregate: vi.fn(),
  },
  product: {
    count: vi.fn(),
    aggregate: vi.fn(),
  },
  webOrder: {
    groupBy: vi.fn(),
  },
  client: {
    count: vi.fn(),
  },
  contactMessage: {
    count: vi.fn(),
  },
  $queryRaw: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMocks,
}))

import { collectBusinessData, businessSnapshotToText, buildSystemPrompt } from './ai.context'

describe('Adversarial Verification: collectBusinessData and AI Context', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('collects business data on a populated database with exact calculations', async () => {
    // Settings
    prismaMocks.systemSettings.findFirst.mockResolvedValueOnce({
      companyName: 'Ferretería Nova',
      currency: 'COP',
      lowStockThreshold: 10,
      webPendingExpiryHours: 48,
    })
    prismaMocks.storeSetting.findUnique.mockResolvedValueOnce({
      key: 'store',
      value: { storeName: 'Nova Online' },
    })
    prismaMocks.storeSetting.findUnique.mockResolvedValueOnce({
      key: 'business_workflow',
      value: { sector: 'technology_repair' },
    })

    // Parallel queries:
    // 1. salesTodayData
    prismaMocks.sale.aggregate.mockResolvedValueOnce({
      _count: { id: 5 },
      _sum: { total: 800000 },
    })
    // 2. salesMonthData
    prismaMocks.sale.aggregate.mockResolvedValueOnce({
      _count: { id: 45 },
      _sum: { total: 7200000 },
    })
    // 3. creditSummaryRaw ($queryRaw)
    prismaMocks.$queryRaw.mockResolvedValueOnce([
      { total: 1500000, salesCount: 4 },
    ])
    // 4. totalProducts
    prismaMocks.product.count.mockResolvedValueOnce(120)
    // 5. unitsAgg
    prismaMocks.product.aggregate.mockResolvedValueOnce({
      _sum: { stock: 850 },
    })
    // 6. lowStockCountRaw ($queryRaw)
    prismaMocks.$queryRaw.mockResolvedValueOnce([{ count: 6 }])
    // 7. outOfStockCount
    prismaMocks.product.count.mockResolvedValueOnce(2)
    // 8. lowStockTopRaw ($queryRaw)
    prismaMocks.$queryRaw.mockResolvedValueOnce([
      { name: 'Pantalla OLED', stock: 1, threshold: 10, category: 'Repuestos' },
      { name: 'Batería 5000mAh', stock: 3, threshold: 10, category: null },
    ])
    // 9. webOrderGroups (only 2 statuses present in DB)
    prismaMocks.webOrder.groupBy.mockResolvedValueOnce([
      { status: 'PENDING', _count: { id: 7 } },
      { status: 'CONFIRMED', _count: { id: 3 } },
    ])
    // 10. clientsTotal
    prismaMocks.client.count.mockResolvedValueOnce(85)
    // 11. clientsNew
    prismaMocks.client.count.mockResolvedValueOnce(12)
    // 12. contactUnread
    prismaMocks.contactMessage.count.mockResolvedValueOnce(4)
    // 13. webVisible
    prismaMocks.product.count.mockResolvedValueOnce(45)

    const snapshot = await collectBusinessData()

    expect(snapshot.company).toEqual({
      name: 'Ferretería Nova',
      storeName: 'Nova Online',
      currency: 'COP',
      lowStockThreshold: 10,
      webPendingExpiryHours: 48,
    })

    expect(snapshot.sector.key).toBe('technology_repair')
    expect(snapshot.salesToday).toEqual({ count: 5, total: 800000 })
    expect(snapshot.salesThisMonth).toEqual({ count: 45, total: 7200000 })
    expect(snapshot.pendingCredit).toEqual({ total: 1500000, salesCount: 4 })

    expect(snapshot.inventory).toEqual({
      products: 120,
      units: 850,
      lowStockCount: 6,
      outOfStockCount: 2,
      lowStockTop: [
        { name: 'Pantalla OLED', stock: 1, threshold: 10, category: 'Repuestos' },
        { name: 'Batería 5000mAh', stock: 3, threshold: 10, category: null },
      ],
    })

    // Web orders must map existing groups and default missing statuses to 0
    expect(snapshot.webOrders).toEqual({
      PENDING: 7,
      CONFIRMED: 3,
      CONVERTED: 0,
      CANCELLED: 0,
    })

    expect(snapshot.clients).toEqual({ total: 85, newThisMonth: 12 })
    expect(snapshot.contactUnread).toBe(4)
    expect(snapshot.webVisibleProducts).toBe(45)
    expect(new Date(snapshot.askedAt).getTime()).not.toBeNaN()

    // Test text representation
    const text = businessSnapshotToText(snapshot)
    expect(text).toContain('Ferretería Nova')
    expect(text).toContain('Nova Online')
    expect(text).toContain('800.000')
    expect(text).toContain('Pantalla OLED: 1')

    // Test prompt generation
    const prompt = buildSystemPrompt(snapshot)
    expect(prompt).toContain('Ferretería Nova')
    expect(prompt).toContain('CONTEXTO ACTUAL DEL NEGOCIO')
  })

  it('handles completely empty database without crashing or producing NaN/undefined', async () => {
    // All settings null
    prismaMocks.systemSettings.findFirst.mockResolvedValueOnce(null)
    prismaMocks.storeSetting.findUnique.mockResolvedValueOnce(null)
    prismaMocks.storeSetting.findUnique.mockResolvedValueOnce(null)

    // Parallel queries empty/null
    prismaMocks.sale.aggregate.mockResolvedValueOnce({ _count: { id: 0 }, _sum: { total: null } })
    prismaMocks.sale.aggregate.mockResolvedValueOnce({ _count: { id: 0 }, _sum: { total: null } })
    prismaMocks.$queryRaw.mockResolvedValueOnce([])
    prismaMocks.product.count.mockResolvedValueOnce(0)
    prismaMocks.product.aggregate.mockResolvedValueOnce({ _sum: { stock: null } })
    prismaMocks.$queryRaw.mockResolvedValueOnce([])
    prismaMocks.product.count.mockResolvedValueOnce(0)
    prismaMocks.$queryRaw.mockResolvedValueOnce([])
    prismaMocks.webOrder.groupBy.mockResolvedValueOnce([])
    prismaMocks.client.count.mockResolvedValueOnce(0)
    prismaMocks.client.count.mockResolvedValueOnce(0)
    prismaMocks.contactMessage.count.mockResolvedValueOnce(0)
    prismaMocks.product.count.mockResolvedValueOnce(0)

    const snapshot = await collectBusinessData()

    expect(snapshot.company).toEqual({
      name: 'Cilmax',
      storeName: 'Cilmax',
      currency: 'COP',
      lowStockThreshold: 5,
      webPendingExpiryHours: 24,
    })

    expect(snapshot.salesToday).toEqual({ count: 0, total: 0 })
    expect(snapshot.salesThisMonth).toEqual({ count: 0, total: 0 })
    expect(snapshot.pendingCredit).toEqual({ total: 0, salesCount: 0 })

    expect(snapshot.inventory).toEqual({
      products: 0,
      units: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      lowStockTop: [],
    })

    expect(snapshot.webOrders).toEqual({
      PENDING: 0,
      CONFIRMED: 0,
      CONVERTED: 0,
      CANCELLED: 0,
    })

    expect(snapshot.clients).toEqual({ total: 0, newThisMonth: 0 })
    expect(snapshot.contactUnread).toBe(0)
    expect(snapshot.webVisibleProducts).toBe(0)

    const text = businessSnapshotToText(snapshot)
    expect(text).toContain('(ninguno)')
    expect(text).not.toContain('NaN')
    expect(text).not.toContain('undefined')

    const prompt = buildSystemPrompt(snapshot)
    expect(prompt).toContain('Cilmax')
    expect(prompt).not.toContain('NaN')
    expect(prompt).not.toContain('undefined')
  })

  it('handles null values within raw SQL result objects safely', async () => {
    prismaMocks.systemSettings.findFirst.mockResolvedValueOnce(null)
    prismaMocks.storeSetting.findUnique.mockResolvedValueOnce(null)
    prismaMocks.storeSetting.findUnique.mockResolvedValueOnce(null)

    prismaMocks.sale.aggregate.mockResolvedValueOnce({ _count: { id: 0 }, _sum: { total: null } })
    prismaMocks.sale.aggregate.mockResolvedValueOnce({ _count: { id: 0 }, _sum: { total: null } })
    // creditSummaryRaw returning row with nulls
    prismaMocks.$queryRaw.mockResolvedValueOnce([{ total: null, salesCount: null }])
    prismaMocks.product.count.mockResolvedValueOnce(null)
    prismaMocks.product.aggregate.mockResolvedValueOnce({ _sum: { stock: null } })
    // lowStockCountRaw returning row with null
    prismaMocks.$queryRaw.mockResolvedValueOnce([{ count: null }])
    prismaMocks.product.count.mockResolvedValueOnce(null)
    // lowStockTopRaw returning item with null category and numeric fields
    prismaMocks.$queryRaw.mockResolvedValueOnce([
      { name: 'Producto Genérico', stock: 0, threshold: 5, category: null },
    ])
    prismaMocks.webOrder.groupBy.mockResolvedValueOnce(null)
    prismaMocks.client.count.mockResolvedValueOnce(null)
    prismaMocks.client.count.mockResolvedValueOnce(null)
    prismaMocks.contactMessage.count.mockResolvedValueOnce(null)
    prismaMocks.product.count.mockResolvedValueOnce(null)

    const snapshot = await collectBusinessData()

    expect(snapshot.pendingCredit.total).toBe(0)
    expect(snapshot.pendingCredit.salesCount).toBe(0)
    expect(snapshot.inventory.products).toBe(0)
    expect(snapshot.inventory.units).toBe(0)
    expect(snapshot.inventory.lowStockCount).toBe(0)
    expect(snapshot.inventory.outOfStockCount).toBe(0)
    expect(snapshot.inventory.lowStockTop).toEqual([
      { name: 'Producto Genérico', stock: 0, threshold: 5, category: null },
    ])
    expect(snapshot.webOrders).toEqual({
      PENDING: 0,
      CONFIRMED: 0,
      CONVERTED: 0,
      CANCELLED: 0,
    })
    expect(snapshot.clients).toEqual({ total: 0, newThisMonth: 0 })
    expect(snapshot.contactUnread).toBe(0)
    expect(snapshot.webVisibleProducts).toBe(0)
  })
})
