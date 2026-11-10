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
  delete: vi.fn(),
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

import { getCurrentUser, requireAdmin, deleteUser } from './auth.actions'

describe('Adversarial Verification: Auth actions, React.cache and RBAC', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('handles database outage gracefully by returning session user as fallback', async () => {
    supabaseGetUserMock.mockResolvedValue({
      data: {
        user: {
          id: 'sb-outage-1',
          email: 'outage@cilmax.com',
          user_metadata: { name: 'Outage User' },
        },
      },
      error: null,
    })

    // Simulate Prisma throwing a database connection error
    prismaUserMock.findUnique.mockRejectedValueOnce(new Error('Connection terminated unexpectedly'))

    const user = await getCurrentUser()

    expect(user).not.toBeNull()
    expect(user?.email).toBe('outage@cilmax.com')
    expect(user?.name).toBe('Outage User')
  })

  it('auto-creates user via upsert when authenticated in Supabase but missing in database', async () => {
    supabaseGetUserMock.mockResolvedValue({
      data: {
        user: {
          id: 'sb-new-1',
          email: 'newuser@cilmax.com',
          user_metadata: { name: 'New User' },
        },
      },
      error: null,
    })

    prismaUserMock.findUnique.mockResolvedValueOnce(null)
    prismaUserMock.upsert.mockResolvedValueOnce({
      id: 'db-new-1',
      email: 'newuser@cilmax.com',
      name: 'New User',
      createdAt: new Date('2026-11-09'),
    })

    const user = await getCurrentUser()

    expect(user).toEqual(
      expect.objectContaining({
        id: 'db-new-1',
        email: 'newuser@cilmax.com',
        name: 'New User',
      }),
    )
    expect(prismaUserMock.upsert).toHaveBeenCalledWith({
      where: { email: 'newuser@cilmax.com' },
      update: {},
      create: {
        email: 'newuser@cilmax.com',
        name: 'New User',
      },
      select: expect.objectContaining({ id: true, email: true }),
    })
  })

  it('strictly blocks restricted roles (vendedor, cajero, empleado) in requireAdmin', async () => {
    const restrictedRoles = ['Vendedor', 'cajero', 'EMPLEADO_MOSTRADOR', 'vendedor de mostrador']

    for (const role of restrictedRoles) {
      supabaseGetUserMock.mockResolvedValue({
        data: {
          user: {
            id: 'sb-emp-1',
            email: 'employee@cilmax.com',
            user_metadata: { name: 'Employee', roleTitle: role },
          },
        },
        error: null,
      })

      prismaUserMock.findUnique.mockResolvedValue({
        id: 'db-emp-1',
        email: 'employee@cilmax.com',
        name: 'Employee',
        createdAt: new Date(),
      })

      await expect(requireAdmin()).rejects.toThrow(
        'Acceso no autorizado: se requieren permisos de administrador',
      )
    }
  })

  it('allows access in requireAdmin for Administrator role or default', async () => {
    supabaseGetUserMock.mockResolvedValue({
      data: {
        user: {
          id: 'sb-admin-1',
          email: 'admin@cilmax.com',
          user_metadata: { name: 'Admin', roleTitle: 'Administrador Propietario' },
        },
      },
      error: null,
    })

    prismaUserMock.findUnique.mockResolvedValue({
      id: 'db-admin-1',
      email: 'admin@cilmax.com',
      name: 'Admin',
      createdAt: new Date(),
    })

    const user = await requireAdmin()
    expect(user.email).toBe('admin@cilmax.com')
  })

  it('prevents self-deletion in deleteUser to avoid administrative lockout', async () => {
    supabaseGetUserMock.mockResolvedValue({
      data: {
        user: {
          id: 'admin-id-1',
          email: 'admin@cilmax.com',
          user_metadata: { roleTitle: 'Administrador' },
        },
      },
      error: null,
    })
    prismaUserMock.findUnique.mockResolvedValue({
      id: 'admin-id-1',
      email: 'admin@cilmax.com',
      name: 'Admin',
      createdAt: new Date(),
    })

    const result = await deleteUser('admin-id-1')

    expect(result).toEqual({ error: 'No puedes eliminar tu propio usuario' })
    expect(prismaUserMock.delete).not.toHaveBeenCalled()
  })

  it('verifies React.cache function wrapping and consistency across concurrent invocations', async () => {
    supabaseGetUserMock.mockResolvedValue({
      data: {
        user: {
          id: 'sb-cache-1',
          email: 'cache@cilmax.com',
          user_metadata: { name: 'Cache User' },
        },
      },
      error: null,
    })
    prismaUserMock.findUnique.mockResolvedValue({
      id: 'db-cache-1',
      email: 'cache@cilmax.com',
      name: 'Cache User',
      createdAt: new Date('2026-01-01'),
    })

    const [u1, u2] = await Promise.all([getCurrentUser(), getCurrentUser()])
    expect(u1).toEqual(u2)
    expect(u1?.email).toBe('cache@cilmax.com')
  })
})
