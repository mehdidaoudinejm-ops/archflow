interface WaitlistInviteEmailProps {
  firstName: string
  inviteUrl: string
}

export function WaitlistInviteEmail({ firstName, inviteUrl }: WaitlistInviteEmailProps) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Votre accès ArchFlow est prêt</title>
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#F8F8F6', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: '#F8F8F6', padding: '40px 16px' }}>
          <tbody>
            <tr>
              <td align="center">
                <table width="520" cellPadding={0} cellSpacing={0} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E8E8E3', overflow: 'hidden' }}>
                  <tbody>
                    {/* Header */}
                    <tr>
                      <td style={{ backgroundColor: '#1A5C3A', padding: '24px 32px' }}>
                        <span style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px' }}>
                          ArchFlow
                        </span>
                      </td>
                    </tr>

                    {/* Content */}
                    <tr>
                      <td style={{ padding: '32px 32px 28px' }}>
                        <p style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 600, color: '#1A1A18' }}>
                          Bonjour {firstName},
                        </p>
                        <p style={{ margin: '0 0 12px', fontSize: 15, lineHeight: '1.7', color: '#6B6B65' }}>
                          Bonne nouvelle — votre demande d&apos;accès à ArchFlow a été approuvée.
                        </p>
                        <p style={{ margin: '0 0 28px', fontSize: 15, lineHeight: '1.7', color: '#6B6B65' }}>
                          Cliquez sur le bouton ci-dessous pour créer votre compte et commencer à gérer vos projets d&apos;architecture.
                        </p>

                        {/* Button */}
                        <table cellPadding={0} cellSpacing={0} style={{ margin: '0 auto 28px' }}>
                          <tbody>
                            <tr>
                              <td style={{ backgroundColor: '#1F6B44', borderRadius: 8 }}>
                                <a
                                  href={inviteUrl}
                                  style={{ display: 'inline-block', padding: '13px 32px', color: '#FFFFFF', fontSize: 15, fontWeight: 600, textDecoration: 'none' }}
                                >
                                  Créer mon compte
                                </a>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        <p style={{ margin: '0 0 24px', fontSize: 13, color: '#9B9B94', lineHeight: '1.6' }}>
                          Ce lien est valable <strong>7 jours</strong>. Si vous n&apos;avez pas demandé d&apos;accès, ignorez cet email.
                        </p>

                        <hr style={{ border: 'none', borderTop: '1px solid #E8E8E3', margin: '0 0 16px' }} />

                        <p style={{ margin: 0, fontSize: 12, color: '#9B9B94', textAlign: 'center' }}>
                          ArchFlow — La plateforme de gestion de projet pour architectes d&apos;intérieur
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  )
}
