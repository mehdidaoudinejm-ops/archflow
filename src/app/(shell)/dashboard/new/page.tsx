'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function NewProjectPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, address }),
      })

      const data = await res.json() as { id?: string; error?: string }

      if (!res.ok) {
        setError(data.error ?? 'Erreur lors de la création du projet')
        return
      }

      router.push(`/dpgf/${data.id!}`)
      router.refresh()
    } catch {
      setError('Une erreur est survenue. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Retour */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm mb-6"
        style={{ color: 'var(--text3)' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux projets
      </Link>

      <h1
        className="text-2xl mb-6"
        style={{ fontFamily: '"DM Serif Display", serif', color: 'var(--text)' }}
      >
        Nouveau projet
      </h1>

      <div
        className="p-6 rounded-[var(--radius-lg)]"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="name" style={{ color: 'var(--text)' }}>
              Nom du projet <span style={{ color: 'var(--red)' }}>*</span>
            </Label>
            <Input
              id="name"
              placeholder="ex. Villa Martignon — Paris 16e"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address" style={{ color: 'var(--text)' }}>
              Adresse du chantier
            </Label>
            <Input
              id="address"
              placeholder="ex. 12 avenue Foch, 75016 Paris"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>

          {error && (
            <p
              className="text-sm px-3 py-2 rounded-[var(--radius)]"
              style={{ background: 'var(--red-light)', color: 'var(--red)' }}
            >
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => router.push('/dashboard')}
              style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading || !name.trim()}
              style={{ background: 'var(--green-btn)', color: '#fff', border: 'none' }}
            >
              {loading ? 'Création...' : 'Créer le projet'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
