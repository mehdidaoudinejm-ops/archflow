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

interface InvitationEmailProps {
  agencyName: string
  aoName: string
  projectName: string
  deadline: string
  inviteUrl: string
}

export function InvitationEmail({
  agencyName,
  aoName,
  projectName,
  deadline,
  inviteUrl,
}: InvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {agencyName} vous invite à répondre à un appel d&apos;offre
      </Preview>
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
              Invitation à répondre à un appel d&apos;offre
            </Heading>
            <Text style={{ color: '#6B6B65', lineHeight: '1.6' }}>
              <strong style={{ color: '#1A1A18' }}>{agencyName}</strong> vous invite à soumettre
              une offre pour le projet{' '}
              <strong style={{ color: '#1A1A18' }}>{projectName}</strong>.
            </Text>
            <Text style={{ color: '#6B6B65', lineHeight: '1.6' }}>
              Appel d&apos;offre :{' '}
              <strong style={{ color: '#1A1A18' }}>{aoName}</strong>
            </Text>
            <Text style={{ color: '#6B6B65', lineHeight: '1.6' }}>
              Date limite :{' '}
              <strong style={{ color: '#1A1A18' }}>{deadline}</strong>
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
                Créer mon compte et répondre
              </Button>
            </Section>
            <Text style={{ color: '#9B9B94', fontSize: '12px', marginTop: '24px' }}>
              Ce lien est valide 48h après la date limite. Si vous n&apos;attendiez pas cette
              invitation, ignorez cet email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
