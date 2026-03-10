export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { computeDpgfDiff, type SnapshotJson, type LotSnapshot } from '@/lib/dpgf-diff'

export async function POST(
  _req: Request,
  { params }: { params: { aoId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const ao = await prisma.aO.findUnique({
      where: { id: params.aoId },
      include: {
        dpgf: { include: { project: { select: { agencyId: true, name: true } } } },
        aoCompanies: {
          include: {
            offer: { select: { id: true } },
          },
          where: { status: { not: 'INCOMPLETE' } },
        },
      },
    })

    if (!ao || ao.dpgf.project.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'AO introuvable' }, { status: 404 })
    }

    // Calcul du diff pour le corps de l'email
    let diffSummary = ''
    if (ao.snapshotJson) {
      const lots = await prisma.lot.findMany({
        where: { dpgfId: ao.dpgfId, id: { in: ao.lotIds } },
        orderBy: { position: 'asc' },
        select: {
          id: true, number: true, name: true,
          posts: {
            orderBy: { position: 'asc' },
            select: { id: true, ref: true, title: true, unit: true, qtyArchi: true },
          },
        },
      })
      const currentLots: LotSnapshot[] = lots.map((l) => ({
        id: l.id, number: l.number, name: l.name,
        posts: l.posts.map((p) => ({ id: p.id, ref: p.ref, title: p.title, unit: p.unit, qtyArchi: p.qtyArchi })),
      }))
      const diff = computeDpgfDiff(ao.snapshotJson as unknown as SnapshotJson, currentLots)
      const parts: string[] = []
      if (diff.addedCount > 0) parts.push(`<li>${diff.addedCount} poste(s) ajouté(s)</li>`)
      if (diff.modifiedCount > 0) parts.push(`<li>${diff.modifiedCount} poste(s) modifié(s)</li>`)
      if (diff.removedCount > 0) parts.push(`<li>${diff.removedCount} poste(s) supprimé(s)</li>`)
      if (parts.length > 0) diffSummary = `<ul style="margin:8px 0 0 16px;padding:0;color:#4B4B45;">${parts.join('')}</ul>`
    }

    // Récupérer les emails des entreprises invitées
    const companyUserIds = ao.aoCompanies.map((c) => c.companyUserId)
    const companyUsers = await prisma.user.findMany({
      where: { id: { in: companyUserIds } },
      select: { email: true },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://archflow.fr'
    const portalUrl = `${appUrl}/portal/${ao.id}`

    await Promise.all(
      companyUsers.map((cu) =>
        sendEmail({
          to: cu.email,
          subject: `Modification du dossier — ${ao.name}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1A1A18;">
              <p style="font-size:15px;font-weight:600;margin-bottom:8px;">Mise à jour du dossier de consultation</p>
              <p style="font-size:14px;color:#4B4B45;margin-bottom:16px;">
                L'architecte a apporté des modifications au dossier <strong>${ao.name}</strong>
                (projet : ${ao.dpgf.project.name}).
              </p>
              ${diffSummary ? `<div style="background:#FEF3E2;border:1px solid #B45309;border-radius:8px;padding:12px 16px;margin-bottom:16px;">
                <p style="font-size:13px;font-weight:600;color:#B45309;margin:0 0 6px;">Modifications :</p>
                ${diffSummary}
              </div>` : ''}
              <p style="font-size:14px;color:#4B4B45;margin-bottom:20px;">
                Connectez-vous au portail pour prendre connaissance de ces changements et mettre à jour votre offre si nécessaire.
              </p>
              <a href="${portalUrl}" style="display:inline-block;background:#1F6B44;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">
                Accéder au dossier
              </a>
              <p style="font-size:12px;color:#9B9B94;margin-top:24px;">
                Date limite de remise des offres : ${new Date(ao.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          `,
        }).catch((e) => console.error('[notify-amendment] email error:', e))
      )
    )

    return NextResponse.json({ sent: companyUsers.length }, { status: 200 })
  } catch (error) {
    console.error('[POST /api/ao/[aoId]/notify-amendment]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
