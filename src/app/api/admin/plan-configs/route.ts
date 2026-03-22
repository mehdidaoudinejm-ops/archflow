import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { invalidatePlanConfigCache, DEFAULT_PLAN_CONFIGS } from '@/lib/project-limits'

export const dynamic = 'force-dynamic'

const PLANS = ['SOLO', 'STUDIO', 'AGENCY'] as const

const patchSchema = z.object({
  plan:              z.enum(PLANS),
  collaboratorLimit: z.number().int().min(0).max(999),
  aiImportLimit:     z.number().int().min(0).max(9999),
  price:             z.number().min(0),
  label:             z.string().min(1).max(50),
  description:       z.string().max(200),
  features:          z.array(z.string().min(1).max(100)).max(20),
})

// GET — retourne les configs actuelles (DB ou defaults)
export async function GET() {
  try {
    await requireRole(['ADMIN'])

    const rows = await prisma.planConfig.findMany()
    const rowMap = new Map(rows.map((r) => [r.plan, r]))

    const configs = PLANS.map((plan) => {
      const row = rowMap.get(plan)
      const def = DEFAULT_PLAN_CONFIGS[plan]
      return {
        plan,
        collaboratorLimit: row?.collaboratorLimit ?? def.collaboratorLimit,
        aiImportLimit:     row?.aiImportLimit     ?? def.aiImportLimit,
        price:             row?.price             ?? def.price,
        label:             row?.label             ?? def.label,
        description:       row?.description       ?? def.description,
        features:          row ? (Array.isArray(row.features) ? row.features as string[] : def.features) : def.features,
      }
    })

    return NextResponse.json(configs)
  } catch (error) {
    console.error('[GET /api/admin/plan-configs]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH — met à jour une config de plan
export async function PATCH(req: Request) {
  try {
    await requireRole(['ADMIN'])

    const body: unknown = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 422 })
    }

    const { plan, ...data } = parsed.data

    const config = await prisma.planConfig.upsert({
      where:  { plan },
      create: { plan, ...data },
      update: data,
    })

    // Invalider le cache pour que les nouvelles limites soient appliquées immédiatement
    invalidatePlanConfigCache()

    return NextResponse.json(config)
  } catch (error) {
    console.error('[PATCH /api/admin/plan-configs]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
