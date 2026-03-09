export default function Loading() {
  return (
    <div className="flex-1 p-6 space-y-4 animate-pulse">
      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 rounded-lg" style={{ background: 'var(--surface2)' }} />
        <div className="flex gap-2">
          <div className="h-8 w-24 rounded-lg" style={{ background: 'var(--surface2)' }} />
          <div className="h-8 w-24 rounded-lg" style={{ background: 'var(--surface2)' }} />
        </div>
      </div>
      {/* Stats bar skeleton */}
      <div className="h-16 rounded-xl" style={{ background: 'var(--surface2)' }} />
      {/* Table skeleton */}
      <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
        <div className="h-10" style={{ background: 'var(--surface2)' }} />
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-11 border-t"
            style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)', borderColor: 'var(--border)', opacity: 1 - i * 0.08 }}
          />
        ))}
      </div>
    </div>
  )
}
