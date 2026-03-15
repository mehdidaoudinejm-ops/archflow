export function ClientInvitationEmail({
  projectName,
  agencyName,
  magicLink,
}: {
  projectName: string
  agencyName: string
  magicLink: string
}): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Votre espace client ArchFlow</title>
</head>
<body style="margin:0;padding:0;background:#F8F8F6;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F8F6;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#1A5C3A;padding:28px 40px;">
              <p style="margin:0;font-size:22px;color:#ffffff;font-weight:700;letter-spacing:-0.3px;">ArchFlow</p>
              <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.6);letter-spacing:0.15em;text-transform:uppercase;">Espace client</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#1A1A18;">Votre espace projet est prêt</p>
              <p style="margin:0 0 24px;font-size:14px;color:#6B6B65;line-height:1.6;">
                <strong style="color:#1A1A18;">${agencyName}</strong> vous a créé un accès dédié pour suivre l'avancement de votre projet <strong style="color:#1A1A18;">${projectName}</strong>.
              </p>

              <p style="margin:0 0 24px;font-size:14px;color:#6B6B65;line-height:1.6;">
                Depuis votre espace, vous pourrez consulter l'état de la consultation des entreprises et accéder aux informations que votre architecte choisit de partager avec vous.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:8px 0 28px;">
                <tr>
                  <td style="background:#1A5C3A;border-radius:10px;">
                    <a href="${magicLink}" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Accéder à mon espace projet →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 4px;font-size:12px;color:#9B9B94;">Ce lien est à usage unique et expire dans 24h.</p>
              <p style="margin:0;font-size:12px;color:#9B9B94;">Si vous n'attendiez pas cet email, vous pouvez l'ignorer.</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #E8E8E3;">
              <p style="margin:0;font-size:11px;color:#9B9B94;">ArchFlow · By The Blueprint Lab</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
