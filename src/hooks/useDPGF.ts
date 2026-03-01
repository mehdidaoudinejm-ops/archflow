'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DPGFWithLots, CreatePostInput } from '@/types'

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

  // ── Mutations lots ───────────────────────────────────

  const addLot = useCallback(
    async (name: string) => {
      const res = await fetch(`/api/dpgf/${dpgfId}/lots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error('Erreur lors de la création du lot')
      await fetchDPGF()
    },
    [dpgfId, fetchDPGF]
  )

  const updateLot = useCallback(
    async (lotId: string, data: { name?: string; position?: number }) => {
      const res = await fetch(`/api/dpgf/${dpgfId}/lots/${lotId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Erreur lors de la mise à jour du lot')
      await fetchDPGF()
    },
    [dpgfId, fetchDPGF]
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
      await fetchDPGF()
    },
    [dpgfId, fetchDPGF]
  )

  const reorderLots = useCallback(
    async (items: { lotId: string; position: number }[]) => {
      const res = await fetch(`/api/dpgf/${dpgfId}/lots/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items),
      })
      if (!res.ok) throw new Error('Erreur lors du réordonnancement des lots')
      await fetchDPGF()
    },
    [dpgfId, fetchDPGF]
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
      await fetchDPGF()
    },
    [dpgfId, fetchDPGF]
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
      await fetchDPGF()
    },
    [dpgfId, fetchDPGF]
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
  }
}
