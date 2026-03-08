'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createBrowserClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError('Email ou mot de passe incorrect.')
        return
      }

      router.push(redirect)
      router.refresh()
    } catch {
      setError('Une erreur est survenue. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="email" style={{ color: 'var(--text)' }}>
          Adresse email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="vous@agence.fr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
          }}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" style={{ color: 'var(--text)' }}>
            Mot de passe
          </Label>
          <Link
            href="/forgot-password"
            className="text-xs hover:underline"
            style={{ color: 'var(--green-mid)' }}
          >
            Mot de passe oublié ?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPwd ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              paddingRight: 40,
            }}
          />
          <button
            type="button"
            onClick={() => setShowPwd(!showPwd)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text3)' }}
          >
            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {error && (
        <p
          className="text-sm px-3 py-2 rounded-[var(--radius)]"
          style={{ background: 'var(--red-light)', color: 'var(--red)' }}
        >
          {error}
        </p>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={loading}
        style={{
          background: 'var(--green-btn)',
          color: '#fff',
          border: 'none',
        }}
      >
        {loading ? 'Connexion...' : 'Se connecter'}
      </Button>

      <p className="text-center text-sm" style={{ color: 'var(--text2)' }}>
        Pas encore de compte ?{' '}
        <Link
          href="/register"
          className="font-medium hover:underline"
          style={{ color: 'var(--green-mid)' }}
        >
          Créer un compte
        </Link>
      </p>
    </form>
  )
}
