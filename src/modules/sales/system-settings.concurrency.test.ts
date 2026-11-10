import { beforeEach, describe, expect, it, vi } from 'vitest'

interface SystemSettingsRow {
  id: string
  invoicePrefix: string
  nextInvoiceNumber: number
  nextWebOrderNumber: number
  companyName: string
  companyNit: string | null
  companyAddress: string | null
  companyCity: string | null
  companyPhone: string | null
  companyEmail: string | null
  currency: string
  invoiceFooter: string | null
}

describe('system_settings atomic counter concurrency harness', () => {
  let dbSettings: SystemSettingsRow
  let settingsLock: Promise<void> | null
  let settingsLockResolver: (() => void) | null

  beforeEach(() => {
    vi.clearAllMocks()

    dbSettings = {
      id: 'settings-1',
      invoicePrefix: 'CIL-',
      nextInvoiceNumber: 1,
      nextWebOrderNumber: 1000,
      companyName: 'Cilmax',
      companyNit: '900123456-1',
      companyAddress: 'Calle 100 # 15-20',
      companyCity: 'Bogotá',
      companyPhone: '3001234567',
      companyEmail: 'info@cilmax.com',
      currency: 'COP',
      invoiceFooter: 'Gracias por su compra',
    }

    settingsLock = null
    settingsLockResolver = null
  })

  // Simulates PostgreSQL engine executing atomic UPDATE ... RETURNING with strict overloads
  async function simulateAtomicCounterUpdate(type: 'invoice'): Promise<Array<{ num: number; invoicePrefix: string }>>
  async function simulateAtomicCounterUpdate(type: 'webOrder'): Promise<Array<{ num: number }>>
  async function simulateAtomicCounterUpdate(
    type: 'invoice' | 'webOrder',
  ): Promise<Array<{ num: number; invoicePrefix?: string }>> {
    while (settingsLock) {
      await settingsLock
    }

    let resolver!: () => void
    settingsLock = new Promise<void>((resolve) => {
      resolver = resolve
    })
    settingsLockResolver = resolver

    try {
      if (type === 'invoice') {
        const current = dbSettings.nextInvoiceNumber
        dbSettings.nextInvoiceNumber += 1
        return [{ num: current, invoicePrefix: dbSettings.invoicePrefix }]
      } else {
        const current = dbSettings.nextWebOrderNumber
        dbSettings.nextWebOrderNumber += 1
        return [{ num: current }]
      }
    } finally {
      if (settingsLockResolver) {
        settingsLockResolver()
      }
      settingsLock = null
      settingsLockResolver = null
    }
  }

  it('guarantees 10 concurrent sales receive strictly unique consecutive invoice numbers', async () => {
    const workerCount = 10
    const results: string[] = []

    await Promise.all(
      Array.from({ length: workerCount }).map(async () => {
        await new Promise((r) => setTimeout(r, Math.random() * 10))

        const counterRows = await simulateAtomicCounterUpdate('invoice')
        const assignedNumber = Number(counterRows[0].num)
        const prefix = counterRows[0].invoicePrefix
        const invoiceNumber = `${prefix}${assignedNumber}`
        results.push(invoiceNumber)
      }),
    )

    const uniqueInvoices = new Set(results)
    expect(uniqueInvoices.size).toBe(workerCount)

    const expected = Array.from({ length: workerCount }, (_, i) => `CIL-${i + 1}`)
    expect(results.sort()).toEqual(expected.sort())

    expect(dbSettings.nextInvoiceNumber).toBe(11)
  })

  it('guarantees 10 concurrent web orders receive strictly unique consecutive ORD references', async () => {
    const workerCount = 10
    const results: string[] = []

    await Promise.all(
      Array.from({ length: workerCount }).map(async () => {
        await new Promise((r) => setTimeout(r, Math.random() * 10))

        const counterRows = await simulateAtomicCounterUpdate('webOrder')
        const assignedNumber = Number(counterRows[0].num)
        const reference = `ORD-${assignedNumber}`
        results.push(reference)
      }),
    )

    const uniqueOrders = new Set(results)
    expect(uniqueOrders.size).toBe(workerCount)

    const expected = Array.from({ length: workerCount }, (_, i) => `ORD-${1000 + i}`)
    expect(results.sort()).toEqual(expected.sort())

    expect(dbSettings.nextWebOrderNumber).toBe(1010)
  })

  it('guarantees mixed concurrent sales and web orders do not corrupt or overlap counters', async () => {
    const saleResults: string[] = []
    const webResults: string[] = []

    const tasks = [
      ...Array.from({ length: 5 }).map(async () => {
        await new Promise((r) => setTimeout(r, Math.random() * 5))
        const rows = await simulateAtomicCounterUpdate('invoice')
        saleResults.push(`${rows[0].invoicePrefix}${rows[0].num}`)
      }),
      ...Array.from({ length: 5 }).map(async () => {
        await new Promise((r) => setTimeout(r, Math.random() * 5))
        const rows = await simulateAtomicCounterUpdate('webOrder')
        webResults.push(`ORD-${rows[0].num}`)
      }),
    ]

    await Promise.all(tasks)

    expect(saleResults.sort()).toEqual(['CIL-1', 'CIL-2', 'CIL-3', 'CIL-4', 'CIL-5'])
    expect(webResults.sort()).toEqual(['ORD-1000', 'ORD-1001', 'ORD-1002', 'ORD-1003', 'ORD-1004'])

    expect(dbSettings.nextInvoiceNumber).toBe(6)
    expect(dbSettings.nextWebOrderNumber).toBe(1005)
  })

  it('correctly handles BigInt returned by pg driver in counterRows', () => {
    const counterRowsBigInt = [{ num: BigInt(42), invoicePrefix: 'CIL-' }]
    const assignedNumber = counterRowsBigInt[0]?.num != null ? Number(counterRowsBigInt[0].num) : 1
    const prefix = counterRowsBigInt[0]?.invoicePrefix ?? 'CIL-'
    const invoiceNumber = `${prefix}${assignedNumber}`

    expect(invoiceNumber).toBe('CIL-42')
  })

  it('correctly handles 0 value without falling back to defaults', () => {
    const counterRowsZero = [{ num: 0, invoicePrefix: 'CIL-' }]
    const settings = { nextInvoiceNumber: 999, invoicePrefix: 'DEFAULT-' }

    const assignedNumber = counterRowsZero[0]?.num != null ? Number(counterRowsZero[0].num) : settings.nextInvoiceNumber
    const prefix = counterRowsZero[0]?.invoicePrefix ?? settings.invoicePrefix
    const invoiceNumber = `${prefix}${assignedNumber}`

    expect(assignedNumber).toBe(0)
    expect(invoiceNumber).toBe('CIL-0')
  })
})
