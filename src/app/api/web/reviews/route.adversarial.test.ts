import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const getProductReviewsMock = vi.hoisted(() => vi.fn())
const createProductReviewMock = vi.hoisted(() => vi.fn())
const enforceRateLimitMock = vi.hoisted(() => vi.fn<() => NextResponse | null>(() => null))

vi.mock('@/modules/web/web.service', () => ({
  getProductReviews: getProductReviewsMock,
  createProductReview: createProductReviewMock,
}))

vi.mock('@/lib/api-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-utils')>()
  return {
    ...actual,
    enforceRateLimit: enforceRateLimitMock,
  }
})

import { GET, POST } from './route'

describe('Adversarial Verification: /api/web/reviews Cache-Control and Security', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    enforceRateLimitMock.mockReturnValue(null)
  })

  describe('GET /api/web/reviews Cache Headers', () => {
    it('sets strict public CDN Cache-Control header when review query succeeds', async () => {
      getProductReviewsMock.mockResolvedValueOnce([
        {
          id: 'rev-1',
          name: 'Carlos Gomez',
          rating: 5,
          comment: 'Excelente calidad',
          createdAt: new Date('2026-11-01'),
        },
      ])

      const req = new NextRequest('http://localhost:3000/api/web/reviews?productId=prod-100')
      const res = await GET(req)

      expect(res.status).toBe(200)
      const cacheControl = res.headers.get('cache-control')
      expect(cacheControl).toBe('public, s-maxage=60, stale-while-revalidate=120')

      // Validate RFC 9111 cache directive format
      expect(cacheControl).toContain('public')
      expect(cacheControl).toMatch(/s-maxage=\d+/)
      expect(cacheControl).toMatch(/stale-while-revalidate=\d+/)
    })

    it('does NOT apply public CDN cache-control when productId is missing (400 Bad Request)', async () => {
      const req = new NextRequest('http://localhost:3000/api/web/reviews?productId=   ')
      const res = await GET(req)

      expect(res.status).toBe(400)
      const cacheControl = res.headers.get('cache-control')
      // Error responses must not be cached with s-maxage on CDN
      expect(cacheControl).toBeNull()
      expect(getProductReviewsMock).not.toHaveBeenCalled()
    })

    it('does NOT apply public CDN cache-control when service throws error (500 Internal Error)', async () => {
      getProductReviewsMock.mockRejectedValueOnce(new Error('Database connection failed'))

      const req = new NextRequest('http://localhost:3000/api/web/reviews?productId=prod-error')
      const res = await GET(req)

      expect(res.status).toBe(500)
      const cacheControl = res.headers.get('cache-control')
      expect(cacheControl).toBeNull()
    })

    it('respects rate limiting and returns 429 without catalog cache headers', async () => {
      const { json } = await import('@/lib/api-utils')
      enforceRateLimitMock.mockReturnValueOnce(json({ error: 'Too Many Requests' }, { status: 429 }))

      const req = new NextRequest('http://localhost:3000/api/web/reviews?productId=prod-flood')
      const res = await GET(req)

      expect(res.status).toBe(429)
      expect(res.headers.get('cache-control')).toBeNull()
      expect(getProductReviewsMock).not.toHaveBeenCalled()
    })
  })

  describe('POST /api/web/reviews Mutation Safety', () => {
    it('does NOT apply catalog CDN Cache-Control headers on successful review creation', async () => {
      createProductReviewMock.mockResolvedValueOnce({
        id: 'rev-created',
        name: 'Ana Sofia',
        rating: 4,
        comment: 'Muy buen servicio',
      })

      const req = new NextRequest('http://localhost:3000/api/web/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          productId: 'prod-100',
          name: 'Ana Sofia',
          rating: 4,
          comment: 'Muy buen servicio',
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.ok).toBe(true)

      // POST mutations MUST NEVER send public s-maxage catalog headers
      const cacheControl = res.headers.get('cache-control')
      expect(cacheControl).toBeNull()
    })

    it('silently ignores honeypot spam bot submissions without writing to database', async () => {
      const req = new NextRequest('http://localhost:3000/api/web/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          productId: 'prod-100',
          name: 'SpamBot 3000',
          rating: 5,
          comment: 'Buy cheap items here',
          website: 'http://spam-link.ru', // honeypot trap
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.ok).toBe(true)
      expect(createProductReviewMock).not.toHaveBeenCalled()
      expect(res.headers.get('cache-control')).toBeNull()
    })
  })
})
