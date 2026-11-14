import { DashboardLayout as DashboardLayoutComponent } from '@/components/layout/dashboard-layout'
import { getCurrentUser } from '@/modules/auth/auth.actions'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  if (!user && process.env.NODE_ENV !== 'development') {
    redirect('/login')
  }

  const effectiveUser = user || {
    id: 'dev-user',
    name: 'Salung Prastyo',
    email: 'salung.prastyo@sparkpixel.com',
  }

  return <DashboardLayoutComponent user={effectiveUser}>{children}</DashboardLayoutComponent>
}
