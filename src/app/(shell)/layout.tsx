import { redirect } from 'next/navigation'
import { getUserWithProfile, getSession } from '@/lib/auth'
import { isAdminEmail, bootstrapRegularUser } from '@/lib/admin-auth'
import { Sidebar } from '@/components/shell/Sidebar'
import { Topbar } from '@/components/shell/Topbar'
import { AnnouncementBanner } from '@/components/shell/AnnouncementBanner'

export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    let user = await getUserWithProfile()

    if (!user) {
      const session = await getSession()

      // Pas de session Supabase → login
      if (!session) {
        redirect('/login')
      }

      const email = session.user.email!

      // Admin sans profil Prisma → /admin s'en charge (bootstrapAdminUser)
      if (isAdminEmail(email)) {
        redirect('/admin')
      }

      // Utilisateur régulier avec session Supabase mais sans profil Prisma
      // → créer automatiquement le profil (ex: compte créé hors du flux waitlist)
      await bootstrapRegularUser(email, session.user.user_metadata as Record<string, unknown>)
      user = await getUserWithProfile()

      if (!user) {
        redirect('/login')
      }
    }

    if (user!.suspended) {
      redirect('/login?suspended=1')
    }

    return (
      <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <Topbar
            user={{
              firstName: user!.firstName,
              lastName: user!.lastName,
              email: user!.email,
              avatarUrl: user!.avatarUrl,
            }}
          />
          <AnnouncementBanner />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    )
  } catch (error) {
    console.error('[ShellLayout] Erreur critique:', error)
    redirect('/login')
  }
}
