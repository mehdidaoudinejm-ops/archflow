import { getSession } from '@/lib/auth'

export function isAdminEmail(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean)
  return adminEmails.includes(email)
}

export async function requireAdmin() {
  const session = await getSession()
  if (!session || !isAdminEmail(session.user.email!)) {
    return null
  }
  return session
}
