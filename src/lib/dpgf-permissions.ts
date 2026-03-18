import { prisma } from '@/lib/prisma'

/**
 * Vérifie si un utilisateur peut voir l'estimatif architecte (unitPriceArchi, totalArchi).
 * - ARCHITECT : toujours autorisé
 * - COLLABORATOR : seulement si canSeeEstimate === true dans ProjectPermission (module dpgf)
 *
 * @param prefetchedPermission - Si déjà chargé dans la query principale, évite un round-trip DB.
 */
export async function canSeeEstimate(
  projectId: string,
  userId: string,
  role: string,
  prefetchedPermission?: { permissions: unknown } | null
): Promise<boolean> {
  if (role === 'ARCHITECT') return true

  const permission = prefetchedPermission !== undefined
    ? prefetchedPermission
    : await prisma.projectPermission.findFirst({
        where: { projectId, userId, module: 'dpgf' },
      })

  if (!permission) return false
  const perms = permission.permissions as Record<string, unknown>
  return perms.canSeeEstimate === true
}
