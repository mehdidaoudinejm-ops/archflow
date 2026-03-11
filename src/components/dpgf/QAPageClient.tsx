'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  MessageSquare, CheckCircle2, Clock,
  Eye, EyeOff, ChevronDown, ChevronUp, Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QAItem {
  id: string
  title: string
  body: string
  visibility: 'PUBLIC' | 'PRIVATE'
  status: 'PENDING' | 'ANSWERED'
  postRef: string | null
  createdAt: string
  companyName: string
  answer: { body: string; createdAt: string } | null
}

interface Props {
  projectId: string
  projectName: string
  ao: { id: string; name: string }
  initialQas: QAItem[]
}

export function QAPageClient({ projectId, projectName, ao, initialQas }: Props) {
  const [qas, setQas] = useState<QAItem[]>(initialQas)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'ANSWERED'>('ALL')

  const filtered = qas.filter((q) => filter === 'ALL' || q.status === filter)
  const pendingCount = qas.filter((q) => q.status === 'PENDING').length

  async function submitAnswer(qaId: string) {
    const body = answerDrafts[qaId]?.trim()
    if (!body) return

    setSubmitting(qaId)
    try {
      const res = await fetch(`/api/ao/${ao.id}/qa/${qaId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      if (res.ok) {
        const answer = await res.json() as { body: string; createdAt: string }
        setQas((prev) =>
          prev.map((q) =>
            q.id === qaId
              ? { ...q, status: 'ANSWERED', answer: { body: answer.body, createdAt: answer.createdAt } }
              : q
          )
        )
        setAnswerDrafts((prev) => ({ ...prev, [qaId]: '' }))
      }
    } finally {
      setSubmitting(null)
    }
  }

  async function toggleVisibility(qa: QAItem) {
    const newVisibility = qa.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC'
    const res = await fetch(`/api/ao/${ao.id}/qa/${qa.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibility: newVisibility }),
    })
    if (res.ok) {
      setQas((prev) => prev.map((q) => q.id === qa.id ? { ...q, visibility: newVisibility } : q))
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* En-tête */}
      <div>
        <p className="text-sm" style={{ color: 'var(--text3)' }}>{projectName}</p>
        <h1
          className="text-2xl font-semibold mt-0.5"
          style={{ fontFamily: 'var(--font-dm-serif)', color: 'var(--text)' }}
        >
          DQE
        </h1>
      </div>

      {/* Onglets de navigation */}
      <div className="flex items-end gap-0" style={{ borderBottom: '2px solid var(--border)' }}>
        {[
          { label: 'Infos', href: `/dpgf/${projectId}/settings`, active: false },
          { label: "DQE", href: `/dpgf/${projectId}`, active: false },
          { label: 'DCE', href: `/dpgf/${projectId}/dce`, active: false },
          { label: 'Q&A', href: `/dpgf/${projectId}/qa`, active: true },
          { label: 'Analyse', href: `/dpgf/${projectId}/analyse`, active: false },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="px-4 py-2 text-sm font-medium transition-colors"
            style={{
              color: tab.active ? 'var(--green)' : 'var(--text2)',
              borderBottom: tab.active ? '2px solid var(--green)' : '2px solid transparent',
              marginBottom: '-2px',
            }}
          >
            {tab.label}
          </Link>
        ))}
        {pendingCount > 0 && (
          <span
            className="ml-auto mb-1 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ background: 'var(--amber-light)', color: 'var(--amber)' }}
          >
            {pendingCount} en attente
          </span>
        )}
      </div>

      <p className="text-sm" style={{ color: 'var(--text2)' }}>{ao.name}</p>

      {/* Filtres */}
      <div className="flex gap-2">
        {(['ALL', 'PENDING', 'ANSWERED'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-[var(--radius)] text-sm transition-colors"
            style={{
              background: filter === f ? 'var(--green-light)' : 'var(--surface)',
              color: filter === f ? 'var(--green)' : 'var(--text2)',
              border: `1px solid ${filter === f ? 'var(--green)' : 'var(--border)'}`,
              fontWeight: filter === f ? 500 : 400,
            }}
          >
            {f === 'ALL' ? 'Toutes' : f === 'PENDING' ? 'En attente' : 'Répondues'}
          </button>
        ))}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div
          className="p-12 text-center rounded-[var(--radius-lg)]"
          style={{ background: 'var(--surface)', border: '1px dashed var(--border2)' }}
        >
          <MessageSquare size={36} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm" style={{ color: 'var(--text3)' }}>
            {qas.length === 0
              ? 'Aucune question pour l\'instant. Elles apparaîtront ici dès que les entreprises en poseront.'
              : 'Aucune question dans ce filtre.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((qa) => {
            const isExpanded = expandedId === qa.id
            return (
              <div
                key={qa.id}
                className="rounded-[var(--radius-lg)] overflow-hidden"
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${qa.status === 'PENDING' ? 'var(--amber)' : 'var(--border)'}`,
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {/* En-tête de la question */}
                <button
                  className="w-full flex items-start justify-between p-4 text-left"
                  onClick={() => setExpandedId(isExpanded ? null : qa.id)}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {qa.status === 'ANSWERED' ? (
                        <CheckCircle2 size={15} style={{ color: 'var(--green)', flexShrink: 0 }} />
                      ) : (
                        <Clock size={15} style={{ color: 'var(--amber)', flexShrink: 0 }} />
                      )}
                      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                        {qa.title}
                      </span>
                      {qa.postRef && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded font-mono"
                          style={{ background: 'var(--surface2)', color: 'var(--text3)' }}
                        >
                          {qa.postRef}
                        </span>
                      )}
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          background: qa.visibility === 'PUBLIC' ? 'var(--green-light)' : 'var(--surface2)',
                          color: qa.visibility === 'PUBLIC' ? 'var(--green)' : 'var(--text3)',
                        }}
                      >
                        {qa.visibility === 'PUBLIC' ? 'Publique' : 'Privée'}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text3)' }}>
                      {qa.companyName} · {new Date(qa.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text3)', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: 'var(--text3)', flexShrink: 0 }} />}
                </button>

                {/* Corps expandé */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    {/* Corps de la question */}
                    <div className="px-4 py-3" style={{ background: 'var(--surface2)' }}>
                      <p className="text-sm whitespace-pre-line" style={{ color: 'var(--text)' }}>
                        {qa.body}
                      </p>
                    </div>

                    {/* Réponse existante */}
                    {qa.answer && (
                      <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)', background: 'var(--green-light)' }}>
                        <p className="text-xs font-medium mb-1" style={{ color: 'var(--green)' }}>
                          Votre réponse · {new Date(qa.answer.createdAt).toLocaleDateString('fr-FR')}
                        </p>
                        <p className="text-sm whitespace-pre-line" style={{ color: 'var(--text)' }}>
                          {qa.answer.body}
                        </p>
                      </div>
                    )}

                    {/* Zone de réponse */}
                    <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
                      <p className="text-xs font-medium mb-2" style={{ color: 'var(--text2)' }}>
                        {qa.answer ? 'Modifier la réponse' : 'Votre réponse'}
                      </p>
                      <textarea
                        value={answerDrafts[qa.id] ?? qa.answer?.body ?? ''}
                        onChange={(e) => setAnswerDrafts((prev) => ({ ...prev, [qa.id]: e.target.value }))}
                        rows={3}
                        placeholder="Rédigez votre réponse..."
                        className="w-full rounded-[var(--radius)] px-3 py-2 text-sm resize-none focus:outline-none"
                        style={{
                          border: '1px solid var(--border)',
                          color: 'var(--text)',
                          background: 'var(--surface)',
                        }}
                      />
                      <div className="flex items-center justify-between mt-3">
                        <button
                          onClick={() => toggleVisibility(qa)}
                          className="flex items-center gap-1.5 text-xs hover:underline"
                          style={{ color: 'var(--text3)' }}
                        >
                          {qa.visibility === 'PUBLIC'
                            ? <><EyeOff size={13} /> Rendre privée</>
                            : <><Eye size={13} /> Rendre publique</>
                          }
                        </button>
                        <Button
                          onClick={() => submitAnswer(qa.id)}
                          disabled={submitting === qa.id || !answerDrafts[qa.id]?.trim()}
                          className="h-8 text-sm px-3"
                          style={{ background: 'var(--green-btn)', color: '#fff', border: 'none' }}
                        >
                          <Send size={13} className="mr-1.5" />
                          {submitting === qa.id ? 'Envoi...' : qa.answer ? 'Modifier' : 'Répondre'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
