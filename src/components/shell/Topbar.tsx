'use client'

import { useRouter } from 'next/navigation'
import { Bell, ChevronDown, LogOut } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface TopbarProps {
  user: {
    firstName?: string | null
    lastName?: string | null
    email: string
    avatarUrl?: string | null
  }
  projectName?: string
}

export function Topbar({ user, projectName }: TopbarProps) {
  const router = useRouter()

  const initials =
    user.firstName && user.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : user.email[0].toUpperCase()

  async function handleSignOut() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header
      className="h-14 flex items-center justify-between px-6 border-b shrink-0"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Nom du projet actif */}
      <div>
        {projectName ? (
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            {projectName}
          </p>
        ) : (
          <div />
        )}
      </div>

      {/* Actions droite */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button
          className="relative p-2 rounded-[var(--radius)] transition-colors hover:bg-[var(--surface2)]"
          style={{ color: 'var(--text2)' }}
          aria-label="Notifications"
        >
          <Bell size={18} />
        </button>

        {/* Avatar + menu utilisateur */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 p-1 rounded-[var(--radius)] transition-colors hover:bg-[var(--surface2)]">
              <Avatar className="h-7 w-7">
                <AvatarFallback
                  style={{
                    background: 'var(--green-light)',
                    color: 'var(--green)',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm" style={{ color: 'var(--text)' }}>
                {user.firstName ?? user.email}
              </span>
              <ChevronDown size={14} style={{ color: 'var(--text3)' }} />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs" style={{ color: 'var(--text3)' }}>
                {user.email}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer text-sm gap-2"
              style={{ color: 'var(--red)' }}
            >
              <LogOut size={14} />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
