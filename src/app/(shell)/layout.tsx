import { redirect } from 'next/navigation'
import { getUserWithProfile, getSession } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
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

      // Utilisateur Supabase sans profil Prisma :
      // upsert pour créer le profil automatiquement au premier accès.
      // agencyId est nullable — le dashboard gère ce cas proprement.
      const localPart = email.split('@')[0] ?? ''
      const baseName = localPart.split('.')[0] ?? ''
      const firstName = baseName
        ? baseName.charAt(0).toUpperCase() + baseName.slice(1)
        : 'Architecte'

      await prisma.user.upsert({
        where: { email },
        create: {
          id: session.user.id, // UUID Supabase comme identifiant Prisma
          email,
          role: 'ARCHITECT',
          firstName,
        },
        update: {}, // Déjà existant → aucune modification
      })

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
