import { NextResponse } from 'next/server'
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const itemSchema = z.object({
  lot: z.string().min(1),
  sousLot: z.string().optional(),
  intitule: z.string().min(1),
  unite: z.string().optional(),
})

const bodySchema = z.object({
  items: z.array(itemSchema).min(1),
  source: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    await requireAdmin()

    const body = bodySchema.parse(await req.json())

    const existing = await prisma.libraryItem.findMany({
      select: { lot: true, intitule: true },
    })
    const existingKeys = new Set(
      existing.map((e) => `${e.lot.toLowerCase()}|||${e.intitule.toLowerCase()}`)
    )

    const toInsert = body.items.filter((item) => {
      const key = `${item.lot.toLowerCase()}|||${item.intitule.toLowerCase()}`
      return !existingKeys.has(key)
    })

    if (toInsert.length > 0) {
      await prisma.libraryItem.createMany({
        data: toInsert.map((item) => ({
          lot: item.lot,
          sousLot: item.sousLot ?? null,
          intitule: item.intitule,
          unite: item.unite ?? null,
          source: body.source ?? null,
          validated: false,
        })),
      })
    }

    return NextResponse.json({
      imported: toInsert.length,
      duplicates: body.items.length - toInsert.length,
    })
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('[POST /api/admin/library/import]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
