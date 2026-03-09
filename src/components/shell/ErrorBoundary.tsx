'use client'

import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error)
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div
          className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center rounded-[var(--radius-lg)]"
          style={{ background: 'var(--red-light)', border: '1px solid var(--red)' }}
        >
          <AlertTriangle size={32} style={{ color: 'var(--red)', marginBottom: 12 }} />
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--red)' }}>
            Une erreur inattendue s&apos;est produite
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--red)', opacity: 0.75 }}>
            {this.state.error.message}
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            className="text-xs px-3 py-1.5 rounded-[var(--radius)]"
            style={{ background: 'var(--red)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            Réessayer
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
