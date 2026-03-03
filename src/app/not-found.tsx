import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--bg)' }}
    >
      <div className="text-center max-w-md">
        {/* Illustration */}
        <div className="mb-8">
          <p
            className="text-8xl font-bold leading-none"
            style={{ fontFamily: 'var(--font-dm-serif)', color: 'var(--green-light)' }}
          >
            404
          </p>
          <div
            className="w-16 h-0.5 mx-auto mt-4"
            style={{ background: 'var(--border2)' }}
          />
        </div>

        <h1
          className="text-2xl font-semibold mb-2"
          style={{ fontFamily: 'var(--font-dm-serif)', color: 'var(--text)' }}
        >
          Page introuvable
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text2)', lineHeight: '1.6' }}>
          La page que vous cherchez n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-5 py-2.5 text-sm rounded-[var(--radius)] font-medium"
          style={{
            background: 'var(--green-btn)',
            color: '#fff',
          }}
        >
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  )
}
