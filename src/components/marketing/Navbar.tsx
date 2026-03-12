'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

const NAV_LINKS = [
  { label: 'Fonctionnalités', href: '#features' },
  { label: 'Tarifs', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(255,255,255,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid #E8E8E3' : 'none',
        transition: 'background 0.3s ease, border-color 0.3s ease',
      }}
    >
      <div
        style={{
          maxWidth: '1200px', margin: '0 auto',
          padding: '0 24px', height: '64px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        {/* Logo */}
        <a href="/" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span
            style={{
              fontFamily: '"DM Serif Display", serif',
              fontSize: '22px', color: '#1A5C3A',
              fontWeight: 400, letterSpacing: '-0.3px',
            }}
          >
            ArchFlow
          </span>
          <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 8, fontWeight: 400, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C4C4BC' }}>
            By The Blueprint Lab
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{
                color: '#6B6B65', fontSize: '14px',
                textDecoration: 'none', transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#1A5C3A')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#6B6B65')}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            style={{
              padding: '8px 20px', borderRadius: '8px',
              border: '1px solid #1A5C3A', color: '#1A5C3A',
              fontSize: '14px', fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap',
            }}
          >
            Se connecter
          </Link>
          <Link
            href="/register"
            style={{
              padding: '8px 20px', borderRadius: '8px',
              background: '#1F6B44', color: 'white',
              fontSize: '14px', fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap',
            }}
          >
            Commencer →
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="flex md:hidden"
          onClick={() => setOpen(!open)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1A1A18', padding: '4px' }}
          aria-label="Menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          className="md:hidden"
          style={{
            background: 'white', borderTop: '1px solid #E8E8E3',
            padding: '16px 24px 28px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                style={{ color: '#6B6B65', fontSize: '15px', textDecoration: 'none' }}
              >
                {link.label}
              </a>
            ))}
            <hr style={{ border: 'none', borderTop: '1px solid #E8E8E3', margin: '4px 0' }} />
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              style={{
                padding: '11px 20px', borderRadius: '8px', textAlign: 'center',
                border: '1px solid #1A5C3A', color: '#1A5C3A',
                fontSize: '14px', fontWeight: 500, textDecoration: 'none',
              }}
            >
              Se connecter
            </Link>
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              style={{
                padding: '11px 20px', borderRadius: '8px', textAlign: 'center',
                background: '#1F6B44', color: 'white',
                fontSize: '14px', fontWeight: 500, textDecoration: 'none',
              }}
            >
              Commencer →
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
