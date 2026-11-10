import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMocks = vi.hoisted(() => ({
  $transaction: vi.fn(),
  $queryRaw: vi.fn(),
  sale: { findUnique: vi.fn() },
  payment: { aggregate: vi.fn(), create: vi.fn() },
  transaction: { create: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: prismaMocks.$transaction,
  },
}))

vi.mock('@/modules/auth/auth.actions', () => ({
  requireAuth: vi.fn(async () => ({ id: 'user-1', email: 'cajero@cilmax.com', name: 'Cajero' })),
}))

vi.mock('@/lib/revalidation', () => ({
  revalidateSalePaths: vi.fn(),
}))

vi.mock('./sales.helpers', () => ({
  resolveSalesIncomeCategory: vi.fn(async () => 'income-cat-1'),
}))

import { registerPayment } from './payments.actions'

const tx = () => ({
  $queryRaw: prismaMocks.$queryRaw,
  sale: prismaMocks.sale,
  payment: prismaMocks.payment,
  transaction: prismaMocks.transaction,
})

describe('registerPayment concurrency and credit balance verification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMocks.$transaction.mockImplementation(async (cb: (t: ReturnType<typeof tx>) => unknown) => cb(tx()))
    prismaMocks.$queryRaw.mockResolvedValue([])
    prismaMocks.sale.findUnique.mockResolvedValue({
      id: 'sale-1',
      invoiceNumber: 'CIL-100',
      total: 500000,
      paymentMethod: 'CREDITO',
      status: 'COMPLETED',
    })
    prismaMocks.payment.aggregate.mockResolvedValue({
      _sum: { amount: 200000 },
    })
    prismaMocks.payment.create.mockResolvedValue({
      id: 'pay-1',
      saleId: 'sale-1',
      amount: 100000,
      paymentMethod: 'CASH',
    })
    prismaMocks.transaction.create.mockResolvedValue({ id: 'txn-1' })
  })

  it('locks the Sale row with FOR UPDATE before checking balance and creating payment', async () => {
    const result = await registerPayment({
      saleId: 'sale-1',
      amount: 100000,
      paymentMethod: 'CASH',
    })

    expect(result.success).toBe('Abono registrado exitosamente')
    expect(prismaMocks.$queryRaw).toHaveBeenCalledTimes(1)
    expect(prismaMocks.sale.findUnique).toHaveBeenCalledWith({
      where: { id: 'sale-1' },
      select: expect.objectContaining({ id: true, total: true, paymentMethod: true }),
    })
    expect(prismaMocks.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          saleId: 'sale-1',
          amount: 100000,
          paymentMethod: 'CASH',
        }),
      }),
    )
  })

  it('rejects an overpayment exceeding the remaining balance', async () => {
    // Total 500000, paid 200000 -> saldo remaining is 300000. Attempt 350000.
    const result = await registerPayment({
      saleId: 'sale-1',
      amount: 350000,
      paymentMethod: 'CASH',
    })

    expect(result.error).toContain('El abono supera el saldo pendiente (300000.00)')
    expect(prismaMocks.payment.create).not.toHaveBeenCalled()
    expect(prismaMocks.transaction.create).not.toHaveBeenCalled()
  })

  it('rejects payments on non-credit sales', async () => {
    prismaMocks.sale.findUnique.mockResolvedValue({
      id: 'sale-1',
      invoiceNumber: 'CIL-100',
      total: 500000,
      paymentMethod: 'CASH',
      status: 'COMPLETED',
    })

    const result = await registerPayment({
      saleId: 'sale-1',
      amount: 50000,
      paymentMethod: 'CASH',
    })

    expect(result.error).toContain('La venta no admite abonos')
    expect(prismaMocks.payment.create).not.toHaveBeenCalled()
  })

  it('rejects payments on non-completed sales', async () => {
    prismaMocks.sale.findUnique.mockResolvedValue({
      id: 'sale-1',
      invoiceNumber: 'CIL-100',
      total: 500000,
      paymentMethod: 'CREDITO',
      status: 'CANCELLED',
    })

    const result = await registerPayment({
      saleId: 'sale-1',
      amount: 50000,
      paymentMethod: 'CASH',
    })

    expect(result.error).toContain('La venta no admite abonos')
    expect(prismaMocks.payment.create).not.toHaveBeenCalled()
  })
})
