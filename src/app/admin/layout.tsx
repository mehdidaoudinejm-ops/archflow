import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import { AdminShell } from '@/components/admin/AdminShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin()

  if (!session) {
    redirect('/dashboard')
  }

  return (
    <AdminShell adminEmail={session.user.email!}>
      {children}
    </AdminShell>
  )
}
