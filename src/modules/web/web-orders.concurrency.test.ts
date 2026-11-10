import { beforeEach, describe, expect, it, vi } from 'vitest'

interface WebOrderRow {
  id: string
  reference: string
  customerName: string
  customerPhone: string
  customerEmail?: string | null
  status: 'PENDING' | 'CONFIRMED' | 'CONVERTED' | 'CANCELLED'
  convertedSaleId?: string | null
  items: Array<{
    id: string
    productId: string | null
    productName: string
    quantity: number
    unitPrice: number
    total: number
  }>
}

const mocks = vi.hoisted(() => ({
  createSale: vi.fn(),
  $transaction: vi.fn(),
  requireAuth: vi.fn(async () => ({ id: 'admin-1', email: 'admin@cilmax.com' })),
  revalidateWebOrderPaths: vi.fn(),
  revalidateSalePaths: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: mocks.$transaction,
  },
}))

vi.mock('@/modules/sales/sales.actions', () => ({
  createSale: mocks.createSale,
}))

vi.mock('@/modules/auth/auth.actions', () => ({
  requireAuth: mocks.requireAuth,
}))

vi.mock('@/lib/revalidation', () => ({
  revalidateWebOrderPaths: mocks.revalidateWebOrderPaths,
  revalidateSalePaths: mocks.revalidateSalePaths,
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { convertWebOrderToSale } from './web-orders.actions'

describe('convertWebOrderToSale concurrency & adversarial harness', () => {
  let dbOrders: Map<string, WebOrderRow>
  let orderRowLocks: Map<string, Promise<void>>
  let orderLockResolvers: Map<string, () => void>

  // PostgreSQL transaction mock with row lock emulation
  function createTxMock() {
    const heldLocks: string[] = []

    const acquireLock = async (orderId: string) => {
      while (orderRowLocks.has(orderId)) {
        await orderRowLocks.get(orderId)
      }
      let resolver!: () => void
      const lockPromise = new Promise<void>((resolve) => {
        resolver = resolve
      })
      orderRowLocks.set(orderId, lockPromise)
      orderLockResolvers.set(orderId, resolver)
      heldLocks.push(orderId)
    }

    const releaseLocks = () => {
      for (const orderId of heldLocks) {
        const resolver = orderLockResolvers.get(orderId)
        if (resolver) {
          resolver()
          orderLockResolvers.delete(orderId)
        }
        orderRowLocks.delete(orderId)
      }
    }

    const tx = {
      $queryRaw: vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
        const query = strings.join('?')
        if (query.includes('FROM web_orders') && query.includes('FOR UPDATE')) {
          const orderId = values[0] as string
          await acquireLock(orderId)
          // In PostgreSQL Read Committed, after acquiring the lock from a committed tx,
          // it re-reads the fresh committed row state
          const row = dbOrders.get(orderId)
          return row ? [{ id: row.id, status: row.status }] : []
        }
        return []
      }),
      webOrder: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
          const row = dbOrders.get(where.id)
          return row ? { ...row } : null
        }),
        update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<WebOrderRow> }) => {
          const row = dbOrders.get(where.id)
          if (!row) throw new Error('Order not found')
          Object.assign(row, data)
          return { ...row }
        }),
      },
      client: {
        findFirst: vi.fn(async () => null),
        create: vi.fn(async ({ data }: { data: { name: string; phone: string } }) => ({
          id: 'client-new',
          ...data,
        })),
      },
    }

    return { tx, releaseLocks }
  }

  beforeEach(() => {
    vi.clearAllMocks()

    dbOrders = new Map([
      [
        'order-confirmed-1',
        {
          id: 'order-confirmed-1',
          reference: 'ORD-1001',
          customerName: 'Carlos Gómez',
          customerPhone: '3001234567',
          status: 'CONFIRMED',
          items: [
            {
              id: 'item-1',
              productId: 'prod-1',
              productName: 'Olla a Presión',
              quantity: 2,
              unitPrice: 150000,
              total: 300000,
            },
          ],
        },
      ],
      [
        'order-pending-1',
        {
          id: 'order-pending-1',
          reference: 'ORD-1002',
          customerName: 'Laura Díaz',
          customerPhone: '3009876543',
          status: 'PENDING',
          items: [
            {
              id: 'item-2',
              productId: 'prod-2',
              productName: 'Sartén Antiadherente',
              quantity: 1,
              unitPrice: 80000,
              total: 80000,
            },
          ],
        },
      ],
      [
        'order-converted-1',
        {
          id: 'order-converted-1',
          reference: 'ORD-1003',
          customerName: 'Mario Ruiz',
          customerPhone: '3005551234',
          status: 'CONVERTED',
          convertedSaleId: 'sale-999',
          items: [],
        },
      ],
      [
        'order-cancelled-1',
        {
          id: 'order-cancelled-1',
          reference: 'ORD-1004',
          customerName: 'Elena Cruz',
          customerPhone: '3004449876',
          status: 'CANCELLED',
          items: [],
        },
      ],
      [
        'order-missing-prod-1',
        {
          id: 'order-missing-prod-1',
          reference: 'ORD-1005',
          customerName: 'Pedro Parra',
          customerPhone: '3003332211',
          status: 'CONFIRMED',
          items: [
            {
              id: 'item-ghost',
              productId: null,
              productName: 'Producto Eliminado',
              quantity: 1,
              unitPrice: 50000,
              total: 50000,
            },
          ],
        },
      ],
    ])

    orderRowLocks = new Map()
    orderLockResolvers = new Map()

    mocks.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      const { tx, releaseLocks } = createTxMock()
      try {
        return await cb(tx)
      } finally {
        releaseLocks()
      }
    })
  })

  it('empirically prevents double conversion under simultaneous concurrent clicks', async () => {
    let saleSeq = 1
    mocks.createSale.mockImplementation(async () => {
      // Simulate POS createSale network / DB latency
      await new Promise((r) => setTimeout(r, 20))
      return {
        success: 'ok',
        sale: { id: `sale-${saleSeq++}`, invoiceNumber: `CIL-${saleSeq}` },
      }
    })

    // Concurrently trigger two conversions on 'order-confirmed-1'
    const [resultA, resultB] = await Promise.all([
      convertWebOrderToSale('order-confirmed-1'),
      convertWebOrderToSale('order-confirmed-1'),
    ])

    const successes = [resultA, resultB].filter((r) => 'success' in r)
    const errors = [resultA, resultB].filter((r) => 'error' in r)

    expect(successes).toHaveLength(1)
    expect(errors).toHaveLength(1)

    // Verify createSale was invoked EXACTLY ONCE
    expect(mocks.createSale).toHaveBeenCalledTimes(1)

    // Verify the error message for the serialized second attempt
    const errorResult = errors[0] as { error: string }
    expect(errorResult.error).toBe('El pedido ya no está pendiente')

    // Verify DB order is CONVERTED with valid convertedSaleId
    const finalOrder = dbOrders.get('order-confirmed-1')!
    expect(finalOrder.status).toBe('CONVERTED')
    expect(finalOrder.convertedSaleId).toBe('sale-1')
  })

  it('rejects conversion of CANCELLED web orders', async () => {
    const result = await convertWebOrderToSale('order-cancelled-1')

    expect(result).toEqual({ error: 'El pedido ya no está pendiente' })
    expect(mocks.createSale).not.toHaveBeenCalled()
  })

  it('rejects conversion of already CONVERTED web orders', async () => {
    const result = await convertWebOrderToSale('order-converted-1')

    expect(result).toEqual({ error: 'El pedido ya no está pendiente' })
    expect(mocks.createSale).not.toHaveBeenCalled()
  })

  it('rejects conversion of non-existent web order', async () => {
    const result = await convertWebOrderToSale('non-existent-order')

    expect(result).toEqual({ error: 'Pedido no encontrado' })
    expect(mocks.createSale).not.toHaveBeenCalled()
  })

  it('sets stockReserved: true when order status is CONFIRMED', async () => {
    mocks.createSale.mockResolvedValue({
      success: 'ok',
      sale: { id: 'sale-conf', invoiceNumber: 'CIL-CONF' },
    })

    await convertWebOrderToSale('order-confirmed-1')

    expect(mocks.createSale).toHaveBeenCalledWith(
      expect.objectContaining({
        stockReserved: true,
      }),
    )
  })

  it('sets stockReserved: false when order status is PENDING (stock not yet reserved)', async () => {
    mocks.createSale.mockResolvedValue({
      success: 'ok',
      sale: { id: 'sale-pend', invoiceNumber: 'CIL-PEND' },
    })

    await convertWebOrderToSale('order-pending-1')

    expect(mocks.createSale).toHaveBeenCalledWith(
      expect.objectContaining({
        stockReserved: false,
      }),
    )
  })

  it('aborts and does not change order status if createSale fails', async () => {
    mocks.createSale.mockResolvedValue({
      error: 'Stock insuficiente para "Olla a Presión"',
    })

    const result = await convertWebOrderToSale('order-confirmed-1')

    expect(result).toEqual({ error: 'Stock insuficiente para "Olla a Presión"' })
    const order = dbOrders.get('order-confirmed-1')!
    expect(order.status).toBe('CONFIRMED')
    expect(order.convertedSaleId).toBeUndefined()
  })

  it('gracefully fails when order item has missing productId reference', async () => {
    const result = await convertWebOrderToSale('order-missing-prod-1')

    expect(result.error).toContain('ya no tiene referencia de producto en inventario')
    expect(mocks.createSale).not.toHaveBeenCalled()
  })
})
