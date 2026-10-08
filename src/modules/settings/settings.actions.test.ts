import { describe, it, expect, vi, beforeEach } from 'vitest'

const { requireAdminMock, updateSettingsMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  updateSettingsMock: vi.fn(),
}))

vi.mock('@/modules/auth/auth.actions', () => ({
  requireAdmin: requireAdminMock,
  requireAuth: vi.fn(),
}))

vi.mock('./settings.service', () => ({
  getOrCreateSettings: vi.fn(),
  updateSettings: updateSettingsMock,
  getBusinessWorkflowConfig: vi.fn(),
  updateBusinessWorkflowConfig: vi.fn(),
  autoConfigureBusinessWithAi: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { updateSystemSettings } from './settings.actions'

describe('updateSystemSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireAdminMock.mockResolvedValue(undefined)
    updateSettingsMock.mockResolvedValue({ id: 's1' })
  })

  it('successfully updates settings when optional fields are empty strings or null', async () => {
    const formData = new FormData()
    formData.append('companyName', 'Nova ERP')
    formData.append('companyNit', '')
    formData.append('companyAddress', '')
    formData.append('companyCity', '')
    formData.append('companyPhone', '')
    formData.append('companyEmail', '')
    formData.append('currency', 'COP')
    formData.append('invoicePrefix', 'FAC-')
    formData.append('invoiceFooter', '')
    formData.append('lowStockThreshold', '5')
    formData.append('nextInvoiceNumber', '1')
    formData.append('nextWebOrderNumber', '1000')
    formData.append('webPendingExpiryHours', '24')

    const result = await updateSystemSettings(formData)

    expect(result.success).toBe(true)
    expect(updateSettingsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        companyName: 'Nova ERP',
        companyNit: null,
        companyAddress: null,
        companyCity: null,
        companyPhone: null,
        companyEmail: null,
        currency: 'COP',
        invoicePrefix: 'FAC-',
        invoiceFooter: null,
        lowStockThreshold: 5,
      }),
    )
  })

  it('validates email format when a non-empty invalid email is provided', async () => {
    const formData = new FormData()
    formData.append('companyName', 'Nova ERP')
    formData.append('companyEmail', 'not-an-email')

    const result = await updateSystemSettings(formData)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Email inválido')
    }
  })

  it('fails if companyName is empty', async () => {
    const formData = new FormData()
    formData.append('companyName', '')

    const result = await updateSystemSettings(formData)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Razón social o nombre comercial requerido')
    }
  })
})
