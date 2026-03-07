'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/users', label: 'Utilisateurs', exact: false },
  { href: '/admin/waitlist', label: "Liste d'attente", exact: false },
  { href: '/admin/announcements', label: 'Annonces', exact: false },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <aside className="w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col shrink-0">
      <div className="px-5 py-4 border-b border-zinc-800">
        <div className="text-red-400 font-bold text-base">ArchFlow</div>
        <div className="text-zinc-500 text-xs mt-0.5">Administration</div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {links.map(({ href, label, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? 'bg-red-500/10 text-red-400 font-medium'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-zinc-800">
        <Link
          href="/dashboard"
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ← Retour à l&apos;app
        </Link>
      </div>
    </aside>
  )
}
