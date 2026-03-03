'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PortalShell } from '@/components/portal/PortalShell'
import { MessageSquare, CheckCircle2, Clock, Plus, X, Lock, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface QAItem {
  id: string
  title: string
  body: string
  visibility: 'PUBLIC' | 'PRIVATE'
  status: 'PENDING' | 'ANSWERED'
  postRef: string | null
  createdAt: string
  isOwn: boolean
  answer: { body: string; createdAt: string } | null
}

interface Props {
  aoId: string
  aoName: string
  deadline: string
  companyName: string
  aoCompanyId: string
  initialQas: QAItem[]
}

function QuestionsContent({ aoId, aoName, deadline, companyName, initialQas }: Props) {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [qas, setQas] = useState<QAItem[]>(initialQas)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC')
  const [postRef, setPostRef] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return

    setSubmitting(true)
    setFormError(null)

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { 'X-Portal-Token': token } : {}),
      }
      const res = await fetch(`/api/ao/${aoId}/qa`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title: title.trim(), body: body.trim(), visibility, postRef: postRef.trim() || null }),
      })

      const data = await res.json() as QAItem & { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur')

      setQas((prev) => [{ ...data, isOwn: true }, ...prev])
      setTitle('')
      setBody('')
      setPostRef('')
      setVisibility('PUBLIC')
      setShowForm(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSubmitting(false)
    }
  }

  const myQas = qas.filter((q) => q.isOwn)
  const publicQas = qas.filter((q) => !q.isOwn && q.visibility === 'PUBLIC')

  return (
    <PortalShell
      aoId={aoId}
      aoName={aoName}
      deadline={deadline}
      companyName={companyName}
      activeSection="questions"
      progress={0}
      saveStatus="saved"
      isSubmitted={false}
    >
      <div className="p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-xl font-semibold mb-1"
              style={{ fontFamily: '"DM Serif Display", serif', color: 'var(--text)' }}
            >
              Questions & Réponses
            </h1>
            <p className="text-sm" style={{ color: 'var(--text2)' }}>
              Posez vos questions à l&apos;architecte. Les questions publiques sont visibles par toutes les entreprises.
            </p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            style={{ background: 'var(--green-btn)', color: '#fff', border: 'none', flexShrink: 0 }}
          >
            {showForm ? <X size={15} className="mr-1.5" /> : <Plus size={15} className="mr-1.5" />}
            {showForm ? 'Annuler' : 'Poser une question'}
          </Button>
        </div>

        {/* Formulaire de question */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mb-6 p-5 rounded-[var(--radius-lg)] space-y-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
          >
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              Nouvelle question
            </h2>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--text2)' }}>
                Titre *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex : Précision sur le poste peinture"
                required
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--text2)' }}>
                Détail *
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder="Décrivez votre question en détail..."
                required
                className="w-full rounded-[var(--radius)] px-3 py-2 text-sm resize-none focus:outline-none"
                style={{ border: '1px solid var(--border)', color: 'var(--text)', background: 'var(--surface)' }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--text2)' }}>
                  Réf. poste (optionnel)
                </label>
                <Input
                  value={postRef}
                  onChange={(e) => setPostRef(e.target.value)}
                  placeholder="Ex : 01.02.03"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--text2)' }}>
                  Visibilité
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setVisibility('PUBLIC')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius)] text-sm"
                    style={{
                      background: visibility === 'PUBLIC' ? 'var(--green-light)' : 'var(--surface2)',
                      color: visibility === 'PUBLIC' ? 'var(--green)' : 'var(--text2)',
                      border: `1px solid ${visibility === 'PUBLIC' ? 'var(--green)' : 'var(--border)'}`,
                    }}
                  >
                    <Globe size={13} /> Publique
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibility('PRIVATE')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius)] text-sm"
                    style={{
                      background: visibility === 'PRIVATE' ? 'var(--surface2)' : 'var(--surface2)',
                      color: visibility === 'PRIVATE' ? 'var(--text)' : 'var(--text2)',
                      border: `1px solid ${visibility === 'PRIVATE' ? 'var(--border2)' : 'var(--border)'}`,
                      fontWeight: visibility === 'PRIVATE' ? 500 : 400,
                    }}
                  >
                    <Lock size={13} /> Privée
                  </button>
                </div>
              </div>
            </div>

            {formError && (
              <p className="text-sm px-3 py-2 rounded-[var(--radius)]"
                style={{ background: 'var(--red-light)', color: 'var(--red)' }}>
                {formError}
              </p>
            )}

            <Button
              type="submit"
              disabled={submitting || !title.trim() || !body.trim()}
              style={{ background: 'var(--green-btn)', color: '#fff', border: 'none' }}
            >
              {submitting ? 'Envoi...' : 'Envoyer la question'}
            </Button>
          </form>
        )}

        {/* Mes questions */}
        {myQas.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text3)' }}>
              Mes questions ({myQas.length})
            </h2>
            <div className="space-y-3">
              {myQas.map((qa) => <QACard key={qa.id} qa={qa} showOwnerBadge />)}
            </div>
          </div>
        )}

        {/* Q&A publics des autres */}
        {publicQas.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text3)' }}>
              Questions publiques ({publicQas.length})
            </h2>
            <div className="space-y-3">
              {publicQas.map((qa) => <QACard key={qa.id} qa={qa} />)}
            </div>
          </div>
        )}

        {qas.length === 0 && !showForm && (
          <div
            className="p-12 text-center rounded-[var(--radius-lg)]"
            style={{ background: 'var(--surface)', border: '1px dashed var(--border2)' }}
          >
            <MessageSquare size={36} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm" style={{ color: 'var(--text3)' }}>
              Aucune question pour l&apos;instant. Posez vos questions à l&apos;architecte.
            </p>
          </div>
        )}
      </div>
    </PortalShell>
  )
}

