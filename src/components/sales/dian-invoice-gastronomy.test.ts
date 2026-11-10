import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { DianInvoiceView, type DianInvoiceSaleData } from './dian-invoice-view'
import { renderInvoicePdf, InvoiceSale } from '@/lib/pdf/invoice'
import { loadPdfSettings } from '@/lib/pdf/load'
import type { PdfSettings } from '@/lib/pdf/theme'

const mockDate = new Date('2026-11-09T14:30:00.000Z')

const gastronomySaleData: DianInvoiceSaleData = {
  id: 'sale-gastro-1',
  invoiceNumber: 'REST-0042',
  subtotal: 120000,
  discount: 0,
  total: 120000,
  paymentMethod: 'CASH',
  status: 'COMPLETED',
  saleDate: mockDate,
  dueDate: null,
  client: {
    id: 'cli-mesa-5',
    name: 'Mesa 5 - Terraza',
    phone: '3001234567',
    address: 'Sector Gourmet',
  },
  items: [
    {
      id: 'item-1',
      quantity: 2,
      unitPrice: 45000,
      total: 90000,
      product: {
        id: 'p1',
        name: 'Bife de Chorizo Angus',
        barcode: 'PLT-01',
      },
    },
    {
      id: 'item-2',
      quantity: 2,
      unitPrice: 15000,
      total: 30000,
      product: {
        id: 'p2',
        name: 'Copa Sangría Española',
        barcode: 'BEB-03',
      },
    },
  ],
  user: {
    name: 'Carlos Mesero',
  },
  invoice: {
    companyName: 'Bistró Gourmet Nova',
    companyNit: '900.888.777-1',
    companyAddress: 'Calle 93 #11A-28',
    companyCity: 'Bogotá',
    companyPhone: '+57 (300) 555-1234',
    companyEmail: 'reservas@bistronova.co',
    currency: 'COP',
    invoiceFooter: null,
  },
}

const retailCreditSaleData: DianInvoiceSaleData = {
  id: 'sale-retail-1',
  invoiceNumber: 'FAC-0089',
  subtotal: 250000,
  discount: 10000,
  total: 240000,
  paymentMethod: 'CREDITO',
  status: 'COMPLETED',
  saleDate: mockDate,
  dueDate: new Date('2026-12-09T14:30:00.000Z'),
  client: {
    id: 'cli-retail-1',
    name: 'Comercializadora Andina SAS',
    phone: '3109876543',
    address: 'Av. Las Américas #50-10',
  },
  items: [
    {
      id: 'item-1',
      quantity: 1,
      unitPrice: 250000,
      total: 250000,
      product: {
        id: 'p1',
        name: 'Taladro Percutor Industrial 750W',
        barcode: 'HRD-998',
      },
    },
  ],
  payments: [
    {
      amount: 40000,
      paymentDate: mockDate,
      paymentMethod: 'CASH',
    },
  ],
  user: {
    name: 'Asesor Ferretero',
  },
  invoice: {
    companyName: 'Ferretería & Suministros Nova',
    companyNit: '901.222.333-4',
    companyAddress: 'Zona Industrial Calle 13',
    companyCity: 'Medellín',
    companyPhone: '+57 (315) 444-5566',
    companyEmail: 'ventas@ferreterianova.co',
    currency: 'COP',
    invoiceFooter: 'Garantía de 1 año directamente con el fabricante.',
  },
}

