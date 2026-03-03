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

interface ReminderEmailProps {
  companyName: string
  aoName: string
  projectName: string
  deadline: string
  daysLeft: number
  portalUrl: string
}

export function ReminderEmail({
  companyName,
  aoName,
  projectName,
  deadline,
  daysLeft,
  portalUrl,
}: ReminderEmailProps) {
  const urgencyColor = daysLeft <= 3 ? '#9B1C1C' : '#B45309'
  const urgencyBg = daysLeft <= 3 ? '#FEE8E8' : '#FEF3E2'

  return (
    <Html>
      <Head />
      <Preview>
        {`Plus que ${daysLeft} jour${daysLeft > 1 ? 's' : ''} pour déposer votre offre — ${aoName}`}
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
            <Section
              style={{
                backgroundColor: urgencyBg,
                borderRadius: '6px',
                padding: '12px 16px',
                marginBottom: '20px',
              }}
            >
              <Text style={{ color: urgencyColor, margin: 0, fontWeight: '600', fontSize: '14px' }}>
                ⏰ Plus que {daysLeft} jour{daysLeft > 1 ? 's' : ''} pour déposer votre offre
              </Text>
            </Section>

            <Heading as="h2" style={{ color: '#1A1A18', fontSize: '20px', marginBottom: '16px' }}>
              Rappel : offre en attente
            </Heading>
            <Text style={{ color: '#6B6B65', lineHeight: '1.6' }}>
              Bonjour <strong style={{ color: '#1A1A18' }}>{companyName}</strong>,
            </Text>
            <Text style={{ color: '#6B6B65', lineHeight: '1.6' }}>
              Vous avez été invité à répondre à l&apos;appel d&apos;offre{' '}
              <strong style={{ color: '#1A1A18' }}>{aoName}</strong> pour le projet{' '}
              <strong style={{ color: '#1A1A18' }}>{projectName}</strong>.
            </Text>
            <Text style={{ color: '#6B6B65', lineHeight: '1.6' }}>
              La date limite de soumission est le{' '}
              <strong style={{ color: '#1A1A18' }}>{deadline}</strong>.
            </Text>
            <Section style={{ textAlign: 'center', marginTop: '32px' }}>
              <Button
                href={portalUrl}
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
                Déposer mon offre
              </Button>
            </Section>
            <Text style={{ color: '#9B9B94', fontSize: '12px', marginTop: '24px' }}>
              Si vous avez déjà soumis votre offre, ignorez ce message.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
