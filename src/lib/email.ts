import { Resend } from 'resend'
import type { ReactElement } from 'react'

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string
  subject: string
  react: ReactElement
}): Promise<void> {
  // En développement sans clé Resend : on ne bloque pas
  if (process.env.NODE_ENV === 'development' && !process.env.RESEND_API_KEY) {
    console.log(`[DEV EMAIL] À: ${to} | Sujet: ${subject}`)
    return
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'noreply@archflow.fr',
    to,
    subject,
    react,
  })

  if (error) throw new Error(error.message)
}
