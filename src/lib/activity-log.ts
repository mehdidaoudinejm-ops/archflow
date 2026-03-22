import { prisma } from '@/lib/prisma'

interface LogActivityOptions {
  userId: string
  module: string
  action: string
  projectId?: string
  metadata?: Record<string, unknown>
}

/**
 * Enregistre une action sensible dans ActivityLog.
 * Ne lève pas d'erreur — un échec de log ne doit jamais bloquer l'opération principale.
 */
export async function logActivity(opts: LogActivityOptions): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        userId:    opts.userId,
        module:    opts.module,
        action:    opts.action,
        projectId: opts.projectId ?? null,
        metadata:  opts.metadata ? JSON.parse(JSON.stringify(opts.metadata)) : undefined,
      },
    })
  } catch (err) {
    console.error('[logActivity] Échec de l\'enregistrement de l\'audit log:', err instanceof Error ? err.message : err)
  }
}
