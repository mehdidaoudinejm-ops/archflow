'use client'

import { useCallback } from 'react'
import useSWR from 'swr'
import type { DPGFWithLots, LotWithChildren, CreatePostInput } from '@/types'
import type { Post } from '@prisma/client'

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
      fallbackData,           // use server-side data on first render — no client fetch needed
      revalidateOnMount: !fallbackData, // skip refetch if server already provided data
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 min — avoid re-fetching on quick back-navigations
    }
  )

  const error = swrError
    ? swrError instanceof Error ? swrError.message : 'Erreur inconnue'
    : null

  // ── Helpers d'update local (optimistic) ─────────────

  const applyPostUpdate = useCallback((postId: string, updated: Post) => {
    void mutate((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        lots: prev.lots.map((lot) => ({
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
      if (!prev) return prev
      return {
        ...prev,
        lots: prev.lots.map((lot) => {
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
      if (!prev) return prev
      return {
        ...prev,
        lots: prev.lots.map((lot) => ({
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
      const res = await fetch(`/api/dpgf/${dpgfId}/lots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error('Erreur lors de la création du lot')
      const newLot = await res.json() as LotWithChildren
      void mutate((prev) =>
        prev ? { ...prev, lots: [...prev.lots, { ...newLot, sublots: [], posts: [] }] } : prev,
        { revalidate: false }
      )
    },
    [dpgfId, mutate]
  )

  const updateLot = useCallback(
    async (lotId: string, data: { name?: string; position?: number }) => {
      // Optimistic: update cache immediately
      void mutate(
        (prev) => prev ? { ...prev, lots: prev.lots.map((l) => (l.id === lotId ? { ...l, ...data } : l)) } : prev,
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
        await mutate() // revert on error
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
        (prev) => prev ? { ...prev, lots: prev.lots.filter((l) => l.id !== lotId) } : prev,
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
        if (!prev) return prev
        const posMap = new Map(items.map(({ lotId, position }) => [lotId, position]))
        const reordered = prev.lots
          .map((l) => ({ ...l, position: posMap.get(l.id) ?? l.position }))
          .sort((a, b) => a.position - b.position)
        return { ...prev, lots: reordered }
      }, { revalidate: false })
    },
    [dpgfId, mutate]
  )

  // ── Mutations sous-lots ──────────────────────────────

  const addSubLot = useCallback(
    async (lotId: string, data: { number: string; name: string }) => {
      const res = await fetch(`/api/dpgf/${dpgfId}/lots/${lotId}/sublots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Erreur lors de la création du sous-lot')
      const newSublot = await res.json() as { id: string; lotId: string; number: string; name: string; position: number }
      void mutate((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          lots: prev.lots.map((lot) =>
            lot.id !== lotId ? lot : {
              ...lot,
              sublots: [...lot.sublots, { ...newSublot, posts: [] }],
            }
          ),
        }
      }, { revalidate: false })
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
        if (!prev) return prev
        return {
          ...prev,
          lots: prev.lots.map((lot) =>
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
        if (!prev) return prev
        return {
          ...prev,
          lots: prev.lots.map((lot) =>
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
      const res = await fetch(`/api/dpgf/${dpgfId}/lots/${lotId}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Erreur lors de la création du poste')
      const newPost = await res.json() as Post
      applyPostAdd(lotId, newPost)
    },
    [dpgfId, applyPostAdd]
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
      // Optimistic: apply to cache immediately so UI reflects change with zero delay
      applyPostUpdate(postId, data as Post)
      try {
        const res = await fetch(`/api/dpgf/${dpgfId}/lots/${lotId}/posts/${postId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error('Erreur lors de la mise à jour du poste')
        const confirmed = await res.json() as Post
        // Confirm with server values (e.g. computed ref)
        applyPostUpdate(postId, confirmed)
      } catch (err) {
        await mutate() // revert on error
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
