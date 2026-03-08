'use client'

import Link from 'next/link'
import { CalendarClock, ArrowRight, CheckCircle2, Clock, Send, AlertCircle, FileText } from 'lucide-react'

type AOCompanyStatus = 'INVITED' | 'OPENED' | 'IN_PROGRESS' | 'SUBMITTED' | 'INCOMPLETE'

interface AoCompanyItem {
  id: string
  aoId: string
  status: AOCompanyStatus
  ao: {
    name: string
    deadline: string | Date
    status: string
    dpgf: {
      project: { name: string; address: string | null }
    }
  }
  offer: { id: string; submittedAt: string | Date | null; isComplete: boolean } | null
}

const STATUS_CONFIG: Record<AOCompanyStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  INVITED: { label: 'Invité', color: '#6B6B65', bg: '#F3F3F0', icon: <FileText size={13} /> },
  OPENED: { label: 'Consulté', color: '#B45309', bg: '#FEF3E2', icon: <Clock size={13} /> },
  IN_PROGRESS: { label: 'En cours', color: '#1A5C3A', bg: '#EAF3ED', icon: <Clock size={13} /> },
  SUBMITTED: { label: 'Offre soumise', color: '#1A5C3A', bg: '#EAF3ED', icon: <CheckCircle2 size={13} /> },
  INCOMPLETE: { label: 'Incomplet', color: '#9B1C1C', bg: '#FEE8E8', icon: <AlertCircle size={13} /> },
}

function formatDeadline(date: string | Date): string {
  const d = new Date(date)
  const now = new Date()
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const dateStr = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  if (diffDays < 0) return `Clôturé le ${dateStr}`
  if (diffDays === 0) return `Aujourd'hui — ${dateStr}`
  if (diffDays === 1) return `Demain — ${dateStr}`
  if (diffDays <= 7) return `Dans ${diffDays} jours — ${dateStr}`
  return dateStr
}

function isExpired(date: string | Date): boolean {
  return new Date(date) < new Date()
}

export function MesAOClient({ aoCompanies }: { aoCompanies: AoCompanyItem[] }) {
  if (aoCompanies.length === 0) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 28, color: '#1A1A18', marginBottom: 8 }}>
          Mes appels d&apos;offres
        </h1>
        <p style={{ fontSize: 13, color: '#9B9B94', marginBottom: 40 }}>
          Retrouvez ici les consultations auxquelles vous êtes invité à répondre.
        </p>
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <Send size={36} style={{ color: '#D4D4CC', margin: '0 auto 16px' }} />
          <p style={{ color: '#9B9B94', fontSize: 14 }}>Aucun appel d&apos;offres pour l&apos;instant.</p>
          <p style={{ color: '#9B9B94', fontSize: 13, marginTop: 6 }}>
            Vous recevrez un email lorsqu&apos;une agence vous invitera à consulter un dossier.
          </p>
        </div>
      </div>
    )
  }

  const active = aoCompanies.filter((a) => !isExpired(a.ao.deadline))
  const closed = aoCompanies.filter((a) => isExpired(a.ao.deadline))

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 28, color: '#1A1A18', marginBottom: 8 }}>
        Mes appels d&apos;offres
      </h1>
      <p style={{ fontSize: 13, color: '#9B9B94', marginBottom: 32 }}>
        Retrouvez ici les consultations auxquelles vous êtes invité à répondre.
      </p>

      {active.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#9B9B94', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 14 }}>
            En cours ({active.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {active.map((item) => <AOCard key={item.id} item={item} />)}
          </div>
        </section>
      )}

      {closed.length > 0 && (
        <section>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#9B9B94', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 14 }}>
            Clôturés ({closed.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {closed.map((item) => <AOCard key={item.id} item={item} closed />)}
          </div>
        </section>
      )}
    </div>
  )
}

function AOCard({ item, closed = false }: { item: AoCompanyItem; closed?: boolean }) {
  const statusConf = STATUS_CONFIG[item.status]
  const deadline = formatDeadline(item.ao.deadline)

  return (
    <Link
      href={`/portal/${item.aoId}`}
      style={{ textDecoration: 'none' }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 14,
          border: '1px solid #E8E8E3',
          padding: '18px 22px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          opacity: closed ? 0.7 : 1,
          cursor: 'pointer',
          transition: 'box-shadow 0.15s, border-color 0.15s',
        }}
        onMouseEnter={(e) => {
          if (!closed) {
            (e.currentTarget as HTMLDivElement).style.borderColor = '#1A5C3A'
            ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(26,92,58,0.1)'
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = '#E8E8E3'
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'
        }}
      >
        {/* Icon */}
        <div style={{
          width: 42, height: 42, borderRadius: 10, background: closed ? '#F3F3F0' : '#EAF3ED',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Send size={18} style={{ color: closed ? '#9B9B94' : '#1A5C3A' }} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1A18', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.ao.name}
            </p>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20,
              color: statusConf.color, background: statusConf.bg, flexShrink: 0,
            }}>
              {statusConf.icon}
              {statusConf.label}
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#6B6B65', margin: 0 }}>
            {item.ao.dpgf.project.name}
            {item.ao.dpgf.project.address && ` · ${item.ao.dpgf.project.address}`}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
            <CalendarClock size={12} style={{ color: closed ? '#9B9B94' : '#B45309' }} />
            <span style={{ fontSize: 12, color: closed ? '#9B9B94' : '#B45309' }}>{deadline}</span>
          </div>
        </div>

        {/* Arrow */}
        <ArrowRight size={16} style={{ color: '#D4D4CC', flexShrink: 0 }} />
      </div>
    </Link>
  )
}
