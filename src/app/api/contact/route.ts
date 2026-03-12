import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sendEmail } from '@/lib/email'

const schema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  subject: z.string().min(2).max(200).optional(),
  message: z.string().min(10).max(3000),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, subject, message } = schema.parse(body)

    await sendEmail({
      to: 'contact@the-blueprint-lab.com',
      subject: subject ? `[ArchFlow Contact] ${subject}` : `[ArchFlow Contact] Message de ${name}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="color:#1A5C3A;margin-bottom:4px;">Nouveau message via ArchFlow</h2>
          <hr style="border:none;border-top:1px solid #E8E8E3;margin:16px 0;">
          <p><strong>Nom :</strong> ${name}</p>
          <p><strong>Email :</strong> <a href="mailto:${email}">${email}</a></p>
          ${subject ? `<p><strong>Sujet :</strong> ${subject}</p>` : ''}
          <p><strong>Message :</strong></p>
          <div style="background:#F8F8F6;border-radius:8px;padding:16px;white-space:pre-wrap;font-size:14px;color:#1A1A18;">${message}</div>
          <hr style="border:none;border-top:1px solid #E8E8E3;margin:24px 0;">
          <p style="font-size:12px;color:#9B9B94;">Envoyé depuis archflow.fr</p>
        </div>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
    }
    console.error('[contact]', error)
    return NextResponse.json({ error: 'Erreur lors de l\'envoi' }, { status: 500 })
  }
}