describe('DianInvoiceView & PDF Document Gastronomy Adaptations (Milestone 3)', () => {
  describe('HTML Invoice View (DianInvoiceView)', () => {
    it('renders gastronomic headers and fields when sector is restaurant_gastronomy', () => {
      const html = renderToStaticMarkup(
        React.createElement(DianInvoiceView, {
          sale: gastronomySaleData,
          sector: 'restaurant_gastronomy',
        }),
      )

      // 1. Document title
      expect(html).toContain('COMPROBANTE DE CONSUMO / FACTURA DE VENTA')
      expect(html).not.toContain('Factura de venta')

      // 2. Client header (Mesa / Comensal)
      expect(html).toContain('Mesa / Comensal')
      expect(html).toContain('Mesa 5 - Terraza')

      // 3. Attendant label (Mesero / Atención)
      expect(html).toContain('Mesero / Atención')
      expect(html).toContain('Carlos Mesero')

      // 4. Date label (Fecha de Consumo)
      expect(html).toContain('Fecha de Consumo')

      // 5. Items table header (Platillo / Bebida / Consumo)
      expect(html).toContain('Platillo / Bebida / Consumo')
      expect(html).toContain('Bife de Chorizo Angus')
      expect(html).toContain('Copa Sangría Española')

      // 6. Voluntary 10% tip and total with tip
      expect(html).toContain('Propina voluntaria sugerida (10%)')
      expect(html).toContain('Total con propina sugerida')

      // 7. Statutory legal note per Ley 1935 de 2018
      expect(html).toContain(
        'De conformidad con la Ley 1935 de 2018, la propina es voluntaria (sugerida 10%). Este documento constituye soporte de consumo / cuenta de cobro de mesa. ¡Gracias por su visita!',
      )

      // 8. Suppressed credit fields in gastronomy
      expect(html).not.toContain('Vence')
      expect(html).not.toContain('Abonado')
      expect(html).not.toContain('Saldo pendiente')
    })

    it('falls back to "Mesa General / Consumidor Final" and "Personal de Servicio" when client/user are absent in gastronomy', () => {
      const anonymousGastroSale: DianInvoiceSaleData = {
        ...gastronomySaleData,
        client: null,
        user: null,
      }

      const html = renderToStaticMarkup(
        React.createElement(DianInvoiceView, {
          sale: anonymousGastroSale,
          sector: 'restaurant_gastronomy',
        }),
      )

      expect(html).toContain('Mesa / Comensal')
      expect(html).toContain('Mesa General / Consumidor Final')
      expect(html).toContain('Mesero / Atención')
      expect(html).toContain('Personal de Servicio')
    })

    it('preserves 100% standard retail invoice layout and credit fields for other sectors (e.g. retail_general)', () => {
      const html = renderToStaticMarkup(
        React.createElement(DianInvoiceView, {
          sale: retailCreditSaleData,
          sector: 'retail_general',
        }),
      )

      // 1. Standard title
      expect(html).toContain('Factura de venta')
      expect(html).not.toContain('COMPROBANTE DE CONSUMO')

      // 2. Standard client header
      expect(html).toContain('Facturar a')
      expect(html).toContain('Comercializadora Andina SAS')
      expect(html).not.toContain('Mesa / Comensal')

      // 3. Standard attendant label
      expect(html).toContain('Atendió')
      expect(html).toContain('Asesor Ferretero')
      expect(html).not.toContain('Mesero / Atención')

      // 4. Standard date label
      expect(html).toContain('Fecha de emisión')
      expect(html).not.toContain('Fecha de Consumo')

      // 5. Standard item column header
      expect(html).toContain('Descripción de bienes o servicios')
      expect(html).not.toContain('Platillo / Bebida / Consumo')

      // 6. Credit fields must be present for retail credit sales
      expect(html).toContain('Vence')
      expect(html).toContain('Abonado')

      // 7. Tip and gastronomy legal note must NOT be present
      expect(html).not.toContain('Propina voluntaria sugerida (10%)')
      expect(html).not.toContain('Total con propina sugerida')
      expect(html).not.toContain('Ley 1935 de 2018')
    })
  })

  describe('PDF Invoice Document Generation', () => {
    const gastronomyPdfSale: InvoiceSale = {
      id: 'sale-gastro-1',
      invoiceNumber: 'REST-0042',
      subtotal: 120000,
      discount: 0,
      total: 120000,
      paymentMethod: 'CASH',
      status: 'COMPLETED',
      saleDate: mockDate,
      dueDate: null,
      client: {
        name: 'Mesa 5 - Terraza',
        phone: '3001234567',
        email: null,
        address: 'Sector Gourmet',
      },
      items: [
        {
          quantity: 2,
          unitPrice: 45000,
          total: 90000,
          product: { name: 'Bife de Chorizo Angus' },
        },
        {
          quantity: 2,
          unitPrice: 15000,
          total: 30000,
          product: { name: 'Copa Sangría Española' },
        },
      ],
      user: { name: 'Carlos Mesero' },
    }

    const gastroPdfSettings: PdfSettings = {
      companyName: 'Bistró Gourmet Nova',
      companyNit: '900.888.777-1',
      companyAddress: 'Calle 93 #11A-28',
      companyCity: 'Bogotá',
      companyPhone: '+57 (300) 555-1234',
      companyEmail: 'reservas@bistronova.co',
      invoicePrefix: 'REST-',
      invoiceFooter: null,
      currency: 'COP',
      sector: 'restaurant_gastronomy',
    }

    it('generates a valid PDF with %PDF- header for restaurant_gastronomy', async () => {
      const bytes = await renderInvoicePdf(gastronomyPdfSale, gastroPdfSettings)
      expect(bytes.length).toBeGreaterThan(1000)
      expect(Buffer.from(bytes.subarray(0, 5)).toString('latin1')).toBe('%PDF-')
    })

    it('generates a valid PDF for retail_general with standard settings', async () => {
      const retailPdfSettings: PdfSettings = {
        ...gastroPdfSettings,
        sector: 'retail_general',
      }
      const bytes = await renderInvoicePdf(gastronomyPdfSale, retailPdfSettings)
      expect(bytes.length).toBeGreaterThan(1000)
      expect(Buffer.from(bytes.subarray(0, 5)).toString('latin1')).toBe('%PDF-')
    })
  })

  describe('loadPdfSettings integration', () => {
    it('loads the sector from getBusinessWorkflowConfig into PdfSettings', async () => {
      const { prisma } = await import('@/lib/prisma')

      const originalFindFirst = prisma.systemSettings.findFirst

      try {
        prisma.systemSettings.findFirst = vi.fn().mockResolvedValue({
          companyName: 'Restaurante Test',
          companyNit: '123456789',
          companyAddress: 'Calle Falsa 123',
          companyCity: 'Bogota',
          companyPhone: '3000000',
          companyEmail: 'test@gastro.com',
          invoicePrefix: 'RES-',
          invoiceFooter: null,
          currency: 'COP',
        })

        // Mock getBusinessWorkflowConfig
        vi.spyOn(await import('@/modules/settings/settings.service'), 'getBusinessWorkflowConfig').mockResolvedValue({
          sector: 'restaurant_gastronomy',
          slogan: 'Sabor excepcional',
          taxIdType: 'NIT',
          taxIdDv: '1',
          taxRegime: 'responsable_iva',
          stateRegion: 'Bogota',
          website: '',
          allowCreditSales: false,
          requireClientOnSale: false,
          allowNegativeStock: false,
          allowCashierDiscounts: true,
          autoPrintReceipt: false,
          defaultClientName: 'Mesa General',
          dianResolutionNumber: '18760000001',
          dianResolutionDate: '2026-01-01',
          dianRangeFrom: 1,
          dianRangeTo: 50000,
          defaultProfitMargin: 45,
          barcodeContinuousScan: false,
          requireAdjustmentReason: true,
        })

        const settings = await loadPdfSettings()
        expect(settings).toBeDefined()
        expect(settings?.sector).toBe('restaurant_gastronomy')
        expect(settings?.companyName).toBe('Restaurante Test')
      } finally {
        prisma.systemSettings.findFirst = originalFindFirst
      }
    })
  })
})
