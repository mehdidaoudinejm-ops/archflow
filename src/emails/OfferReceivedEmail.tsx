import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface OfferReceivedEmailProps {
  architectName: string
  companyName: string
  aoName: string
  projectName: string
}

export function OfferReceivedEmail({
  architectName,
  companyName,
  aoName,
  projectName,
}: OfferReceivedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {companyName} a soumis une offre pour {aoName}
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
              Nouvelle offre reçue
            </Heading>
            <Text style={{ color: '#6B6B65', lineHeight: '1.6' }}>
              Bonjour {architectName},
            </Text>
            <Text style={{ color: '#6B6B65', lineHeight: '1.6' }}>
              <strong style={{ color: '#1A1A18' }}>{companyName}</strong> a soumis une offre
              pour l&apos;appel d&apos;offre{' '}
              <strong style={{ color: '#1A1A18' }}>{aoName}</strong> du projet{' '}
              <strong style={{ color: '#1A1A18' }}>{projectName}</strong>.
            </Text>
            <Text style={{ color: '#6B6B65', lineHeight: '1.6' }}>
              Connectez-vous à ArchFlow pour consulter cette offre dans le tableau de suivi.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
