import { prisma } from '@/lib/prisma'

// ── Defaults (fallback si la DB est inaccessible) ─────────────────────────────

export const PROJECT_LIMITS: Record<string, number> = {
  SOLO: Infinity,
  STUDIO: Infinity,
  AGENCY: Infinity,
}

// Valeurs par défaut — utilisées si PlanConfig n'existe pas encore en DB
export const COLLABORATOR_LIMITS: Record<string, number> = {
  SOLO: 0,
  STUDIO: 2,
  AGENCY: 5,
}

export const AI_IMPORT_LIMITS: Record<string, number> = {
  SOLO: 3,
  STUDIO: 6,
  AGENCY: 20,
}

export const DEFAULT_PLAN_CONFIGS = {
  SOLO:   { collaboratorLimit: 0,  aiImportLimit: 3,  price: 0,   label: 'Solo',   description: 'Pour les indépendants',    features: ['1 utilisateur', 'Module DPGF', 'Import IA (3/mois)'] },
  STUDIO: { collaboratorLimit: 2,  aiImportLimit: 6,  price: 49,  label: 'Studio', description: 'Pour les petits cabinets', features: ['3 utilisateurs', 'Module DPGF', 'Import IA (6/mois)', 'Support prioritaire'] },
  AGENCY: { collaboratorLimit: 5,  aiImportLimit: 20, price: 99,  label: 'Agence', description: 'Pour les agences',         features: ['6 utilisateurs', 'Tous les modules', 'Import IA (20/mois)', 'Support dédié'] },
}

// ── Cache mémoire 5 min ───────────────────────────────────────────────────────

interface CachedPlanLimits {
  SOLO:   { collaboratorLimit: number; aiImportLimit: number; price: number; label: string; description: string; features: string[] }
  STUDIO: { collaboratorLimit: number; aiImportLimit: number; price: number; label: string; description: string; features: string[] }
  AGENCY: { collaboratorLimit: number; aiImportLimit: number; price: number; label: string; description: string; features: string[] }
}

let _cache: { data: CachedPlanLimits; expiry: number } | null = null

export function invalidatePlanConfigCache() {
  _cache = null
}

export async function getPlanLimits(): Promise<CachedPlanLimits> {
  if (_cache && Date.now() < _cache.expiry) return _cache.data

  try {
    const rows = await prisma.planConfig.findMany()
    const data: CachedPlanLimits = { ...DEFAULT_PLAN_CONFIGS }

    for (const row of rows) {
      const plan = row.plan as keyof CachedPlanLimits
      if (plan === 'SOLO' || plan === 'STUDIO' || plan === 'AGENCY') {
        data[plan] = {
          collaboratorLimit: row.collaboratorLimit,
          aiImportLimit:     row.aiImportLimit,
          price:             row.price,
          label:             row.label,
          description:       row.description,
          features:          Array.isArray(row.features) ? (row.features as string[]) : [],
        }
      }
    }

    _cache = { data, expiry: Date.now() + 5 * 60 * 1000 }
    return data
  } catch {
    // Fallback sur les valeurs statiques
    return DEFAULT_PLAN_CONFIGS
  }
}
