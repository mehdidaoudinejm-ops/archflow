import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const checks: Record<string, { ok: boolean; message: string }> = {}

  // Vérifier les variables d'environnement critiques
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL',
    'ADMIN_EMAILS',
  ]

  const missingVars = requiredEnvVars.filter((v) => !process.env[v])
  checks.env = {
    ok: missingVars.length === 0,
    message: missingVars.length === 0
      ? 'Toutes les variables critiques sont présentes'
      : `Variables manquantes : ${missingVars.join(', ')}`,
  }

  // Vérifier la connexion Prisma / base de données
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = { ok: true, message: 'Connexion Prisma OK' }
  } catch (error) {
    checks.database = {
      ok: false,
      message: `Erreur Prisma : ${error instanceof Error ? error.message : String(error)}`,
    }
  }

  // Vérifier la configuration Supabase (URL valide)
  checks.supabase = {
    ok: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https://') &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
    message: process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https://')
      ? 'URL Supabase configurée'
      : 'NEXT_PUBLIC_SUPABASE_URL manquante ou invalide',
  }

  const allOk = Object.values(checks).every((c) => c.ok)

  return NextResponse.json(
    { status: allOk ? 'ok' : 'degraded', checks },
    { status: allOk ? 200 : 503 }
  )
}
