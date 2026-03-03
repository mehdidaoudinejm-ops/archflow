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

interface WaitlistApprovedEmailProps {
  firstName: string
  inviteUrl: string
}

export function WaitlistApprovedEmail({ firstName, inviteUrl }: WaitlistApprovedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Votre accès ArchFlow est confirmé — Créez votre compte</Preview>
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
              Votre demande d&apos;accès à ArchFlow a été{' '}
              <strong style={{ color: '#1F6B44' }}>approuvée</strong>. Vous pouvez désormais créer
              votre compte et commencer à digitaliser la gestion de vos projets.
            </Text>
            <Text style={{ color: '#6B6B65', lineHeight: '1.6' }}>
              Ce lien d&apos;invitation est valide pendant <strong style={{ color: '#1A1A18' }}>7 jours</strong>.
            </Text>
            <Section style={{ textAlign: 'center', marginTop: '32px' }}>
              <Button
                href={inviteUrl}
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
                Créer mon compte ArchFlow
              </Button>
            </Section>
            <Text style={{ color: '#9B9B94', fontSize: '12px', marginTop: '24px' }}>
              Si vous n&apos;attendiez pas cet email, ignorez-le.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
