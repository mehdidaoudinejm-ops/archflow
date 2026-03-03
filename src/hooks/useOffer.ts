'use client'

import { useState, useRef, useCallback } from 'react'

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

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [isSubmitted, setIsSubmitted] = useState(initialOffer?.isComplete ?? false)
  const [submittedAt, setSubmittedAt] = useState<string | null>(initialOffer?.submittedAt ?? null)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { 'X-Portal-Token': token } : {}),
  }

  const updatePost = useCallback(
    (postId: string, data: Partial<OfferPostData>) => {
      setPosts((prev) => {
        const next = new Map(prev)
        next.set(postId, { ...(prev.get(postId) ?? EMPTY_POST), ...data })
        return next
      })

      setSaveStatus('unsaved')

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(async () => {
        await save()
      }, 3000)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [aoId, token]
  )

  async function save() {
    setSaveStatus('saving')
    const postsArray = Array.from(posts.entries()).map(([postId, data]) => ({
      postId,
      ...data,
    }))

    try {
      await fetch(`/api/portal/${aoId}/offer`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ posts: postsArray }),
      })
      setSaveStatus('saved')
    } catch {
      setSaveStatus('unsaved')
    }
  }

  async function submit(
    allPostIds: string[]
  ): Promise<{ success: boolean; error?: string; details?: string[] }> {
    const postsArray = allPostIds.map((postId) => ({
      postId,
      ...(posts.get(postId) ?? EMPTY_POST),
    }))

    try {
      const res = await fetch(`/api/portal/${aoId}/offer`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ posts: postsArray }),
      })

      if (res.ok) {
        setIsSubmitted(true)
        setSubmittedAt(new Date().toISOString())
        return { success: true }
      }

      const data = await res.json() as { error?: string; details?: string[] }
      return { success: false, error: data.error, details: data.details }
    } catch {
      return { success: false, error: 'Erreur réseau' }
    }
  }

  return { posts, updatePost, saveStatus, save, submit, isSubmitted, submittedAt }
}
