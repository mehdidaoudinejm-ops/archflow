export default function Loading() {
  return (
    <div className="min-h-screen animate-pulse" style={{ background: 'var(--bg)' }}>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="h-16 rounded-xl" style={{ background: 'var(--surface2)' }} />
        {/* Tabs */}
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 w-24 rounded-lg" style={{ background: 'var(--surface2)' }} />
          ))}
        </div>
        {/* Content */}
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl" style={{ background: 'var(--surface2)', opacity: 1 - i * 0.1 }} />
          ))}
        </div>
      </div>
    </div>
  )
}
