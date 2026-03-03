import { redirect } from 'next/navigation'
import { requireAdmin, bootstrapAdminUser } from '@/lib/admin-auth'
import { AdminShell } from '@/components/admin/AdminShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    const session = await requireAdmin()

    if (!session) {
      redirect('/login')
    }

    // Créer le profil Prisma si absent (premier accès admin)
    await bootstrapAdminUser(session.user.email!)

    return (
      <AdminShell adminEmail={session.user.email!}>
        {children}
      </AdminShell>
    )
  } catch (error) {
    console.error('[AdminLayout] Erreur critique:', error)
    redirect('/login')
  }
}
