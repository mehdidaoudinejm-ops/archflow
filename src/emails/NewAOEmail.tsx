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

interface NewAOEmailProps {
  agencyName: string
  aoName: string
  projectName: string
  deadline: string
  portalUrl: string
}

export function NewAOEmail({
  agencyName,
  aoName,
  projectName,
  deadline,
  portalUrl,
}: NewAOEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Nouvel appel d&apos;offre de {agencyName} disponible</Preview>
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
              Nouvel appel d&apos;offre disponible
            </Heading>
            <Text style={{ color: '#6B6B65', lineHeight: '1.6' }}>
              <strong style={{ color: '#1A1A18' }}>{agencyName}</strong> vous a invité à
              soumettre une offre pour le projet{' '}
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
                Accéder au portail
              </Button>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
