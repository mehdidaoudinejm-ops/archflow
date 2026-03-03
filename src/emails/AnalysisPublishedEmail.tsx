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

interface AnalysisPublishedEmailProps {
  clientName: string
  projectName: string
  architectName: string
  clientUrl: string
}

export function AnalysisPublishedEmail({
  clientName,
  projectName,
  architectName,
  clientUrl,
}: AnalysisPublishedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>L&apos;analyse des offres est disponible — {projectName}</Preview>
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
              Analyse des offres disponible
            </Heading>
            <Text style={{ color: '#6B6B65', lineHeight: '1.6' }}>
              Bonjour <strong style={{ color: '#1A1A18' }}>{clientName}</strong>,
            </Text>
            <Text style={{ color: '#6B6B65', lineHeight: '1.6' }}>
              <strong style={{ color: '#1A1A18' }}>{architectName}</strong> a publié l&apos;analyse
              comparative des offres reçues pour votre projet{' '}
              <strong style={{ color: '#1A1A18' }}>{projectName}</strong>.
            </Text>
            <Text style={{ color: '#6B6B65', lineHeight: '1.6' }}>
              Vous pouvez maintenant consulter le tableau comparatif et les recommandations
              dans votre espace client.
            </Text>
            <Section style={{ textAlign: 'center', marginTop: '32px' }}>
              <Button
                href={clientUrl}
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
                Voir l&apos;analyse
              </Button>
            </Section>
            <Text style={{ color: '#9B9B94', fontSize: '12px', marginTop: '24px' }}>
              Vous recevez ce message car vous êtes client du cabinet{' '}
              <strong>{architectName}</strong> sur ArchFlow.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
