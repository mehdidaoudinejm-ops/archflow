export function ReminderEmail({ companyName, aoName, projectName, deadline, daysLeft, portalUrl }: {
  companyName: string
  aoName: string
  projectName: string
  deadline: string
  daysLeft: number
  portalUrl: string
}): string {
  const urgencyColor = daysLeft <= 3 ? '#9B1C1C' : '#B45309'
  const urgencyBg = daysLeft <= 3 ? '#FEE8E8' : '#FEF3E2'
  const dayLabel = daysLeft > 1 ? 'jours' : 'jour'

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8F8F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F8F6;padding:40px 16px">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #E8E8E3">
      <tr><td style="background:#1A5C3A;padding:24px 32px;border-radius:12px 12px 0 0">
        <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.3px">ArchFlow</span>
      </td></tr>
      <tr><td style="padding:32px">
        <div style="background:${urgencyBg};border-radius:6px;padding:12px 16px;margin-bottom:20px">
          <p style="color:${urgencyColor};margin:0;font-weight:600;font-size:14px">⏰ Plus que ${daysLeft} ${dayLabel} pour déposer votre offre</p>
        </div>
        <p style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1A1A18">Rappel : offre en attente</p>
        <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#6B6B65">Bonjour <strong style="color:#1A1A18">${companyName}</strong>,</p>
        <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#6B6B65">Vous avez été invité à répondre à l'appel d'offre <strong style="color:#1A1A18">${aoName}</strong> pour le projet <strong style="color:#1A1A18">${projectName}</strong>.</p>
        <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#6B6B65">La date limite de soumission est le <strong style="color:#1A1A18">${deadline}</strong>.</p>
        <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px">
          <tr><td style="background:#1F6B44;border-radius:8px">
            <a href="${portalUrl}" style="display:inline-block;padding:13px 32px;color:#fff;font-size:15px;font-weight:600;text-decoration:none">Déposer mon offre</a>
          </td></tr>
        </table>
        <p style="margin:0;font-size:12px;color:#9B9B94;line-height:1.6">Si vous avez déjà soumis votre offre, ignorez ce message.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}
