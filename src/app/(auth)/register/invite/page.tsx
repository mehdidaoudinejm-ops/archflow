import { Suspense } from 'react'
import { InviteRegisterClient } from './InviteRegisterClient'

export default function InviteRegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <p style={{ color: 'var(--text2)' }}>Vérification du lien...</p>
      </div>
    }>
      <InviteRegisterClient />
    </Suspense>
  )
}
