'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DPGFWithLots, LotWithChildren, CreatePostInput } from '@/types'
import type { Post } from '@prisma/client'

export function useDPGF(dpgfId: string) {
  const [dpgf, setDpgf] = useState<DPGFWithLots | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDPGF = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch(`/api/dpgf/${dpgfId}`)
      if (!res.ok) throw new Error('Erreur lors du chargement de la DPGF')
      const data: DPGFWithLots = await res.json() as DPGFWithLots
      setDpgf(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }, [dpgfId])

  useEffect(() => {
    fetchDPGF()
  }, [fetchDPGF])

  // ── Helpers d'update local ───────────────────────────

  const applyPostUpdate = useCallback((postId: string, updated: Post) => {
    setDpgf((prev) => {
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
    })
  }, [])

  const applyPostAdd = useCallback((lotId: string, newPost: Post) => {
    setDpgf((prev) => {
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
    })
  }, [])

  const applyPostRemove = useCallback((postId: string) => {
    setDpgf((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        lots: prev.lots.map((lot) => ({
          ...lot,
          sublots: lot.sublots.map((sl) => ({ ...sl, posts: sl.posts.filter((p) => p.id !== postId) })),
          posts: lot.posts.filter((p) => p.id !== postId),
        })),
      }
    })
  }, [])

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
      setDpgf((prev) =>
        prev ? { ...prev, lots: [...prev.lots, { ...newLot, sublots: [], posts: [] }] } : prev
      )
    },
    [dpgfId]
  )

  const updateLot = useCallback(
    async (lotId: string, data: { name?: string; position?: number }) => {
      const res = await fetch(`/api/dpgf/${dpgfId}/lots/${lotId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Erreur lors de la mise à jour du lot')
      const updated = await res.json() as LotWithChildren
      setDpgf((prev) =>
        prev
          ? { ...prev, lots: prev.lots.map((l) => (l.id === lotId ? { ...l, ...updated } : l)) }
          : prev
      )
    },
    [dpgfId]
  )

  const deleteLot = useCallback(
    async (lotId: string) => {
      const res = await fetch(`/api/dpgf/${dpgfId}/lots/${lotId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Erreur lors de la suppression du lot')
      }
      setDpgf((prev) =>
        prev ? { ...prev, lots: prev.lots.filter((l) => l.id !== lotId) } : prev
      )
    },
    [dpgfId]
  )

  const reorderLots = useCallback(
    async (items: { lotId: string; position: number }[]) => {
      const res = await fetch(`/api/dpgf/${dpgfId}/lots/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items),
      })
      if (!res.ok) throw new Error('Erreur lors du réordonnancement des lots')
      setDpgf((prev) => {
        if (!prev) return prev
        const posMap = new Map(items.map(({ lotId, position }) => [lotId, position]))
        const reordered = prev.lots
          .map((l) => ({ ...l, position: posMap.get(l.id) ?? l.position }))
          .sort((a, b) => a.position - b.position)
        return { ...prev, lots: reordered }
      })
    },
    [dpgfId]
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
      // Structure change — refetch pour cohérence
      await fetchDPGF()
    },
    [dpgfId, fetchDPGF]
  )

  const updateSubLot = useCallback(
    async (lotId: string, sublotId: string, data: { number?: string; name?: string }) => {
      const res = await fetch(`/api/dpgf/${dpgfId}/lots/${lotId}/sublots/${sublotId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Erreur lors de la mise à jour du sous-lot')
      await fetchDPGF()
    },
    [dpgfId, fetchDPGF]
  )

  const deleteSubLot = useCallback(
    async (lotId: string, sublotId: string) => {
      const res = await fetch(`/api/dpgf/${dpgfId}/lots/${lotId}/sublots/${sublotId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Erreur lors de la suppression du sous-lot')
      }
      await fetchDPGF()
    },
    [dpgfId, fetchDPGF]
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
      const res = await fetch(`/api/dpgf/${dpgfId}/lots/${lotId}/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Erreur lors de la mise à jour du poste')
      const updated = await res.json() as Post
      applyPostUpdate(postId, updated)
    },
    [dpgfId, applyPostUpdate]
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
      // Refetch to get updated structure + refs
      await fetchDPGF()
    },
    [dpgfId, fetchDPGF]
  )

  const moveSublot = useCallback(
    async (sublotId: string, targetLotId: string) => {
      const res = await fetch(`/api/dpgf/${dpgfId}/sublots/${sublotId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetLotId }),
      })
      if (!res.ok) throw new Error('Erreur lors du déplacement du sous-lot')
      await fetchDPGF()
    },
    [dpgfId, fetchDPGF]
  )

  return {
    dpgf,
    isLoading,
    error,
    refresh: fetchDPGF,
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
