import { NextResponse } from 'next/server'
import { requireRole, AuthError } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(['ARCHITECT', 'COLLABORATOR'])
    await prisma.libraryItem.update({
      where: { id: params.id },
      data: { usageCount: { increment: 1 } },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ ok: false })
  }
}
