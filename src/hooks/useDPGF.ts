'use client'

import { useCallback, useRef } from 'react'
import useSWR from 'swr'
import type { DPGFWithLots, LotWithChildren, SubLotWithPosts, CreatePostInput } from '@/types'
import type { Post } from '@prisma/client'

function computeRef(lotNumber: number, position: number, sublotNumber?: string): string {
  const ln = lotNumber.toString().padStart(2, '0')
  const pn = position.toString().padStart(2, '0')
  return sublotNumber ? `${ln}.${sublotNumber}.${pn}` : `${ln}.${pn}`
}

const jsonFetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error('Erreur lors du chargement')
    return r.json()
  })

export function useDPGF(dpgfId: string, fallbackData?: DPGFWithLots) {
  const { data: dpgf, error: swrError, isLoading, mutate } = useSWR<DPGFWithLots>(
    `/api/dpgf/${dpgfId}`,
    jsonFetcher,
    {
      fallbackData,
      revalidateOnMount: !fallbackData,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    }
  )

  // KEY FIX: SWR's mutate(updater) passes prev = undefined when the cache has never
  // been populated by a fetch (i.e. fallbackData was used with revalidateOnMount:false).
  // All updaters use `prev ?? dpgfRef.current` so the first mutation seeds the cache
  // from the server-provided data and all subsequent mutations work correctly.
  const dpgfRef = useRef(dpgf ?? fallbackData)
  dpgfRef.current = dpgf ?? fallbackData

  const error = swrError
    ? swrError instanceof Error ? swrError.message : 'Erreur inconnue'
    : null

  // ── Helpers d'update local (optimistic) ─────────────

  const applyPostUpdate = useCallback((postId: string, updated: Post) => {
    void mutate((prev) => {
      const d = prev ?? dpgfRef.current
      if (!d) return d
      return {
        ...d,
        lots: d.lots.map((lot) => ({
          ...lot,
          sublots: lot.sublots.map((sl) => ({
            ...sl,
            posts: sl.posts.map((p) => (p.id === postId ? { ...p, ...updated } : p)),
          })),
          posts: lot.posts.map((p) => (p.id === postId ? { ...p, ...updated } : p)),
        })),
      }
    }, { revalidate: false })
  }, [mutate])

  const applyPostAdd = useCallback((lotId: string, newPost: Post) => {
    void mutate((prev) => {
      const d = prev ?? dpgfRef.current
      if (!d) return d
      return {
        ...d,
        lots: d.lots.map((lot) => {
          if (lot.id !== lotId) return lot
          if (newPost.sublotId) {
            return {
              ...lot,
              sublots: lot.sublots.map((sl) =>
                sl.id !== newPost.sublotId ? sl : { ...sl, posts: [...sl.posts, newPost] }
              ),
            }
          }
          return { ...lot, posts: [...lot.posts, newPost] }
        }),
      }
    }, { revalidate: false })
  }, [mutate])

  const applyPostRemove = useCallback((postId: string) => {
    void mutate((prev) => {
      const d = prev ?? dpgfRef.current
      if (!d) return d
      return {
        ...d,
        lots: d.lots.map((lot) => ({
          ...lot,
          sublots: lot.sublots.map((sl) => ({ ...sl, posts: sl.posts.filter((p) => p.id !== postId) })),
          posts: lot.posts.filter((p) => p.id !== postId),
        })),
      }
    }, { revalidate: false })
  }, [mutate])

  // ── Mutations lots ───────────────────────────────────

  const addLot = useCallback(
    async (name: string) => {
      const tempId = `temp_lot_${Date.now()}`
      void mutate((prev) => {
        const d = prev ?? dpgfRef.current
        if (!d) return d
        const nextNumber = d.lots.length > 0
          ? Math.max(...d.lots.map((l) => l.number)) + 1
          : 1
        const nextPosition = d.lots.length > 0
          ? Math.max(...d.lots.map((l) => l.position)) + 1
          : 0
        const tempLot: LotWithChildren = {
          id: tempId,
          dpgfId,
          number: nextNumber,
          name,
          position: nextPosition,
          sublots: [],
          posts: [],
        }
        return { ...d, lots: [...d.lots, tempLot] }
      }, { revalidate: false })
      try {
        const res = await fetch(`/api/dpgf/${dpgfId}/lots`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        })
        if (!res.ok) throw new Error('Erreur lors de la création du lot')
        const newLot = await res.json() as LotWithChildren
        void mutate((prev) => {
          const d = prev ?? dpgfRef.current
          if (!d) return d
          return {
            ...d,
            lots: d.lots.map((l) =>
              l.id === tempId ? { ...newLot, sublots: [], posts: [] } : l
            ),
          }
        }, { revalidate: false })
      } catch (err) {
        void mutate((prev) => {
          const d = prev ?? dpgfRef.current
          if (!d) return d
          return { ...d, lots: d.lots.filter((l) => l.id !== tempId) }
        }, { revalidate: false })
        throw err
      }
    },
    [dpgfId, mutate]
  )

  const updateLot = useCallback(
    async (lotId: string, data: { name?: string; position?: number }) => {
      void mutate(
        (prev) => {
          const d = prev ?? dpgfRef.current
          if (!d) return d
          return { ...d, lots: d.lots.map((l) => (l.id === lotId ? { ...l, ...data } : l)) }
        },
        { revalidate: false }
      )
      try {
        const res = await fetch(`/api/dpgf/${dpgfId}/lots/${lotId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error('Erreur lors de la mise à jour du lot')
      } catch (err) {
        await mutate()
        throw err
      }
    },
    [dpgfId, mutate]
  )

  const deleteLot = useCallback(
    async (lotId: string) => {
      const res = await fetch(`/api/dpgf/${dpgfId}/lots/${lotId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Erreur lors de la suppression du lot')
      }
      void mutate(
        (prev) => {
          const d = prev ?? dpgfRef.current
          if (!d) return d
          return { ...d, lots: d.lots.filter((l) => l.id !== lotId) }
        },
        { revalidate: false }
      )
    },
    [dpgfId, mutate]
  )

  const reorderLots = useCallback(
    async (items: { lotId: string; position: number }[]) => {
      const res = await fetch(`/api/dpgf/${dpgfId}/lots/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items),
      })
      if (!res.ok) throw new Error('Erreur lors du réordonnancement des lots')
      void mutate((prev) => {
        const d = prev ?? dpgfRef.current
        if (!d) return d
        const posMap = new Map(items.map(({ lotId, position }) => [lotId, position]))
        const reordered = d.lots
          .map((l) => ({ ...l, position: posMap.get(l.id) ?? l.position }))
          .sort((a, b) => a.position - b.position)
        return { ...d, lots: reordered }
      }, { revalidate: false })
    },
    [dpgfId, mutate]
  )

  // ── Mutations sous-lots ──────────────────────────────

  const addSubLot = useCallback(
    async (lotId: string, data: { number: string; name: string }) => {
      const tempId = `temp_sublot_${Date.now()}`
      void mutate((prev) => {
        const d = prev ?? dpgfRef.current
        if (!d) return d
        return {
          ...d,
          lots: d.lots.map((lot) => {
            if (lot.id !== lotId) return lot
            const nextPosition = lot.sublots.length > 0
              ? Math.max(...lot.sublots.map((s) => s.position)) + 1
              : 0
            const tempSublot: SubLotWithPosts = {
              id: tempId,
              lotId,
              number: data.number,
              name: data.name,
              position: nextPosition,
              posts: [],
            }
            return { ...lot, sublots: [...lot.sublots, tempSublot] }
          }),
        }
      }, { revalidate: false })
      try {
        const res = await fetch(`/api/dpgf/${dpgfId}/lots/${lotId}/sublots`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error('Erreur lors de la création du sous-lot')
        const newSublot = await res.json() as { id: string; lotId: string; number: string; name: string; position: number }
        void mutate((prev) => {
          const d = prev ?? dpgfRef.current
          if (!d) return d
          return {
            ...d,
            lots: d.lots.map((lot) =>
              lot.id !== lotId ? lot : {
                ...lot,
                sublots: lot.sublots.map((sl) =>
                  sl.id === tempId ? { ...newSublot, posts: [] } : sl
                ),
              }
            ),
          }
        }, { revalidate: false })
      } catch (err) {
        void mutate((prev) => {
          const d = prev ?? dpgfRef.current
          if (!d) return d
          return {
            ...d,
            lots: d.lots.map((lot) =>
              lot.id !== lotId ? lot : {
                ...lot,
                sublots: lot.sublots.filter((sl) => sl.id !== tempId),
              }
            ),
          }
        }, { revalidate: false })
        throw err
      }
    },
    [dpgfId, mutate]
  )

  const updateSubLot = useCallback(
    async (lotId: string, sublotId: string, data: { number?: string; name?: string }) => {
      const res = await fetch(`/api/dpgf/${dpgfId}/lots/${lotId}/sublots/${sublotId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Erreur lors de la mise à jour du sous-lot')
      void mutate((prev) => {
        const d = prev ?? dpgfRef.current
        if (!d) return d
        return {
          ...d,
          lots: d.lots.map((lot) =>
            lot.id !== lotId ? lot : {
              ...lot,
              sublots: lot.sublots.map((sl) =>
                sl.id !== sublotId ? sl : { ...sl, ...data }
              ),
            }
          ),
        }
      }, { revalidate: false })
    },
    [dpgfId, mutate]
  )

  const deleteSubLot = useCallback(
    async (lotId: string, sublotId: string) => {
      const res = await fetch(`/api/dpgf/${dpgfId}/lots/${lotId}/sublots/${sublotId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        throw new Error(body.error ?? 'Erreur lors de la suppression du sous-lot')
      }
      void mutate((prev) => {
        const d = prev ?? dpgfRef.current
        if (!d) return d
        return {
          ...d,
          lots: d.lots.map((lot) =>
            lot.id !== lotId ? lot : {
              ...lot,
              sublots: lot.sublots.filter((sl) => sl.id !== sublotId),
            }
          ),
        }
      }, { revalidate: false })
    },
    [dpgfId, mutate]
  )

  // ── Mutations postes ─────────────────────────────────

  const addPost = useCallback(
    async (lotId: string, data: CreatePostInput) => {
      const tempId = `temp_${Date.now()}`
      void mutate((prev) => {
        const d = prev ?? dpgfRef.current
        if (!d) return d
        const lot = d.lots.find((l) => l.id === lotId)
        if (!lot) return d
        const targetPosts = data.sublotId
          ? (lot.sublots.find((s) => s.id === data.sublotId)?.posts ?? [])
          : lot.posts
        const nextPosition = targetPosts.length > 0
          ? Math.max(...targetPosts.map((p) => p.position)) + 1
          : 1
        const sublotNumber = data.sublotId
          ? lot.sublots.find((s) => s.id === data.sublotId)?.number
          : undefined
        const tempPost: Post = {
          id: tempId,
          lotId,
          sublotId: data.sublotId ?? null,
          ref: computeRef(lot.number, nextPosition, sublotNumber),
          title: data.title,
          unit: data.unit ?? 'u',
          qtyArchi: data.qtyArchi ?? null,
          unitPriceArchi: data.unitPriceArchi ?? null,
          isOptional: data.isOptional ?? false,
          commentArchi: data.commentArchi ?? null,
          libraryRefId: data.libraryRefId ?? null,
          position: nextPosition,
        }
        return {
          ...d,
          lots: d.lots.map((l) => {
            if (l.id !== lotId) return l
            if (data.sublotId) {
              return {
                ...l,
                sublots: l.sublots.map((sl) =>
                  sl.id !== data.sublotId ? sl : { ...sl, posts: [...sl.posts, tempPost] }
                ),
              }
            }
            return { ...l, posts: [...l.posts, tempPost] }
          }),
        }
      }, { revalidate: false })
      try {
        const res = await fetch(`/api/dpgf/${dpgfId}/lots/${lotId}/posts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error('Erreur lors de la création du poste')
        const newPost = await res.json() as Post
        void mutate((prev) => {
          const d = prev ?? dpgfRef.current
          if (!d) return d
          const replace = (p: Post) => p.id === tempId ? newPost : p
          return {
            ...d,
            lots: d.lots.map((l) => ({
              ...l,
              sublots: l.sublots.map((sl) => ({ ...sl, posts: sl.posts.map(replace) })),
              posts: l.posts.map(replace),
            })),
          }
        }, { revalidate: false })
      } catch (err) {
        applyPostRemove(tempId)
        throw err
      }
    },
    [dpgfId, mutate, applyPostRemove]
  )

  const updatePost = useCallback(
    async (
      lotId: string,
      postId: string,
      data: {
        title?: string
        unit?: string
        qtyArchi?: number | null
        unitPriceArchi?: number | null
        isOptional?: boolean
        commentArchi?: string | null
        position?: number
      }
    ) => {
      applyPostUpdate(postId, data as Post)
      try {
        const res = await fetch(`/api/dpgf/${dpgfId}/lots/${lotId}/posts/${postId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error('Erreur lors de la mise à jour du poste')
      } catch (err) {
        await mutate()
        throw err
      }
    },
    [dpgfId, mutate, applyPostUpdate]
  )

  const deletePost = useCallback(
    async (lotId: string, postId: string) => {
      const res = await fetch(`/api/dpgf/${dpgfId}/lots/${lotId}/posts/${postId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Erreur lors de la suppression du poste')
      }
      applyPostRemove(postId)
    },
    [dpgfId, applyPostRemove]
  )

  const movePost = useCallback(
    async (postId: string, targetLotId: string, targetSublotId: string | null) => {
      const res = await fetch(`/api/dpgf/${dpgfId}/posts/${postId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetLotId, targetSublotId }),
      })
      if (!res.ok) throw new Error('Erreur lors du déplacement du poste')
      await mutate()
    },
    [dpgfId, mutate]
  )

  const moveSublot = useCallback(
    async (sublotId: string, targetLotId: string) => {
      const res = await fetch(`/api/dpgf/${dpgfId}/sublots/${sublotId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetLotId }),
      })
      if (!res.ok) throw new Error('Erreur lors du déplacement du sous-lot')
      await mutate()
    },
    [dpgfId, mutate]
  )

  return {
    dpgf: dpgf ?? null,
    isLoading,
    error,
    refresh: mutate,
    addLot,
    updateLot,
    deleteLot,
    reorderLots,
    addSubLot,
    updateSubLot,
    deleteSubLot,
    addPost,
    updatePost,
    deletePost,
    movePost,
    moveSublot,
  }
}
