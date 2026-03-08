'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FileText, FolderOpen, MessageSquare, Shield, Clock, CheckCircle2, Save, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PortalShellProps {
  aoId: string
  aoName: string
  deadline: string
  companyName: string
  activeSection: 'offer' | 'documents' | 'plans' | 'questions' | 'settings'
  progress: number
  saveStatus: 'saved' | 'saving' | 'unsaved'
  isSubmitted: boolean
  onSave?: () => void
  children: React.ReactNode
}

function Countdown({ deadline }: { deadline: string }) {
  const now = new Date()
  const end = new Date(deadline)
  const diff = end.getTime() - now.getTime()

  if (diff <= 0) return <span style={{ color: 'var(--red)' }}>Délai dépassé</span>

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  return (
    <span style={{ color: days <= 3 ? 'var(--amber)' : 'var(--text2)', fontWeight: 500 }}>
      <Clock size={13} className="inline mr-1" />
      {days > 0 ? `${days}j ${hours}h` : `${hours}h`}
    </span>
  )
}

export function PortalShell({
  aoId,
  aoName,
  deadline,
  companyName,
  activeSection,
  progress,
  saveStatus,
  isSubmitted,
  onSave,
  children,
}: PortalShellProps) {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const tokenSuffix = token ? `?token=${token}` : ''

  const navItems = [
    { key: 'offer', label: 'Mon offre', icon: <FileText size={16} />, href: `/portal/${aoId}${tokenSuffix}` },
    { key: 'plans', label: 'Plans DCE', icon: <FolderOpen size={16} />, href: `/portal/${aoId}/plans${tokenSuffix}` },
    { key: 'questions', label: 'Questions', icon: <MessageSquare size={16} />, href: `/portal/${aoId}/questions${tokenSuffix}` },
    { key: 'documents', label: 'Mes documents', icon: <Shield size={16} />, href: `/portal/${aoId}/documents${tokenSuffix}` },
  ]

  const saveLabel =
    saveStatus === 'saving'
      ? 'Sauvegarde...'
      : saveStatus === 'unsaved'
      ? '● Modifications non sauvegardées'
      : '✓ Sauvegardé'
  const saveColor =
    saveStatus === 'saving' ? 'var(--amber)' : saveStatus === 'unsaved' ? 'var(--amber)' : 'var(--green)'

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className="w-56 flex-shrink-0 flex flex-col"
        style={{
          background: '#7ADFBB',
          borderRight: '1px solid rgba(0,0,0,0.08)',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
          <p
            className="text-xl font-semibold"
            style={{ fontFamily: '"DM Serif Display", serif', color: '#1A3A2A' }}
          >
            ArchFlow
          </p>
          <p className="text-xs mt-0.5 truncate" style={{ color: '#1A3A2A', opacity: 0.6 }}>
            Portail entreprise
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.key === activeSection
            return (
              <Link
                key={item.key}
                href={item.href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius)] text-sm transition-colors"
                style={{
                  background: isActive ? 'rgba(255,255,255,0.3)' : 'transparent',
                  color: '#1A3A2A',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
          {/* Paramètres */}
          <Link
            href={`/settings${tokenSuffix}`}
            className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius)] text-sm transition-colors"
            style={{
              background: activeSection === 'settings' ? 'rgba(255,255,255,0.3)' : 'transparent',
              color: '#1A3A2A',
              fontWeight: 400,
            }}
          >
            <Settings size={16} />
            Paramètres
          </Link>
        </nav>

        {/* Progression */}
        <div className="px-4 pb-5">
          <div className="px-3 py-3 rounded-[var(--radius)]" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium" style={{ color: 'var(--text2)' }}>
                Progression
              </p>
              <p className="text-xs font-semibold" style={{ color: progress === 100 ? 'var(--green)' : 'var(--text)' }}>
                {progress}%
              </p>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: 'var(--border)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  background: progress === 100 ? 'var(--green)' : 'var(--green-mid)',
                }}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header
          className="h-14 flex items-center justify-between px-6 border-b flex-shrink-0"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="min-w-0">
              <p
                className="font-semibold text-sm truncate"
                style={{ color: 'var(--text)' }}
              >
                {aoName}
              </p>
            </div>
            <div className="text-sm">
              <Countdown deadline={deadline} />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Statut sauvegarde + bouton save */}
            {!isSubmitted && (
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: saveColor }}>
                  {saveLabel}
                </span>
                {onSave && saveStatus === 'unsaved' && (
                  <Button
                    size="sm"
                    onClick={onSave}
                    style={{ background: 'var(--green-btn)', color: '#fff', border: 'none', height: 30, fontSize: 12 }}
                  >
                    <Save size={13} className="mr-1" />
                    Sauvegarder
                  </Button>
                )}
              </div>
            )}
            {isSubmitted && (
              <span
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                style={{ background: 'var(--green-light)', color: 'var(--green)' }}
              >
                <CheckCircle2 size={13} />
                Offre soumise
              </span>
            )}

            {/* Avatar entreprise */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
              style={{ background: 'var(--green-btn)' }}
            >
              {companyName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
