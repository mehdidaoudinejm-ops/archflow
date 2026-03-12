export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header
        className="h-14 flex items-center justify-between px-6 border-b"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <p
            className="text-xl font-semibold"
            style={{ fontFamily: '"DM Serif Display", serif', color: 'var(--green)', margin: 0 }}
          >
            ArchFlow
          </p>
          <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 8, fontWeight: 400, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C4C4BC' }}>
            By The Blueprint Lab
          </span>
        </div>
        <span className="text-sm" style={{ color: 'var(--text2)' }}>
          Espace client
        </span>
      </header>
      <main>{children}</main>
    </div>
  )
}
