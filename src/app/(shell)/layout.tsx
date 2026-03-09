import { redirect } from 'next/navigation'
import { getUserWithProfile } from '@/lib/auth'
import { Sidebar } from '@/components/shell/Sidebar'
import { Topbar } from '@/components/shell/Topbar'
import { AnnouncementBanner } from '@/components/shell/AnnouncementBanner'
import { AdminModeBanner } from '@/components/shell/AdminModeBanner'
import { ErrorBoundary } from '@/components/shell/ErrorBoundary'

export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUserWithProfile()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      <Sidebar role={user.role} />
      <div className="flex flex-col flex-1 min-w-0">
        <AdminModeBanner />
        <Topbar
          user={{
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            avatarUrl: user.avatarUrl,
          }}
        />
        <AnnouncementBanner />
        <main className="flex-1 p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
