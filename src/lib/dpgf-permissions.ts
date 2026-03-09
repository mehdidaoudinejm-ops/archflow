import { prisma } from '@/lib/prisma'

/**
 * Vérifie si un utilisateur peut voir l'estimatif architecte (unitPriceArchi, totalArchi).
 * - ARCHITECT : toujours autorisé
 * - COLLABORATOR : seulement si canSeeEstimate === true dans ProjectPermission (module dpgf)
 */
export async function canSeeEstimate(
  projectId: string,
  userId: string,
  role: string
): Promise<boolean> {
  if (role === 'ARCHITECT') return true
  const permission = await prisma.projectPermission.findFirst({
    where: { projectId, userId, module: 'dpgf' },
  })
  if (!permission) return false
  const perms = permission.permissions as Record<string, unknown>
  return perms.canSeeEstimate === true
}
