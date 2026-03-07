import { getSession } from '@/lib/auth'

export class AdminAuthError extends Error {
  constructor(message: string, public status: number) {
    super(message)
    this.name = 'AdminAuthError'
  }
}

export async function requireAdmin() {
  const session = await getSession()
  if (!session) throw new AdminAuthError('Non authentifié', 401)

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)

  if (!adminEmails.includes(session.user.email ?? '')) {
    throw new AdminAuthError('Accès refusé', 403)
  }

  return session
}
