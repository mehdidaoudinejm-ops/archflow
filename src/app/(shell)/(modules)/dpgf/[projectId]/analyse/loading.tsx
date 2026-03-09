export default function Loading() {
  return (
    <div className="flex-1 p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="h-8 w-64 rounded-lg" style={{ background: 'var(--surface2)' }} />
      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl" style={{ background: 'var(--surface2)' }} />
        ))}
      </div>
      {/* Chart skeleton */}
      <div className="h-64 rounded-xl" style={{ background: 'var(--surface2)' }} />
      {/* Table skeleton */}
      <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
        <div className="h-10" style={{ background: 'var(--surface2)' }} />
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-12 border-t"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', opacity: 1 - i * 0.1 }}
          />
        ))}
      </div>
    </div>
  )
}
