export function NewAOEmail({ agencyName, aoName, projectName, deadline, portalUrl }: {
  agencyName: string
  aoName: string
  projectName: string
  deadline: string
  portalUrl: string
}): string {
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
        <p style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1A1A18">Nouvel appel d'offre disponible</p>
        <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#6B6B65"><strong style="color:#1A1A18">${agencyName}</strong> vous a invité à soumettre une offre pour le projet <strong style="color:#1A1A18">${projectName}</strong>.</p>
        <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#6B6B65">Appel d'offre : <strong style="color:#1A1A18">${aoName}</strong></p>
        <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#6B6B65">Date limite : <strong style="color:#1A1A18">${deadline}</strong></p>
        <table cellpadding="0" cellspacing="0" style="margin:0 auto">
          <tr><td style="background:#1F6B44;border-radius:8px">
            <a href="${portalUrl}" style="display:inline-block;padding:13px 32px;color:#fff;font-size:15px;font-weight:600;text-decoration:none">Accéder au portail</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}
