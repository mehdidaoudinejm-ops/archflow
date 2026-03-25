'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Clock, Megaphone, Mail, BookOpen, ArrowLeft, Package, Menu, X } from 'lucide-react'

const links = [
  { href: '/admin',                label: 'Dashboard',         icon: <LayoutDashboard size={18} />, exact: true },
  { href: '/admin/users',          label: 'Utilisateurs',      icon: <Users size={18} />,           exact: false },
  { href: '/admin/plans',          label: 'Plans',             icon: <Package size={18} />,         exact: false },
  { href: '/admin/waitlist',       label: "Liste d'attente",   icon: <Clock size={18} />,           exact: false },
  { href: '/admin/announcements',  label: 'Annonces',          icon: <Megaphone size={18} />,       exact: false },
  { href: '/admin/emails',         label: 'Emails',            icon: <Mail size={18} />,            exact: false },
  { href: '/admin/bibliotheque',   label: 'Bibliothèque DPGF', icon: <BookOpen size={18} />,        exact: false },
]

export default function AdminNav() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Mobile header bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 flex items-center px-4 border-b"
        style={{ background: 'var(--green)', borderColor: 'rgba(0,0,0,0.12)' }}
      >
        <button
          onClick={() => setIsOpen(true)}
          className="p-1.5 rounded"
          style={{ color: 'rgba(255,255,255,0.8)' }}
          aria-label="Ouvrir le menu"
        >
          <Menu size={22} />
        </button>
        <span
          className="ml-3 text-xl leading-none"
          style={{ fontFamily: '"DM Serif Display", serif', color: '#fff' }}
        >
          ArchFlow
        </span>
        <span
          className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }}
        >
          Admin
        </span>
      </div>

      {/* Backdrop mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'flex flex-col w-64 md:w-56 shrink-0 py-6',
          'fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out',
          'md:relative md:translate-x-0 md:min-h-screen',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        style={{ background: 'var(--green)' }}
      >
        {/* Logo */}
        <div className="px-5 mb-8 flex items-center justify-between">
          <div>
            <Link href="/admin" onClick={() => setIsOpen(false)}>
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
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden p-1 rounded"
            style={{ color: 'rgba(255,255,255,0.6)' }}
            aria-label="Fermer le menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {links.map(({ href, label, icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setIsOpen(false)}
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
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 text-xs transition-colors"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            <ArrowLeft size={13} />
            Retour à l&apos;app
          </Link>
        </div>
      </aside>
    </>
  )
}
