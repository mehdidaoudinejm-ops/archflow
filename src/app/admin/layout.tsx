export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import AdminNav from './AdminNav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)

  if (!adminEmails.includes(session.user.email ?? '')) {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <AdminNav />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
