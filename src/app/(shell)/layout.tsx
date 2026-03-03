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
  // Étape 1 — récupérer session + profil Prisma (opérations faillibles)
  // redirect() est appelé APRÈS le try/catch, jamais dedans
  let redirectTo: string | null = null
  let resolvedUser: Awaited<ReturnType<typeof getUserWithProfile>> = null

  try {
    resolvedUser = await getUserWithProfile()

    if (!resolvedUser) {
      const session = await getSession()

      if (!session) {
        redirectTo = '/login'
      } else {
        const email = session.user.email!

        if (isAdminEmail(email)) {
          redirectTo = '/admin'
        } else {
          // Upsert du profil Prisma pour les users Supabase sans profil
          const localPart = email.split('@')[0] ?? ''
          const baseName = localPart.split('.')[0] ?? ''
          const firstName = baseName
            ? baseName.charAt(0).toUpperCase() + baseName.slice(1)
            : 'Architecte'

          await prisma.user.upsert({
            where: { email },
            create: {
              id: session.user.id,
              email,
              role: 'ARCHITECT',
              firstName,
            },
            update: {},
          })

          resolvedUser = await getUserWithProfile()

          if (!resolvedUser) {
            redirectTo = '/login'
          }
        }
      }
    } else if (resolvedUser.suspended) {
      redirectTo = '/login?suspended=1'
    }
  } catch (error) {
    console.error('[ShellLayout] Erreur critique:', error)
    redirectTo = '/login'
  }

  // Étape 2 — redirections décidées en dehors du try/catch
  if (redirectTo) {
    redirect(redirectTo)
  }

  const user = resolvedUser!

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar
          user={{
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            avatarUrl: user.avatarUrl,
          }}
        />
        <AnnouncementBanner />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
