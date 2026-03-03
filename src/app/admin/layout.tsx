import { redirect } from 'next/navigation'
import { requireAdmin, bootstrapAdminUser } from '@/lib/admin-auth'
import { AdminShell } from '@/components/admin/AdminShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let adminEmail: string | null = null

  try {
    const session = await requireAdmin()
    if (session) {
      await bootstrapAdminUser(session.user.email!)
      adminEmail = session.user.email!
    }
  } catch (error) {
    console.error('[AdminLayout] Erreur critique:', error)
  }

  // redirect() appelé en dehors du try/catch
  if (!adminEmail) {
    redirect('/login')
  }

  return (
    <AdminShell adminEmail={adminEmail!}>
      {children}
    </AdminShell>
  )
}
