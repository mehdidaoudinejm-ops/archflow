/**
 * Shared helpers for keeping DPGF post/sublot numbering sequential and unique.
 *
 * All helpers accept a Prisma transaction client so they can be composed inside
 * a single $transaction call without extra round-trips.
 */

import type { PrismaClient } from '@prisma/client'

// Prisma transaction client type (Prisma 5 compatible)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

export function computeRef(lotNumber: number, position: number, sublotNumber?: string): string {
  const ln = lotNumber.toString().padStart(2, '0')
  const pn = position.toString().padStart(2, '0')
  return sublotNumber ? `${ln}.${sublotNumber}.${pn}` : `${ln}.${pn}`
}

/**
 * Renumber all posts in a container (lot + optional sublot) sequentially starting at 1.
 * Updates both `position` and `ref`.
 */
export async function renumberContainerPosts(
  tx: TxClient,
  lotId: string,
  sublotId: string | null,
  lotNumber: number,
  sublotNumber: string | undefined
): Promise<void> {
  const posts = await tx.post.findMany({
    where: { lotId, sublotId: sublotId ?? null },
    orderBy: { position: 'asc' },
    select: { id: true },
  })
  await Promise.all(
    posts.map((p, i) => {
      const pos = i + 1
      return tx.post.update({
        where: { id: p.id },
        data: { position: pos, ref: computeRef(lotNumber, pos, sublotNumber) },
      })
    })
  )
}

/**
 * Renumber all sublots in a lot sequentially (position 0,1,2… / number "01","02"…)
 * and update the refs of every post inside each sublot.
 */
export async function renumberLotSublots(
  tx: TxClient,
  lotId: string,
  lotNumber: number
): Promise<void> {
  const sublots = await tx.subLot.findMany({
    where: { lotId },
    orderBy: { position: 'asc' },
    select: { id: true },
  })

  // Step 1 — renumber sublots
  await Promise.all(
    sublots.map((sl, i) =>
      tx.subLot.update({
        where: { id: sl.id },
        data: { position: i, number: (i + 1).toString().padStart(2, '0') },
      })
    )
  )

  // Step 2 — update post refs with the new sublot numbers
  for (let i = 0; i < sublots.length; i++) {
    const newNumber = (i + 1).toString().padStart(2, '0')
    await renumberContainerPosts(tx, lotId, sublots[i].id, lotNumber, newNumber)
  }
}

/**
 * Renumber ALL posts in a lot (direct + in every sublot) when the lot's own number changes.
 */
export async function renumberLotAllPosts(
  tx: TxClient,
  lotId: string,
  lotNumber: number
): Promise<void> {
  // Direct posts
  await renumberContainerPosts(tx, lotId, null, lotNumber, undefined)

  // Posts inside sublots
  const sublots = await tx.subLot.findMany({
    where: { lotId },
    orderBy: { position: 'asc' },
    select: { id: true, number: true },
  })
  for (const sl of sublots) {
    await renumberContainerPosts(tx, lotId, sl.id, lotNumber, sl.number)
  }
}