function QACard({ qa, showOwnerBadge }: { qa: QAItem; showOwnerBadge?: boolean }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="rounded-[var(--radius-lg)] overflow-hidden"
      style={{
        background: 'var(--surface)',
        border: `1px solid ${qa.status === 'ANSWERED' ? 'var(--border)' : 'var(--amber)'}`,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <button
        className="w-full flex items-start justify-between p-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {qa.status === 'ANSWERED'
              ? <CheckCircle2 size={14} style={{ color: 'var(--green)', flexShrink: 0 }} />
              : <Clock size={14} style={{ color: 'var(--amber)', flexShrink: 0 }} />
            }
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{qa.title}</span>
            {showOwnerBadge && (
              <span className="text-xs px-1.5 py-0.5 rounded"
                style={{ background: qa.visibility === 'PRIVATE' ? 'var(--surface2)' : 'var(--green-light)', color: qa.visibility === 'PRIVATE' ? 'var(--text3)' : 'var(--green)' }}>
                {qa.visibility === 'PRIVATE' ? '🔒 Privée' : '🌐 Publique'}
              </span>
            )}
          </div>
          <p className="text-xs" style={{ color: 'var(--text3)' }}>
            {new Date(qa.createdAt).toLocaleDateString('fr-FR')}
            {qa.status === 'ANSWERED' ? ' · Répondue' : ' · En attente de réponse'}
          </p>
        </div>
        <span style={{ color: 'var(--text3)', fontSize: 18 }}>{expanded ? '−' : '+'}</span>
      </button>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <div className="px-4 py-3" style={{ background: 'var(--surface2)' }}>
            <p className="text-sm whitespace-pre-line" style={{ color: 'var(--text)' }}>{qa.body}</p>
          </div>
          {qa.answer && (
            <div className="px-4 py-3" style={{ background: 'var(--green-light)', borderTop: '1px solid var(--border)' }}>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--green)' }}>
                Réponse de l&apos;architecte · {new Date(qa.answer.createdAt).toLocaleDateString('fr-FR')}
              </p>
              <p className="text-sm whitespace-pre-line" style={{ color: 'var(--text)' }}>{qa.answer.body}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function QuestionsPageClient(props: Props) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg)' }}>
        <p style={{ color: 'var(--text2)' }}>Chargement...</p>
      </div>
    }>
      <QuestionsContent {...props} />
    </Suspense>
  )
}
