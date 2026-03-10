export type DiffStatus = 'added' | 'removed' | 'modified' | 'unchanged'

export interface PostSnapshot {
  id: string
  ref: string
  title: string
  unit: string
  qtyArchi: number | null
}

export interface LotSnapshot {
  id: string
  number: number
  name: string
  posts: PostSnapshot[]
}

export interface SnapshotJson {
  lots: LotSnapshot[]
}

export interface RemovedPost {
  id: string
  ref: string
  title: string
  lotName: string
}

export interface DpgfDiff {
  /** postId → statut du diff */
  postDiffs: Record<string, DiffStatus>
  /** Postes supprimés (absents du DPGF actuel) */
  removedPosts: RemovedPost[]
  addedCount: number
  modifiedCount: number
  removedCount: number
  total: number
}

export function computeDpgfDiff(
  snapshot: SnapshotJson,
  currentLots: LotSnapshot[]
): DpgfDiff {
  const snapshotPostMap = new Map<string, PostSnapshot & { lotName: string }>()
  for (const lot of snapshot.lots) {
    for (const post of lot.posts) {
      snapshotPostMap.set(post.id, { ...post, lotName: lot.name })
    }
  }

  const currentPostMap = new Map<string, PostSnapshot>()
  for (const lot of currentLots) {
    for (const post of lot.posts) {
      currentPostMap.set(post.id, post)
    }
  }

  const postDiffs: Record<string, DiffStatus> = {}
  const removedPosts: RemovedPost[] = []
  let addedCount = 0
  let modifiedCount = 0
  let removedCount = 0

  // Postes dans le snapshot → unchanged, modified ou removed
  snapshotPostMap.forEach((snap, id) => {
    const curr = currentPostMap.get(id)
    if (!curr) {
      postDiffs[id] = 'removed'
      removedPosts.push({ id, ref: snap.ref, title: snap.title, lotName: snap.lotName })
      removedCount++
    } else {
      const changed =
        curr.title !== snap.title ||
        curr.unit !== snap.unit ||
        curr.qtyArchi !== snap.qtyArchi
      if (changed) {
        postDiffs[id] = 'modified'
        modifiedCount++
      } else {
        postDiffs[id] = 'unchanged'
      }
    }
  })

  // Postes dans le DPGF actuel mais pas dans le snapshot → added
  currentPostMap.forEach((_, id) => {
    if (!snapshotPostMap.has(id)) {
      postDiffs[id] = 'added'
      addedCount++
    }
  })

  return {
    postDiffs,
    removedPosts,
    addedCount,
    modifiedCount,
    removedCount,
    total: addedCount + modifiedCount + removedCount,
  }
}
