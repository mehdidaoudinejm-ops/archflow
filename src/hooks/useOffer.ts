'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export interface OfferPostData {
  unitPrice: number | null
  qtyCompany: number | null
  qtyMotive: string | null
  comment: string | null
  isVariant: boolean
  variantDescription: string | null
}

const EMPTY_POST: OfferPostData = {
  unitPrice: null,
  qtyCompany: null,
  qtyMotive: null,
  comment: null,
  isVariant: false,
  variantDescription: null,
}

interface InitialOfferPost extends OfferPostData {
  postId: string
}

interface InitialOffer {
  id: string
  submittedAt: string | null
  isComplete: boolean
  lotVatRates: Record<string, number> | null
  offerPosts: InitialOfferPost[]
}

interface UseOfferOptions {
  aoId: string
  initialOffer: InitialOffer | null
  token: string | null
}

export function useOffer({ aoId, initialOffer, token }: UseOfferOptions) {
  const [posts, setPosts] = useState<Map<string, OfferPostData>>(() => {
    const map = new Map<string, OfferPostData>()
    initialOffer?.offerPosts.forEach((p) => {
      map.set(p.postId, {
        unitPrice: p.unitPrice,
        qtyCompany: p.qtyCompany,
        qtyMotive: p.qtyMotive,
        comment: p.comment,
        isVariant: p.isVariant,
        variantDescription: p.variantDescription,
      })
    })
    return map
  })

  const [lotVatRates, setLotVatRates] = useState<Record<string, number>>(
    initialOffer?.lotVatRates ?? {}
  )
  const lotVatRatesRef = useRef(lotVatRates)
  useEffect(() => { lotVatRatesRef.current = lotVatRates }, [lotVatRates])

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [isSubmitted, setIsSubmitted] = useState(initialOffer?.isComplete ?? false)
  const [submittedAt, setSubmittedAt] = useState<string | null>(initialOffer?.submittedAt ?? null)

  // Always points to latest posts — fixes stale closure bug
  const postsRef = useRef(posts)
  useEffect(() => { postsRef.current = posts }, [posts])

  const hasUnsavedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { 'X-Portal-Token': token } : {}),
  }

  // Warn before page close if unsaved changes
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (hasUnsavedRef.current) {
        e.preventDefault()
        e.returnValue = 'Vous avez des modifications non sauvegardées. Quitter quand même ?'
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  // Autosave every 30s if unsaved
  useEffect(() => {
    const interval = setInterval(() => {
      if (hasUnsavedRef.current) void saveNow()
    }, 30_000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aoId, token])

  async function saveNow() {
    setSaveStatus('saving')
    const postsArray = Array.from(postsRef.current.entries()).map(([postId, data]) => ({
      postId,
      ...data,
    }))

    try {
      const res = await fetch(`/api/portal/${aoId}/offer`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ posts: postsArray, lotVatRates: lotVatRatesRef.current }),
      })
      if (res.ok) {
        setSaveStatus('saved')
        hasUnsavedRef.current = false
      } else {
        setSaveStatus('unsaved')
      }
    } catch {
      setSaveStatus('unsaved')
    }
  }

  const updatePost = useCallback(
    (postId: string, data: Partial<OfferPostData>) => {
      setPosts((prev) => {
        const next = new Map(prev)
        next.set(postId, { ...(prev.get(postId) ?? EMPTY_POST), ...data })
        return next
      })

      setSaveStatus('unsaved')
      hasUnsavedRef.current = true

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => { void saveNow() }, 3000)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [aoId, token]
  )

  const updateLotVatRate = useCallback(
    (lotId: string, rate: number) => {
      setLotVatRates((prev) => {
        const next = { ...prev, [lotId]: rate }
        lotVatRatesRef.current = next
        return next
      })
      setSaveStatus('unsaved')
      hasUnsavedRef.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => { void saveNow() }, 3000)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [aoId, token]
  )

  async function submit(
    allPostIds: string[]
  ): Promise<{ success: boolean; error?: string; details?: string[] }> {
    const postsArray = allPostIds.map((postId) => ({
      postId,
      ...(postsRef.current.get(postId) ?? EMPTY_POST),
    }))

    try {
      const res = await fetch(`/api/portal/${aoId}/offer`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ posts: postsArray, lotVatRates: lotVatRatesRef.current }),
      })

      if (res.ok) {
        setIsSubmitted(true)
        setSubmittedAt(new Date().toISOString())
        hasUnsavedRef.current = false
        return { success: true }
      }

      const data = await res.json() as { error?: string; details?: string[] }
      return { success: false, error: data.error, details: data.details }
    } catch {
      return { success: false, error: 'Erreur réseau' }
    }
  }

  return { posts, updatePost, lotVatRates, updateLotVatRate, saveStatus, save: saveNow, submit, isSubmitted, submittedAt }
}
