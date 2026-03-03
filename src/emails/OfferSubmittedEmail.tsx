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

interface OfferSubmittedEmailProps {
  companyName: string
  aoName: string
  projectName: string
  submittedAt: string
  portalUrl: string
}

export function OfferSubmittedEmail({
  companyName,
  aoName,
  projectName,
  submittedAt,
  portalUrl,
}: OfferSubmittedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Votre offre a bien été enregistrée — {aoName}</Preview>
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
              Votre offre a bien été enregistrée
            </Heading>
            <Text style={{ color: '#6B6B65', lineHeight: '1.6' }}>
              Bonjour <strong style={{ color: '#1A1A18' }}>{companyName}</strong>,
            </Text>
            <Text style={{ color: '#6B6B65', lineHeight: '1.6' }}>
              Votre offre pour l&apos;appel d&apos;offre{' '}
              <strong style={{ color: '#1A1A18' }}>{aoName}</strong> du projet{' '}
              <strong style={{ color: '#1A1A18' }}>{projectName}</strong> a bien été soumise le{' '}
              <strong style={{ color: '#1A1A18' }}>{submittedAt}</strong>.
            </Text>
            <Text style={{ color: '#6B6B65', lineHeight: '1.6' }}>
              Vous pouvez consulter votre offre sur le portail à tout moment.
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
                Voir mon offre
              </Button>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
