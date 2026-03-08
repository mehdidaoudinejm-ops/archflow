import { Resend } from 'resend'

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
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
    html,
  })

  if (error) throw new Error(error.message)
}
