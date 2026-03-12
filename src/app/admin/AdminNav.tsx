'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Clock, Megaphone, Mail, ArrowLeft } from 'lucide-react'

const links = [
  { href: '/admin',              label: 'Dashboard',       icon: <LayoutDashboard size={18} />, exact: true },
  { href: '/admin/users',        label: 'Utilisateurs',    icon: <Users size={18} />,           exact: false },
  { href: '/admin/waitlist',     label: "Liste d'attente", icon: <Clock size={18} />,           exact: false },
  { href: '/admin/announcements',label: 'Annonces',        icon: <Megaphone size={18} />,       exact: false },
  { href: '/admin/emails',       label: 'Emails',          icon: <Mail size={18} />,            exact: false },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <aside
      className="flex flex-col w-56 shrink-0 min-h-screen py-6"
      style={{ background: 'var(--green)' }}
    >
      {/* Logo */}
      <div className="px-5 mb-8">
        <Link href="/admin">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span
              className="text-2xl leading-none"
              style={{ fontFamily: '"DM Serif Display", serif', color: '#fff' }}
            >
              ArchFlow
            </span>
            <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 8, fontWeight: 400, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C4C4BC' }}>
              By The Blueprint Lab
            </span>
          </div>
        </Link>
        <span
          className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }}
        >
          Administration
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {links.map(({ href, label, icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius)] text-sm transition-colors"
              style={{
                background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: active ? '#fff' : 'rgba(255,255,255,0.7)',
                fontWeight: active ? 600 : 400,
              }}
            >
              {icon}
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Retour app */}
      <div className="px-5 mt-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-xs transition-colors"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          <ArrowLeft size={13} />
          Retour à l&apos;app
        </Link>
      </div>
    </aside>
  )
}
