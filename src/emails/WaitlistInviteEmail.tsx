import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface WaitlistInviteEmailProps {
  firstName: string
  inviteUrl: string
}

export function WaitlistInviteEmail({ firstName, inviteUrl }: WaitlistInviteEmailProps) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>Votre accès ArchFlow est prêt — créez votre compte maintenant</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logo}>ArchFlow</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Text style={greeting}>Bonjour {firstName},</Text>
            <Text style={paragraph}>
              Bonne nouvelle — votre demande d&apos;accès à ArchFlow a été approuvée.
            </Text>
            <Text style={paragraph}>
              Cliquez sur le bouton ci-dessous pour créer votre compte et commencer à gérer vos
              projets d&apos;architecture.
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={inviteUrl}>
                Créer mon compte
              </Button>
            </Section>

            <Text style={hint}>
              Ce lien est valable <strong>7 jours</strong>. Si vous n&apos;avez pas demandé
              d&apos;accès, ignorez cet email.
            </Text>

            <Hr style={hr} />

            <Text style={footer}>
              ArchFlow — La plateforme de gestion de projet pour architectes d&apos;intérieur
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// ── Styles ─────────────────────────────────────────────

const body: React.CSSProperties = {
  backgroundColor: '#F8F8F6',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}

const container: React.CSSProperties = {
  maxWidth: 520,
  margin: '40px auto',
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  border: '1px solid #E8E8E3',
  overflow: 'hidden',
}

const header: React.CSSProperties = {
  backgroundColor: '#1A5C3A',
  padding: '24px 32px',
}

const logo: React.CSSProperties = {
  color: '#FFFFFF',
  fontSize: 22,
  fontWeight: 700,
  margin: 0,
  letterSpacing: '-0.3px',
}

const content: React.CSSProperties = {
  padding: '32px 32px 24px',
}

const greeting: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  color: '#1A1A18',
  marginBottom: 16,
  marginTop: 0,
}

const paragraph: React.CSSProperties = {
  fontSize: 15,
  lineHeight: '1.7',
  color: '#6B6B65',
  marginBottom: 16,
  marginTop: 0,
}

const buttonContainer: React.CSSProperties = {
  textAlign: 'center',
  margin: '28px 0',
}

const button: React.CSSProperties = {
  backgroundColor: '#1F6B44',
  color: '#FFFFFF',
  padding: '13px 32px',
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 600,
  textDecoration: 'none',
  display: 'inline-block',
}

const hint: React.CSSProperties = {
  fontSize: 13,
  color: '#9B9B94',
  lineHeight: '1.6',
  marginTop: 0,
}

const hr: React.CSSProperties = {
  borderColor: '#E8E8E3',
  margin: '24px 0 16px',
}

const footer: React.CSSProperties = {
  fontSize: 12,
  color: '#9B9B94',
  textAlign: 'center',
  margin: 0,
}
