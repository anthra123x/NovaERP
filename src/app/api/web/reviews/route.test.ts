import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const getProductReviewsMock = vi.hoisted(() => vi.fn())

vi.mock('@/modules/web/web.service', () => ({
  getProductReviews: getProductReviewsMock,
  createProductReview: vi.fn(),
}))

vi.mock('@/lib/api-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-utils')>()
  return {
    ...actual,
    enforceRateLimit: vi.fn(() => null),
  }
})

import { GET } from './route'

describe('GET /api/web/reviews Cache-Control headers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getProductReviewsMock.mockResolvedValue([
      {
        id: 'rev-1',
        productId: 'prod-1',
        authorName: 'Laura',
        rating: 5,
        comment: 'Excelente producto',
        approved: true,
        createdAt: new Date('2026-11-01'),
      },
    ])
  })

  it('includes public CDN Cache-Control headers on successful review queries', async () => {
    const req = new NextRequest('http://localhost:3000/api/web/reviews?productId=prod-1')
    const response = await GET(req)

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe(
      'public, s-maxage=60, stale-while-revalidate=120',
    )
    const data = await response.json()
    expect(data.reviews).toHaveLength(1)
  })

  it('returns 400 when productId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/web/reviews')
    const response = await GET(req)

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('Falta el parámetro productId')
  })
})
