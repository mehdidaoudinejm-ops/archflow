export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header
        className="h-14 flex items-center justify-between px-6 border-b"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <p
          className="text-xl font-semibold"
          style={{ fontFamily: '"DM Serif Display", serif', color: 'var(--green)' }}
        >
          ArchFlow
        </p>
        <span className="text-sm" style={{ color: 'var(--text2)' }}>
          Espace client
        </span>
      </header>
      <main>{children}</main>
    </div>
  )
}
