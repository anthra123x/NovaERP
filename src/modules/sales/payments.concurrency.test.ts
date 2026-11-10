import { beforeEach, describe, expect, it, vi } from 'vitest'

// Shared database state simulating PostgreSQL tables and row locking
interface SaleRow {
  id: string
  invoiceNumber: string
  total: number
  paymentMethod: string
  status: string
}

interface PaymentRow {
  id: string
  saleId: string
  amount: number
  paymentMethod: string
  notes?: string | null
  userId: string
}

describe('payments concurrency & edge-case adversarial harness', () => {
  let dbSales: Map<string, SaleRow>
  let dbPayments: PaymentRow[]
  let saleRowLocks: Map<string, Promise<void>>
  let saleLockResolvers: Map<string, () => void>

  beforeEach(() => {
    dbSales = new Map([
      [
        'sale-credit-1',
        {
          id: 'sale-credit-1',
          invoiceNumber: 'CIL-100',
          total: 500000,
          paymentMethod: 'CREDITO',
          status: 'COMPLETED',
        },
      ],
      [
        'sale-cash-1',
        {
          id: 'sale-cash-1',
          invoiceNumber: 'CIL-200',
          total: 300000,
          paymentMethod: 'CASH',
          status: 'COMPLETED',
        },
      ],
      [
        'sale-cancelled-1',
        {
          id: 'sale-cancelled-1',
          invoiceNumber: 'CIL-300',
          total: 400000,
          paymentMethod: 'CREDITO',
          status: 'CANCELLED',
        },
      ],
    ])

    dbPayments = [
      {
        id: 'init-pay-1',
        saleId: 'sale-credit-1',
        amount: 200000,
        paymentMethod: 'CASH',
        userId: 'user-1',
      },
    ]

    saleRowLocks = new Map()
    saleLockResolvers = new Map()
  })

  // Factory to create a realistic PostgreSQL transaction mock with row-level locks
  function createTxMock() {
    const lockedSaleIds: string[] = []

    const acquireSaleLock = async (saleId: string) => {
      while (saleRowLocks.has(saleId)) {
        await saleRowLocks.get(saleId)
      }
      let resolver!: () => void
      const lockPromise = new Promise<void>((resolve) => {
        resolver = resolve
      })
      saleRowLocks.set(saleId, lockPromise)
      saleLockResolvers.set(saleId, resolver)
      lockedSaleIds.push(saleId)
    }

    const releaseLocks = () => {
      for (const saleId of lockedSaleIds) {
        const resolver = saleLockResolvers.get(saleId)
        if (resolver) {
          resolver()
          saleLockResolvers.delete(saleId)
        }
        saleRowLocks.delete(saleId)
      }
    }

    const tx = {
      $queryRaw: vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
        const query = strings.join('?')
        if (query.includes('FROM sales') && query.includes('FOR UPDATE')) {
          const saleId = values[0] as string
          await acquireSaleLock(saleId)
          const sale = dbSales.get(saleId)
          return sale ? [{ id: sale.id }] : []
        }
        return []
      }),
      sale: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
          const row = dbSales.get(where.id)
          return row ? { ...row } : null
        }),
      },
      payment: {
        aggregate: vi.fn(async ({ where }: { where: { saleId: string } }) => {
          const totalPaid = dbPayments
            .filter((p) => p.saleId === where.saleId)
            .reduce((sum, p) => sum + p.amount, 0)
          return { _sum: { amount: totalPaid || null } }
        }),
        create: vi.fn(async ({ data }: { data: Omit<PaymentRow, 'id'> }) => {
          const newRow: PaymentRow = { id: `pay-${Date.now()}-${Math.random()}`, ...data }
          dbPayments.push(newRow)
          return newRow
        }),
      },
      transaction: {
        create: vi.fn(async () => ({ id: `txn-${Date.now()}` })),
      },
    }

    return { tx, releaseLocks }
  }

  it('empirically prevents concurrent overpayments under simultaneous execution', async () => {
    // Total: 500,000. Already paid: 200,000. Remaining balance: 300,000.
    // Worker A tries to pay 200,000.
    // Worker B tries to pay 200,000.
    // If not serialized, both would see 300,000 remaining and both would succeed (paying 400,000 -> total paid 600,000 > 500,000).
    // With row lock, one must succeed and the other must be rejected for exceeding 100,000 remaining balance.

    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        $transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => {
          const { tx, releaseLocks } = createTxMock()
          try {
            return await cb(tx)
          } finally {
            releaseLocks()
          }
        }),
      },
    }))

    vi.doMock('@/modules/auth/auth.actions', () => ({
      requireAuth: vi.fn(async () => ({ id: 'user-1', email: 'cajero@cilmax.com' })),
    }))

    vi.doMock('@/lib/revalidation', () => ({
      revalidateSalePaths: vi.fn(),
    }))

    vi.doMock('./sales.helpers', () => ({
      resolveSalesIncomeCategory: vi.fn(async () => 'income-cat-1'),
    }))

    const { registerPayment } = await import('./payments.actions')

    // Launch both payments concurrently
    const [resultA, resultB] = await Promise.all([
      registerPayment({ saleId: 'sale-credit-1', amount: 200000, paymentMethod: 'CASH' }),
      registerPayment({ saleId: 'sale-credit-1', amount: 200000, paymentMethod: 'CASH' }),
    ])

    const successCount = [resultA, resultB].filter((r) => 'success' in r).length
    const errorCount = [resultA, resultB].filter((r) => 'error' in r).length

    expect(successCount).toBe(1)
    expect(errorCount).toBe(1)

    const rejected = ('error' in resultA ? resultA : resultB) as { error: string }
    expect(rejected.error).toContain('El abono supera el saldo pendiente (100000.00)')

    // Check total paid in database: must be exactly 400,000, never 600,000
    const totalPaidInDb = dbPayments
      .filter((p) => p.saleId === 'sale-credit-1')
      .reduce((sum, p) => sum + p.amount, 0)
    expect(totalPaidInDb).toBe(400000)
  })

  it('rejects zero amount abono via Zod validation', async () => {
    const { registerPayment } = await import('./payments.actions')
    const result = await registerPayment({
      saleId: 'sale-credit-1',
      amount: 0,
      paymentMethod: 'CASH',
    })

    expect(result.error).toContain('El monto debe ser mayor a 0')
  })

  it('rejects negative amount abono via Zod validation', async () => {
    const { registerPayment } = await import('./payments.actions')
    const result = await registerPayment({
      saleId: 'sale-credit-1',
      amount: -50000,
      paymentMethod: 'CASH',
    })

    expect(result.error).toContain('El monto debe ser mayor a 0')
  })

  it('rejects abonos on fully paid credit sales (zero balance remaining)', async () => {
    // Total is 500,000. Add payment for 300,000 so remaining is 0.
    dbPayments.push({
      id: 'pay-full',
      saleId: 'sale-credit-1',
      amount: 300000,
      paymentMethod: 'CASH',
      userId: 'user-1',
    })

    const { registerPayment } = await import('./payments.actions')
    const result = await registerPayment({
      saleId: 'sale-credit-1',
      amount: 10000,
      paymentMethod: 'CASH',
    })

    expect(result.error).toContain('El abono supera el saldo pendiente (0.00)')
  })

  it('rejects abonos on non-credit sales (CASH)', async () => {
    const { registerPayment } = await import('./payments.actions')
    const result = await registerPayment({
      saleId: 'sale-cash-1',
      amount: 50000,
      paymentMethod: 'CASH',
    })

    expect(result.error).toContain('La venta no admite abonos')
  })

  it('rejects abonos on non-completed sales (CANCELLED)', async () => {
    const { registerPayment } = await import('./payments.actions')
    const result = await registerPayment({
      saleId: 'sale-cancelled-1',
      amount: 50000,
      paymentMethod: 'CASH',
    })

    expect(result.error).toContain('La venta no admite abonos')
  })

  it('rejects abonos on non-existent sales', async () => {
    const { registerPayment } = await import('./payments.actions')
    const result = await registerPayment({
      saleId: 'non-existent-sale',
      amount: 50000,
      paymentMethod: 'CASH',
    })

    expect(result.error).toContain('Venta')
  })

  it('allows exact payment of remaining balance', async () => {
    // Remaining is 500,000 - 200,000 = 300,000
    const { registerPayment } = await import('./payments.actions')
    const result = await registerPayment({
      saleId: 'sale-credit-1',
      amount: 300000,
      paymentMethod: 'CASH',
    })

    expect(result.success).toBe('Abono registrado exitosamente')
    const totalPaidInDb = dbPayments
      .filter((p) => p.saleId === 'sale-credit-1')
      .reduce((sum, p) => sum + p.amount, 0)
    expect(totalPaidInDb).toBe(500000)
  })
})
