export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const createSchema = z.object({
  type: z.enum(['CLIENT', 'ENTREPRISE']),
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  company: z.string().max(150).optional(),
  address: z.string().max(300).optional(),
  notes: z.string().max(2000).optional(),
})

export async function GET(req: Request) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])
    if (!user.agencyId) return NextResponse.json({ error: 'Agence introuvable' }, { status: 400 })

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') // CLIENT | ENTREPRISE | null = all

    const contacts = await prisma.contact.findMany({
      where: {
        agencyId: user.agencyId,
        ...(type === 'CLIENT' || type === 'ENTREPRISE' ? { type } : {}),
      },
      orderBy: { firstName: 'asc' },
    })

    return NextResponse.json(contacts)
  } catch (error) {
    console.error('[GET /api/contacts]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])
    if (!user.agencyId) return NextResponse.json({ error: 'Agence introuvable' }, { status: 400 })

    const body: unknown = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 422 })
    }

    const { type, firstName, lastName, email, phone, company, address, notes } = parsed.data

    const contact = await prisma.contact.create({
      data: {
        agencyId: user.agencyId,
        type,
        firstName,
        lastName: lastName ?? null,
        email: email || null,
        phone: phone ?? null,
        company: company ?? null,
        address: address ?? null,
        notes: notes ?? null,
      },
    })

    return NextResponse.json(contact, { status: 201 })
  } catch (error) {
    console.error('[POST /api/contacts]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
