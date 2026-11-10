import { beforeEach, describe, expect, it, vi } from 'vitest'

const supabaseGetUserMock = vi.fn()

vi.mock('@/lib/supabase-server', () => ({
  supabase: {
    auth: { signOut: vi.fn() },
  },
  createSupabaseServerAction: vi.fn(async () => ({
    auth: {
      getUser: supabaseGetUserMock,
    },
  })),
}))

const prismaUserMock = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: prismaUserMock,
  },
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { getCurrentUser, requireAuth } from './auth.actions'

describe('getCurrentUser memoization and authentication flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabaseGetUserMock.mockResolvedValue({
      data: {
        user: {
          id: 'sb-user-1',
          email: 'admin@cilmax.com',
          user_metadata: { name: 'Admin Cilmax' },
        },
      },
      error: null,
    })
    prismaUserMock.findUnique.mockResolvedValue({
      id: 'db-user-1',
      email: 'admin@cilmax.com',
      name: 'Admin Cilmax',
      createdAt: new Date('2026-01-01'),
    })
  })

  it('returns the authenticated user and syncs with database', async () => {
    const user = await getCurrentUser()

    expect(user).toEqual(
      expect.objectContaining({
        id: 'db-user-1',
        email: 'admin@cilmax.com',
        name: 'Admin Cilmax',
      }),
    )
    expect(supabaseGetUserMock).toHaveBeenCalledTimes(1)
    expect(prismaUserMock.findUnique).toHaveBeenCalledWith({
      where: { email: 'admin@cilmax.com' },
      select: expect.objectContaining({ id: true, email: true, name: true }),
    })
  })

  it('returns null when Supabase session is not present or invalid', async () => {
    supabaseGetUserMock.mockResolvedValueOnce({
      data: { user: null },
      error: new Error('No session'),
    })

    const user = await getCurrentUser()

    expect(user).toBeNull()
  })

  it('allows requireAuth to succeed when user is authenticated', async () => {
    const user = await requireAuth()

    expect(user).toEqual(
      expect.objectContaining({
        id: 'db-user-1',
        email: 'admin@cilmax.com',
      }),
    )
  })
})
