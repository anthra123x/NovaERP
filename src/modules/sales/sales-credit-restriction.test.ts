import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMocks = vi.hoisted(() => ({
  $transaction: vi.fn(),
  $queryRaw: vi.fn(),
  product: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  },
  systemSettings: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  sale: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  invoice: {
    create: vi.fn(),
  },
  stockMovement: {
    create: vi.fn(),
  },
  payment: {
    create: vi.fn(),
  },
  creditInstallment: {
    create: vi.fn(),
  },
  transaction: {
    create: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: prismaMocks.$transaction,
    systemSettings: prismaMocks.systemSettings,
  },
}))

vi.mock('@/modules/auth/auth.actions', () => ({
  requireAuth: vi.fn(async () => ({
    id: 'user-1',
    email: 'mesero@restaurante.com',
    name: 'Mesero Pedro',
    role: 'ADMIN',
  })),
}))

vi.mock('@/lib/revalidation', () => ({
  revalidateSalePaths: vi.fn(),
}))

vi.mock('./sales.helpers', () => ({
  resolveSaleUnitPrice: vi.fn((unitPrice?: number, product?: { salePrice: number; costPrice?: number }) => ({
    ok: true,
    unitPrice: unitPrice ?? product?.salePrice ?? 25000,
  })),
  resolveSalesIncomeCategory: vi.fn(async () => 'income-category-gastronomy'),
}))

const settingsMocks = vi.hoisted(() => ({
  getBusinessWorkflowConfig: vi.fn(),
}))

vi.mock('@/modules/settings/settings.service', () => ({
  getBusinessWorkflowConfig: settingsMocks.getBusinessWorkflowConfig,
}))

import { createSale } from './sales.actions'

const tx = () => ({
  $queryRaw: prismaMocks.$queryRaw,
  product: prismaMocks.product,
  systemSettings: prismaMocks.systemSettings,
  sale: prismaMocks.sale,
  invoice: prismaMocks.invoice,
  stockMovement: prismaMocks.stockMovement,
  payment: prismaMocks.payment,
  creditInstallment: prismaMocks.creditInstallment,
  transaction: prismaMocks.transaction,
})

