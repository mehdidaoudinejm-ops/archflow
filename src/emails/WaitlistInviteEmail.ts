export function WaitlistInviteEmail({ firstName, inviteUrl }: { firstName: string; inviteUrl: string }): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Votre accès ArchFlow est prêt</title></head>
<body style="margin:0;padding:0;background:#F8F8F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F8F6;padding:40px 16px">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #E8E8E3">
      <tr><td style="background:#1A5C3A;padding:24px 32px;border-radius:12px 12px 0 0">
        <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.3px">ArchFlow</span>
      </td></tr>
      <tr><td style="padding:32px">
        <p style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1A1A18">Bonjour ${firstName},</p>
        <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#6B6B65">Bonne nouvelle — votre demande d'accès à ArchFlow a été approuvée.</p>
        <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#6B6B65">Cliquez sur le bouton ci-dessous pour créer votre compte et commencer à gérer vos projets d'architecture.</p>
        <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px">
          <tr><td style="background:#1F6B44;border-radius:8px">
            <a href="${inviteUrl}" style="display:inline-block;padding:13px 32px;color:#fff;font-size:15px;font-weight:600;text-decoration:none">Créer mon compte</a>
          </td></tr>
        </table>
        <p style="margin:0 0 24px;font-size:13px;color:#9B9B94;line-height:1.6">Ce lien est valable <strong>7 jours</strong>. Si vous n'avez pas demandé d'accès, ignorez cet email.</p>
        <hr style="border:none;border-top:1px solid #E8E8E3;margin:0 0 16px">
        <p style="margin:0;font-size:12px;color:#9B9B94;text-align:center">ArchFlow — La plateforme de gestion de projet pour architectes d'intérieur</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}
