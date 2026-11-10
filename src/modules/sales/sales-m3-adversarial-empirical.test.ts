import { beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// Mocks for Sales Action Tests
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
    id: 'user-waiter-10',
    email: 'waiter@restaurant.com',
    name: 'Juan Mesero',
    role: 'ADMIN',
  })),
}))

vi.mock('@/lib/revalidation', () => ({
  revalidateSalePaths: vi.fn(),
}))

vi.mock('./sales.helpers', () => ({
  resolveSaleUnitPrice: vi.fn((unitPrice?: number, product?: { salePrice: number; costPrice?: number }) => ({
    ok: true,
    unitPrice: unitPrice ?? product?.salePrice ?? 35000,
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
import { DianInvoiceView, type DianInvoiceSaleData } from '@/components/sales/dian-invoice-view'
import { renderInvoicePdf, type InvoiceSale } from '@/lib/pdf/invoice'
import { loadPdfSettings } from '@/lib/pdf/load'
import type { BusinessSector } from '@/lib/business-workflow'
import type { PdfSettings } from '@/lib/pdf/theme'

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

describe('Milestone 3 — Empirical Challenger Adversarial Verification Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    prismaMocks.$transaction.mockImplementation(async (cb: (t: ReturnType<typeof tx>) => unknown) => cb(tx()))
    prismaMocks.$queryRaw.mockResolvedValue([{ num: 501, invoicePrefix: 'RES-' }])

    prismaMocks.systemSettings.findFirst.mockResolvedValue({
      id: 'sys-gastro-1',
      invoicePrefix: 'RES-',
      nextInvoiceNumber: 501,
      companyName: 'Restaurante Sabor y Fuego',
      companyNit: '900.777.666-5',
      companyAddress: 'Zona Rosa Calle 85',
      companyCity: 'Bogotá',
      companyPhone: '315 777 8899',
      companyEmail: 'hola@saboryfuego.com',
      currency: 'COP',
      invoiceFooter: null,
    })

    prismaMocks.product.findMany.mockResolvedValue([
      {
        id: 'dish-1',
        name: 'Ribeye Steak 400g',
        salePrice: 65000,
        costPrice: 32000,
        stock: 30,
        deletedAt: null,
      },
      {
        id: 'beverage-1',
        name: 'Jugo de Maracuyá',
        salePrice: 9000,
        costPrice: 2500,
        stock: 80,
        deletedAt: null,
      },
    ])

    prismaMocks.product.updateMany.mockResolvedValue({ count: 1 })
    prismaMocks.stockMovement.create.mockResolvedValue({ id: 'mov-gastro-1' })
    prismaMocks.invoice.create.mockResolvedValue({ id: 'inv-gastro-1' })
    prismaMocks.transaction.create.mockResolvedValue({ id: 'txn-gastro-1' })

    prismaMocks.sale.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'sale-gastro-99',
      ...data,
      items: [
        {
          id: 'item-1',
          productId: 'dish-1',
          quantity: 1,
          unitPrice: 65000,
          total: 65000,
        },
      ],
    }))
  })

  /* =========================================================================
   * 1. EMPIRICAL VERIFICATION: SERVER-SIDE CREDIT REJECTION
   * ========================================================================= */
  describe('Requirement 1: Server-Side Credit Rejection & Cash Flow Integrity', () => {
    it('STRICTLY rejects credit in restaurant_gastronomy even when malicious caller sets allowCreditSales: true', async () => {
      settingsMocks.getBusinessWorkflowConfig.mockResolvedValue({
        sector: 'restaurant_gastronomy',
        allowCreditSales: true, // Malicious override attempt
        allowNegativeStock: false,
        requireClientOnSale: false,
      })

      const response = await createSale({
        paymentMethod: 'CREDITO',
        clientId: 'client-table-4',
        items: [{ productId: 'dish-1', quantity: 1, unitPrice: 65000 }],
        dueDate: '2026-12-01',
        installments: [{ amount: 65000, dueDate: '2026-12-01' }],
      })

      // Must strictly return validation error
      expect(response.error).toBe('Las ventas a crédito están deshabilitadas para este sector o configuración comercial')
      expect(response.sale).toBeUndefined()

      // CRITICAL: Must NEVER touch the database or transaction
      expect(prismaMocks.$transaction).not.toHaveBeenCalled()
      expect(prismaMocks.sale.create).not.toHaveBeenCalled()
      expect(prismaMocks.product.updateMany).not.toHaveBeenCalled()
      expect(prismaMocks.stockMovement.create).not.toHaveBeenCalled()
      expect(prismaMocks.transaction.create).not.toHaveBeenCalled()
    })

    it('STRICTLY rejects credit in all 8 business sectors when allowCreditSales: false', async () => {
      const allSectors: BusinessSector[] = [
        'retail_general',
        'technology_repair',
        'fashion_apparel',
        'grocery_supermarket',
        'hardware_construction',
        'pharmacy_health',
        'services_workshop',
        'restaurant_gastronomy',
      ]

      for (const sector of allSectors) {
        vi.clearAllMocks()
        settingsMocks.getBusinessWorkflowConfig.mockResolvedValue({
          sector,
          allowCreditSales: false,
          allowNegativeStock: false,
          requireClientOnSale: false,
        })

        const response = await createSale({
          paymentMethod: 'CREDITO',
          clientId: 'client-valid-id',
          items: [{ productId: 'dish-1', quantity: 1, unitPrice: 65000 }],
          dueDate: '2026-12-01',
          installments: [{ amount: 65000, dueDate: '2026-12-01' }],
        })

        expect(response.error).toBe(
          'Las ventas a crédito están deshabilitadas para este sector o configuración comercial',
        )
        expect(prismaMocks.sale.create).not.toHaveBeenCalled()
        expect(prismaMocks.stockMovement.create).not.toHaveBeenCalled()
      }
    })

    it('SUCCESSFULLY creates cash sale (CASH) in restaurant_gastronomy and deducts stock', async () => {
      settingsMocks.getBusinessWorkflowConfig.mockResolvedValue({
        sector: 'restaurant_gastronomy',
        allowCreditSales: false,
        allowNegativeStock: false,
        requireClientOnSale: false,
      })

      const response = await createSale({
        paymentMethod: 'CASH',
        items: [{ productId: 'dish-1', quantity: 1, unitPrice: 65000 }],
      })

      expect(response.error).toBeUndefined()
      expect(response.success).toBe('Venta registrada exitosamente')
      expect(response.sale?.paymentMethod).toBe('CASH')
      expect(response.sale?.total).toBe(65000)

      // Verified stock deduction and movement
      expect(prismaMocks.product.updateMany).toHaveBeenCalled()
      expect(prismaMocks.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productId: 'dish-1',
            quantity: 1,
            type: 'SALE',
            reference: 'RES-501',
          }),
        }),
      )

      // Verified income transaction
      expect(prismaMocks.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'INCOME',
            amount: 65000,
            saleId: 'sale-gastro-99',
          }),
        }),
      )
    })

    it('SUCCESSFULLY creates card sale (CARD) in restaurant_gastronomy', async () => {
      settingsMocks.getBusinessWorkflowConfig.mockResolvedValue({
        sector: 'restaurant_gastronomy',
        allowCreditSales: false,
        allowNegativeStock: false,
        requireClientOnSale: false,
      })

      const response = await createSale({
        paymentMethod: 'CARD',
        items: [{ productId: 'beverage-1', quantity: 2, unitPrice: 9000 }],
      })

      expect(response.error).toBeUndefined()
      expect(response.success).toBe('Venta registrada exitosamente')
      expect(response.sale?.paymentMethod).toBe('CARD')
      expect(response.sale?.total).toBe(18000)
    })

    it('SUCCESSFULLY creates electronic transfer (TRANSFER) in restaurant_gastronomy', async () => {
      settingsMocks.getBusinessWorkflowConfig.mockResolvedValue({
        sector: 'restaurant_gastronomy',
        allowCreditSales: false,
        allowNegativeStock: false,
        requireClientOnSale: false,
      })

      const response = await createSale({
        paymentMethod: 'TRANSFER',
        items: [
          { productId: 'dish-1', quantity: 1, unitPrice: 65000 },
          { productId: 'beverage-1', quantity: 1, unitPrice: 9000 },
        ],
      })

      expect(response.error).toBeUndefined()
      expect(response.success).toBe('Venta registrada exitosamente')
      expect(response.sale?.paymentMethod).toBe('TRANSFER')
      expect(response.sale?.total).toBe(74000)
    })

    it('PRESERVES stock when stockReserved: true is set (avoid double deduction on web order conversion)', async () => {
      settingsMocks.getBusinessWorkflowConfig.mockResolvedValue({
        sector: 'restaurant_gastronomy',
        allowCreditSales: false,
        allowNegativeStock: false,
        requireClientOnSale: false,
      })

      const response = await createSale({
        paymentMethod: 'CASH',
        items: [{ productId: 'dish-1', quantity: 1, unitPrice: 65000 }],
        stockReserved: true,
      })

      expect(response.error).toBeUndefined()
      expect(response.success).toBe('Venta registrada exitosamente')
      expect(prismaMocks.product.updateMany).not.toHaveBeenCalled()
      expect(prismaMocks.stockMovement.create).not.toHaveBeenCalled()
    })
  })

  /* =========================================================================
   * 2. EMPIRICAL VERIFICATION: TIP CALCULATION & LEY 1935 DE 2018 LEGAL NOTICE
   * ========================================================================= */
  describe('Requirement 2: Tip Calculation Edge Cases & Legal Notice Parity', () => {
    const tipFormula = (total: number) => {
      const tip = Math.round(total * 0.1 * 100) / 100
      const totalWithTip = Math.round((total + tip) * 100) / 100
      return { tip, totalWithTip }
    }

    it('Correctly calculates suggested tip (10%) and total with tip for various edge cases', () => {
      // Zero total
      expect(tipFormula(0)).toEqual({ tip: 0, totalWithTip: 0 })

      // Standard integer totals
      expect(tipFormula(100)).toEqual({ tip: 10, totalWithTip: 110 })
      expect(tipFormula(25000)).toEqual({ tip: 2500, totalWithTip: 27500 })
      expect(tipFormula(120000)).toEqual({ tip: 12000, totalWithTip: 132000 })

      // Odd / Decimal totals
      expect(tipFormula(12345.67)).toEqual({ tip: 1234.57, totalWithTip: 13580.24 })
      expect(tipFormula(99.99)).toEqual({ tip: 10, totalWithTip: 109.99 })
      expect(tipFormula(0.05)).toEqual({ tip: 0.01, totalWithTip: 0.06 })

      // Large enterprise / event total (1 billion COP)
      expect(tipFormula(1_000_000_000)).toEqual({ tip: 100_000_000, totalWithTip: 1_100_000_000 })
    })

    const sampleGastroSale: DianInvoiceSaleData = {
      id: 'sale-test-100',
      invoiceNumber: 'RES-00501',
      subtotal: 74000,
      discount: 0,
      total: 74000,
      paymentMethod: 'CASH',
      status: 'COMPLETED',
      saleDate: new Date('2026-11-09T18:00:00Z'),
      client: {
        id: 'table-7',
        name: 'Mesa 7 - Balcón',
        phone: '3112223344',
      },
      items: [
        {
          quantity: 1,
          unitPrice: 65000,
          total: 65000,
          product: { name: 'Ribeye Steak 400g' },
        },
        {
          quantity: 1,
          unitPrice: 9000,
          total: 9000,
          product: { name: 'Jugo de Maracuyá' },
        },
      ],
      user: { name: 'Mariana Mesera' },
      invoice: {
        companyName: 'Restaurante Sabor y Fuego',
        companyNit: '900.777.666-5',
        currency: 'COP',
      },
    }

    it('Renders exact statutory legal notice for Ley 1935 de 2018 in HTML DianInvoiceView', () => {
      const html = renderToStaticMarkup(
        React.createElement(DianInvoiceView, {
          sale: sampleGastroSale,
          sector: 'restaurant_gastronomy',
        }),
      )

      // Verbatim legal notice
      expect(html).toContain(
        'De conformidad con la Ley 1935 de 2018, la propina es voluntaria (sugerida 10%). Este documento constituye soporte de consumo / cuenta de cobro de mesa. ¡Gracias por su visita!',
      )

      // Tip labels
      expect(html).toContain('Propina voluntaria sugerida (10%)')
      expect(html).toContain('Total con propina sugerida')

      // Gastronomic nomenclature
      expect(html).toContain('COMPROBANTE DE CONSUMO / FACTURA DE VENTA')
      expect(html).toContain('Mesa / Comensal')
      expect(html).toContain('Mesa 7 - Balcón')
      expect(html).toContain('Mesero / Atención')
      expect(html).toContain('Mariana Mesera')
      expect(html).toContain('Platillo / Bebida / Consumo')
    })

    it('Never renders tip row or Ley 1935 notice when sector is non-gastronomic (e.g. retail_general)', () => {
      const html = renderToStaticMarkup(
        React.createElement(DianInvoiceView, {
          sale: sampleGastroSale,
          sector: 'retail_general',
        }),
      )

      expect(html).not.toContain('Ley 1935 de 2018')
      expect(html).not.toContain('Propina voluntaria sugerida (10%)')
      expect(html).not.toContain('Total con propina sugerida')
      expect(html).toContain('Factura de venta')
      expect(html).toContain('Facturar a')
      expect(html).toContain('Descripción de bienes o servicios')
    })
  })

  /* =========================================================================
   * 3. EMPIRICAL VERIFICATION: PDF GENERATION & BUFFER INTEGRITY
   * ========================================================================= */
  describe('Requirement 3: PDF Generation & Buffer Integrity', () => {
    it('loadPdfSettings correctly extracts sector: restaurant_gastronomy from workflow config', async () => {
      prismaMocks.systemSettings.findFirst.mockResolvedValue({
        id: 'sys-gastro-1',
        companyName: 'La Parrilla Argentina',
        companyNit: '900111222-3',
        companyAddress: 'Calle 100 #15-20',
        companyCity: 'Bogotá',
        companyPhone: '320 000 1122',
        companyEmail: 'parrilla@test.com',
        invoicePrefix: 'PAR-',
        invoiceFooter: null,
        currency: 'COP',
      })

      settingsMocks.getBusinessWorkflowConfig.mockResolvedValue({
        sector: 'restaurant_gastronomy',
        allowCreditSales: false,
        slogan: 'El mejor corte',
      })

      const pdfSettings = await loadPdfSettings()
      expect(pdfSettings).toBeDefined()
      expect(pdfSettings?.sector).toBe('restaurant_gastronomy')
      expect(pdfSettings?.companyName).toBe('La Parrilla Argentina')
      expect(pdfSettings?.invoicePrefix).toBe('PAR-')
    })

    it('loadPdfSettings catches errors defensively and returns sector: undefined without crashing', async () => {
      settingsMocks.getBusinessWorkflowConfig.mockRejectedValue(new Error('Prisma database connection lost'))

      const pdfSettings = await loadPdfSettings()
      expect(pdfSettings).toBeDefined()
      expect(pdfSettings?.sector).toBeUndefined()
    })

    const samplePdfSale: InvoiceSale = {
      id: 'sale-pdf-1',
      invoiceNumber: 'RES-00501',
      subtotal: 74000,
      discount: 0,
      total: 74000,
      paymentMethod: 'CASH',
      status: 'COMPLETED',
      saleDate: new Date('2026-11-09T18:00:00Z'),
      client: {
        name: 'Mesa 7 - Balcón',
        phone: '3112223344',
        email: null,
        address: null,
      },
      items: [
        {
          quantity: 1,
          unitPrice: 65000,
          total: 65000,
          product: { name: 'Ribeye Steak 400g' },
        },
        {
          quantity: 1,
          unitPrice: 9000,
          total: 9000,
          product: { name: 'Jugo de Maracuyá' },
        },
      ],
      user: { name: 'Mariana Mesera' },
    }

    const gastroPdfSettings: PdfSettings = {
      companyName: 'Restaurante Sabor y Fuego',
      companyNit: '900.777.666-5',
      companyAddress: 'Zona Rosa Calle 85',
      companyCity: 'Bogotá',
      companyPhone: '315 777 8899',
      companyEmail: 'hola@saboryfuego.com',
      invoicePrefix: 'RES-',
      invoiceFooter: null,
      currency: 'COP',
      sector: 'restaurant_gastronomy',
    }

    it('Renders valid PDF buffer starting with %PDF- magic bytes for restaurant_gastronomy', async () => {
      const buffer = await renderInvoicePdf(samplePdfSale, gastroPdfSettings)
      expect(buffer).toBeDefined()
      expect(buffer.length).toBeGreaterThan(1500)

      // Magic bytes %PDF-
      const magicBytes = Buffer.from(buffer.subarray(0, 5)).toString('latin1')
      expect(magicBytes).toBe('%PDF-')
    })

    it('Stress test: Renders valid PDF with anonymous table, null user, zero total and special characters', async () => {
      const edgeCaseSale: InvoiceSale = {
        id: 'sale-edge-1',
        invoiceNumber: 'RES-00999',
        subtotal: 0,
        discount: 0,
        total: 0,
        paymentMethod: 'CASH',
        status: 'COMPLETED',
        saleDate: new Date('2026-11-09T18:00:00Z'),
        client: null, // Anonymous table
        user: null, // No waiter assigned
        items: [
          {
            quantity: 1,
            unitPrice: 0,
            total: 0,
            product: { name: 'Cortesía de la Casa: Café con Ñoquis & Té' },
          },
        ],
      }

      const buffer = await renderInvoicePdf(edgeCaseSale, gastroPdfSettings)
      expect(buffer).toBeDefined()
      expect(buffer.length).toBeGreaterThan(1000)
      const magicBytes = Buffer.from(buffer.subarray(0, 5)).toString('latin1')
      expect(magicBytes).toBe('%PDF-')
    })

    it('Stress test: Renders multi-page PDF with 30 items without crashing or throwing', async () => {
      const multiItemSale: InvoiceSale = {
        ...samplePdfSale,
        items: Array.from({ length: 30 }).map((_, i) => ({
          quantity: 1,
          unitPrice: 10000 + i * 1000,
          total: 10000 + i * 1000,
          product: { name: `Platillo Gourmet Número #${i + 1} Especial del Chef` },
        })),
        total: 735000,
        subtotal: 735000,
      }

      const buffer = await renderInvoicePdf(multiItemSale, gastroPdfSettings)
      expect(buffer).toBeDefined()
      expect(buffer.length).toBeGreaterThan(3000)
      expect(Buffer.from(buffer.subarray(0, 5)).toString('latin1')).toBe('%PDF-')
    })
  })
})
