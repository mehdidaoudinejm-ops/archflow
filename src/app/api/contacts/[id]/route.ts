export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const updateSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().max(100).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  company: z.string().max(150).optional(),
  address: z.string().max(300).optional(),
  notes: z.string().max(2000).optional(),
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])
    if (!user.agencyId) return NextResponse.json({ error: 'Agence introuvable' }, { status: 400 })

    const body: unknown = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 422 })
    }

    // Vérifier que le contact appartient à l'agence
    const existing = await prisma.contact.findFirst({
      where: { id: params.id, agencyId: user.agencyId },
    })
    if (!existing) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    const contact = await prisma.contact.update({
      where: { id: params.id },
      data: {
        ...parsed.data,
        email: parsed.data.email || null,
      },
    })

    return NextResponse.json(contact)
  } catch (error) {
    console.error('[PATCH /api/contacts/[id]]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])
    if (!user.agencyId) return NextResponse.json({ error: 'Agence introuvable' }, { status: 400 })

    const existing = await prisma.contact.findFirst({
      where: { id: params.id, agencyId: user.agencyId },
    })
    if (!existing) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    // Délier les projets avant suppression
    await prisma.project.updateMany({
      where: { clientContactId: params.id },
      data: { clientContactId: null },
    })

    await prisma.contact.delete({ where: { id: params.id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[DELETE /api/contacts/[id]]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