describe('createSale credit restrictions by business sector and workflow config', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    prismaMocks.$transaction.mockImplementation(async (cb: (t: ReturnType<typeof tx>) => unknown) => cb(tx()))
    prismaMocks.$queryRaw.mockResolvedValue([{ num: 101, invoicePrefix: 'REST-' }])

    prismaMocks.systemSettings.findFirst.mockResolvedValue({
      id: 'sys-1',
      invoicePrefix: 'REST-',
      nextInvoiceNumber: 101,
      companyName: 'Restaurante El Sabor Gourmet',
      companyNit: '901.555.444-3',
      companyAddress: 'Carrera 7 #45-12',
      companyCity: 'Bogotá',
      companyPhone: '310 999 8877',
      companyEmail: 'contacto@elsabor.co',
      currency: 'COP',
      invoiceFooter: null,
    })

    prismaMocks.product.findMany.mockResolvedValue([
      {
        id: 'prod-plate-1',
        name: 'Bandeja Paisa Tradicional',
        salePrice: 38000,
        costPrice: 18000,
        stock: 50,
        deletedAt: null,
      },
      {
        id: 'prod-drink-1',
        name: 'Limonada de Coco',
        salePrice: 12000,
        costPrice: 4000,
        stock: 100,
        deletedAt: null,
      },
    ])

    prismaMocks.product.updateMany.mockResolvedValue({ count: 1 })
    prismaMocks.stockMovement.create.mockResolvedValue({ id: 'mov-1' })
    prismaMocks.invoice.create.mockResolvedValue({ id: 'inv-1' })
    prismaMocks.transaction.create.mockResolvedValue({ id: 'txn-1' })

    prismaMocks.sale.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'sale-999',
      ...data,
      items: [
        {
          id: 'item-1',
          productId: 'prod-plate-1',
          quantity: 2,
          unitPrice: 38000,
          total: 76000,
        },
      ],
    }))
  })

  it('rejects credit sale in restaurant_gastronomy even if allowCreditSales is set to true', async () => {
    settingsMocks.getBusinessWorkflowConfig.mockResolvedValue({
      sector: 'restaurant_gastronomy',
      allowCreditSales: true, // Bypass attempt
      allowNegativeStock: false,
      requireClientOnSale: false,
    })

    const result = await createSale({
      paymentMethod: 'CREDITO',
      clientId: 'cli-1',
      items: [{ productId: 'prod-plate-1', quantity: 2, unitPrice: 38000 }],
      dueDate: '2026-12-01',
      installments: [{ amount: 76000, dueDate: '2026-12-01' }],
    })

    expect(result.error).toBe('Las ventas a crédito están deshabilitadas para este sector o configuración comercial')
    expect(prismaMocks.sale.create).not.toHaveBeenCalled()
  })

  it('rejects credit sale in any sector when allowCreditSales is false', async () => {
    settingsMocks.getBusinessWorkflowConfig.mockResolvedValue({
      sector: 'retail_general',
      allowCreditSales: false,
      allowNegativeStock: false,
      requireClientOnSale: false,
    })

    const result = await createSale({
      paymentMethod: 'CREDITO',
      clientId: 'cli-1',
      items: [{ productId: 'prod-plate-1', quantity: 1, unitPrice: 38000 }],
      dueDate: '2026-12-01',
      installments: [{ amount: 38000, dueDate: '2026-12-01' }],
    })

    expect(result.error).toBe('Las ventas a crédito están deshabilitadas para este sector o configuración comercial')
    expect(prismaMocks.sale.create).not.toHaveBeenCalled()
  })

  it('allows cash payment (CASH) in restaurant_gastronomy mode', async () => {
    settingsMocks.getBusinessWorkflowConfig.mockResolvedValue({
      sector: 'restaurant_gastronomy',
      allowCreditSales: false,
      allowNegativeStock: false,
      requireClientOnSale: false,
    })

    const result = await createSale({
      paymentMethod: 'CASH',
      items: [{ productId: 'prod-plate-1', quantity: 2, unitPrice: 38000 }],
    })

    expect(result.error).toBeUndefined()
    expect(result.success).toBe('Venta registrada exitosamente')
    expect(result.sale).toBeDefined()
    expect(result.sale?.paymentMethod).toBe('CASH')
    expect(result.sale?.total).toBe(76000)
    expect(prismaMocks.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'INCOME',
          amount: 76000,
        }),
      }),
    )
  })

  it('allows card payment (CARD) in restaurant_gastronomy mode', async () => {
    settingsMocks.getBusinessWorkflowConfig.mockResolvedValue({
      sector: 'restaurant_gastronomy',
      allowCreditSales: false,
      allowNegativeStock: false,
      requireClientOnSale: false,
    })

    const result = await createSale({
      paymentMethod: 'CARD',
      items: [{ productId: 'prod-drink-1', quantity: 3, unitPrice: 12000 }],
    })

    expect(result.error).toBeUndefined()
    expect(result.success).toBe('Venta registrada exitosamente')
    expect(result.sale?.paymentMethod).toBe('CARD')
    expect(result.sale?.total).toBe(36000)
  })

  it('allows electronic transfer (TRANSFER) in restaurant_gastronomy mode', async () => {
    settingsMocks.getBusinessWorkflowConfig.mockResolvedValue({
      sector: 'restaurant_gastronomy',
      allowCreditSales: false,
      allowNegativeStock: false,
      requireClientOnSale: false,
    })

    const result = await createSale({
      paymentMethod: 'TRANSFER',
      items: [
        { productId: 'prod-plate-1', quantity: 1, unitPrice: 38000 },
        { productId: 'prod-drink-1', quantity: 1, unitPrice: 12000 },
      ],
    })

    expect(result.error).toBeUndefined()
    expect(result.success).toBe('Venta registrada exitosamente')
    expect(result.sale?.paymentMethod).toBe('TRANSFER')
    expect(result.sale?.total).toBe(50000)
  })

  it('permits credit sale in allowed sectors (e.g. retail_general) when allowCreditSales is true', async () => {
    settingsMocks.getBusinessWorkflowConfig.mockResolvedValue({
      sector: 'retail_general',
      allowCreditSales: true,
      allowNegativeStock: false,
      requireClientOnSale: false,
    })

    prismaMocks.creditInstallment.create.mockResolvedValue({ id: 'inst-1' })

    const result = await createSale({
      paymentMethod: 'CREDITO',
      clientId: 'cli-vip',
      items: [{ productId: 'prod-plate-1', quantity: 2, unitPrice: 38000 }],
      dueDate: '2026-12-15',
      installments: [{ amount: 76000, dueDate: '2026-12-15' }],
    })

    expect(result.error).toBeUndefined()
    expect(result.success).toBe('Venta registrada exitosamente')
    expect(result.sale?.paymentMethod).toBe('CREDITO')
    expect(prismaMocks.creditInstallment.create).toHaveBeenCalled()
  })

  it('respects stockReserved: true when converting web orders without double-decrementing stock', async () => {
    settingsMocks.getBusinessWorkflowConfig.mockResolvedValue({
      sector: 'restaurant_gastronomy',
      allowCreditSales: false,
      allowNegativeStock: false,
      requireClientOnSale: false,
    })

    const result = await createSale({
      paymentMethod: 'CASH',
      items: [{ productId: 'prod-plate-1', quantity: 1, unitPrice: 38000 }],
      stockReserved: true,
    })

    expect(result.error).toBeUndefined()
    expect(prismaMocks.product.updateMany).not.toHaveBeenCalled()
    expect(prismaMocks.stockMovement.create).not.toHaveBeenCalled()
  })
})
