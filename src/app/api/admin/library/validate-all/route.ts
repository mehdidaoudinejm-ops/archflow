import { NextResponse } from 'next/server'
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function PATCH() {
  try {
    await requireAdmin()
    const result = await prisma.libraryItem.updateMany({
      where: { validated: false },
      data: { validated: true },
    })
    return NextResponse.json({ updated: result.count })
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('[PATCH /api/admin/library/validate-all]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
