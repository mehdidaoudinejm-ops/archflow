import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.libraryItem.update({
      where: { id: params.id },
      data: { usageCount: { increment: 1 } },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
