'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PortalShell } from '@/components/portal/PortalShell'
import { FileText, Download, CheckCircle2, Clock } from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  plans: 'Plans',
  cctp: 'CCTP',
  notices: 'Notices',
  photos: 'Photos',
  autres: 'Divers',
}

interface PlanDoc {
  id: string
  name: string
  category: string
  fileUrl: string
  isMandatory: boolean
  revision: number
  createdAt: string
  isRead: boolean
  readAt: string | null
}

interface Props {
  aoId: string
  aoName: string
  deadline: string
  companyName: string
  aoCompanyId: string
  initialDocs: PlanDoc[]
}

function PlansContent({ aoId, aoName, deadline, companyName, aoCompanyId, initialDocs }: Props) {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [docs, setDocs] = useState<PlanDoc[]>(initialDocs)

  async function markAsRead(docId: string) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { 'X-Portal-Token': token } : {}),
    }
    const res = await fetch(`/api/ao/${aoId}/documents/${docId}/read`, { method: 'POST', headers })
    if (res.ok) {
      setDocs((prev) =>
        prev.map((d) =>
          d.id === docId ? { ...d, isRead: true, readAt: new Date().toISOString() } : d
        )
      )
    }
  }

  // Grouper par catégorie
  const categories = Array.from(new Set(docs.map((d) => d.category)))
  const docsByCategory = categories.map((cat) => ({
    key: cat,
    label: CATEGORY_LABELS[cat] ?? cat,
    docs: docs.filter((d) => d.category === cat),
  }))

  const readCount = docs.filter((d) => d.isRead).length

  return (
    <PortalShell
      aoId={aoId}
      aoName={aoName}
      deadline={deadline}
      companyName={companyName}
      activeSection="plans"
      progress={0}
      saveStatus="saved"
      isSubmitted={false}
    >
      <div className="p-6 max-w-3xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1
              className="text-xl font-semibold mb-1"
              style={{ fontFamily: '"DM Serif Display", serif', color: 'var(--text)' }}
            >
              Plans &amp; documents DCE
            </h1>
            <p className="text-sm" style={{ color: 'var(--text2)' }}>
              {readCount}/{docs.length} document{docs.length > 1 ? 's' : ''} consulté{docs.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {docs.length === 0 && (
          <div
            className="p-10 text-center rounded-[var(--radius-lg)]"
            style={{ background: 'var(--surface)', border: '1px dashed var(--border2)' }}
          >
            <FileText size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm" style={{ color: 'var(--text3)' }}>
              Aucun document disponible pour l&apos;instant.
            </p>
          </div>
        )}

        <div className="space-y-6">
          {docsByCategory.map((cat) => (
            <div key={cat.key}>
              <h2
                className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: 'var(--text3)' }}
              >
                {cat.label}
              </h2>
              <div className="space-y-2">
                {cat.docs.map((doc) => {
                  const isNew =
                    !doc.isRead &&
                    new Date(doc.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000

                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 rounded-[var(--radius-lg)]"
                      style={{
                        background: 'var(--surface)',
                        border: `1px solid ${doc.isRead ? 'var(--border)' : 'var(--border2)'}`,
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText
                          size={18}
                          style={{ color: doc.isRead ? 'var(--text3)' : 'var(--green)', flexShrink: 0 }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                              {doc.name}
                            </p>
                            {isNew && (
                              <span
                                className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                                style={{ background: 'var(--green-light)', color: 'var(--green)' }}
                              >
                                Nouveau
                              </span>
                            )}
                            {doc.isMandatory && (
                              <span
                                className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                                style={{ background: 'var(--amber-light)', color: 'var(--amber)' }}
                              >
                                Obligatoire
                              </span>
                            )}
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                            v{doc.revision} · {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                            {doc.isRead && doc.readAt && (
                              <span style={{ color: 'var(--green)' }}>
                                {' '}· Lu le {new Date(doc.readAt).toLocaleDateString('fr-FR')}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        {doc.isRead ? (
                          <CheckCircle2 size={16} style={{ color: 'var(--green)' }} />
                        ) : (
                          <Clock size={16} style={{ color: 'var(--text3)' }} />
                        )}
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => !doc.isRead && markAsRead(doc.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius)] text-sm font-medium"
                          style={{
                            background: doc.isRead ? 'var(--surface2)' : 'var(--green-btn)',
                            color: doc.isRead ? 'var(--text)' : '#fff',
                            border: doc.isRead ? '1px solid var(--border)' : 'none',
                          }}
                        >
                          <Download size={13} />
                          {doc.isRead ? 'Revoir' : 'Ouvrir'}
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs mt-8" style={{ color: 'var(--text3)' }}>
          L&apos;ouverture d&apos;un document le marque automatiquement comme lu.
        </p>
      </div>
    </PortalShell>
  )
}

export function PlansPageClient(props: Props) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg)' }}>
        <p style={{ color: 'var(--text2)' }}>Chargement...</p>
      </div>
    }>
      <PlansContent {...props} />
    </Suspense>
  )
}
