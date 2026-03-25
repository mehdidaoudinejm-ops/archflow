import { Suspense } from 'react'
import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div
        className="w-full max-w-md mx-4 p-6 sm:p-8 rounded-[var(--radius-lg)]"
        style={{
          background: 'var(--surface)',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1
            className="text-3xl"
            style={{
              fontFamily: '"DM Serif Display", serif',
              color: 'var(--green)',
            }}
          >
            ArchFlow
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text2)' }}>
            Bienvenue, connectez-vous à votre espace
          </p>
        </div>

        <Suspense fallback={<div className="h-48 animate-pulse rounded-[var(--radius)]" style={{ background: 'var(--surface2)' }} />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
