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

interface DocumentUpdatedEmailProps {
  companyName: string
  aoName: string
  documentName: string
  revision: number
  portalUrl: string
}

export function DocumentUpdatedEmail({
  companyName,
  aoName,
  documentName,
  revision,
  portalUrl,
}: DocumentUpdatedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Nouveau document DCE disponible — {aoName}</Preview>
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
              Nouveau document disponible
            </Heading>
            <Text style={{ color: '#6B6B65', lineHeight: '1.6' }}>
              Bonjour <strong style={{ color: '#1A1A18' }}>{companyName}</strong>,
            </Text>
            <Text style={{ color: '#6B6B65', lineHeight: '1.6' }}>
              Un nouveau document a été ajouté au DCE de l&apos;appel d&apos;offre{' '}
              <strong style={{ color: '#1A1A18' }}>{aoName}</strong>.
            </Text>
            <Section
              style={{
                backgroundColor: '#EAF3ED',
                borderRadius: '6px',
                padding: '12px 16px',
                margin: '16px 0',
              }}
            >
              <Text style={{ color: '#1A5C3A', margin: 0, fontWeight: '500', fontSize: '14px' }}>
                {documentName}
                {revision > 1 && (
                  <span style={{ color: '#6B6B65', fontWeight: '400' }}> (révision {revision})</span>
                )}
              </Text>
            </Section>
            <Text style={{ color: '#6B6B65', lineHeight: '1.6' }}>
              Consultez ce document avant de finaliser votre offre.
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
                Voir les documents
              </Button>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
