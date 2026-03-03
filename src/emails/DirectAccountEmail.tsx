import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface DirectAccountEmailProps {
  firstName: string
  email: string
  tempPassword: string
  loginUrl: string
}

export function DirectAccountEmail({
  firstName,
  email,
  tempPassword,
  loginUrl,
}: DirectAccountEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Votre accès ArchFlow est prêt — connectez-vous dès maintenant</Preview>
      <Body style={{ backgroundColor: '#F8F8F6', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ color: '#1A5C3A', fontSize: '28px', marginBottom: '8px' }}>
            ArchFlow
          </Heading>
          <Section
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              padding: '32px',
              border: '1px solid #E8E8E3',
            }}
          >
            <Heading as="h2" style={{ color: '#1A1A18', fontSize: '20px', marginBottom: '16px' }}>
              Bienvenue, {firstName} !
            </Heading>
            <Text style={{ color: '#6B6B65', lineHeight: '1.6' }}>
              Votre compte ArchFlow a été créé. Voici vos identifiants de connexion :
            </Text>
            <Section
              style={{
                backgroundColor: '#F3F3F0',
                borderRadius: '6px',
                padding: '16px',
                margin: '16px 0',
              }}
            >
              <Text style={{ color: '#1A1A18', margin: '0 0 8px', fontSize: '14px' }}>
                <strong>Email :</strong> {email}
              </Text>
              <Text style={{ color: '#1A1A18', margin: '0', fontSize: '14px' }}>
                <strong>Mot de passe temporaire :</strong>{' '}
                <span style={{ fontFamily: 'monospace', background: '#E8E8E3', padding: '2px 6px', borderRadius: '4px' }}>
                  {tempPassword}
                </span>
              </Text>
            </Section>
            <Text style={{ color: '#B45309', fontSize: '13px', lineHeight: '1.5' }}>
              ⚠️ Changez votre mot de passe dès votre première connexion via les paramètres de votre compte.
            </Text>
            <Section style={{ textAlign: 'center', marginTop: '28px' }}>
              <Button
                href={loginUrl}
                style={{
                  backgroundColor: '#1F6B44',
                  color: '#FFFFFF',
                  padding: '14px 28px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '500',
                  fontSize: '14px',
                  display: 'inline-block',
                }}
              >
                Me connecter à ArchFlow
              </Button>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
