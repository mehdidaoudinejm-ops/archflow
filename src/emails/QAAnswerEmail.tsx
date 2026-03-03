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

interface QAAnswerEmailProps {
  companyName: string
  questionTitle: string
  answer: string
  aoName: string
  portalUrl: string
}

export function QAAnswerEmail({
  companyName,
  questionTitle,
  answer,
  aoName,
  portalUrl,
}: QAAnswerEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Votre question a reçu une réponse — {aoName}</Preview>
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
              Réponse à votre question
            </Heading>
            <Text style={{ color: '#6B6B65', lineHeight: '1.6' }}>
              Bonjour <strong style={{ color: '#1A1A18' }}>{companyName}</strong>,
            </Text>
            <Text style={{ color: '#6B6B65', lineHeight: '1.6' }}>
              L&apos;architecte a répondu à votre question dans le cadre de l&apos;appel d&apos;offre{' '}
              <strong style={{ color: '#1A1A18' }}>{aoName}</strong>.
            </Text>

            {/* Question */}
            <Section
              style={{
                backgroundColor: '#F3F3F0',
                borderRadius: '6px',
                padding: '12px 16px',
                margin: '16px 0 8px',
                borderLeft: '3px solid #D4D4CC',
              }}
            >
              <Text style={{ color: '#6B6B65', margin: 0, fontSize: '13px', fontStyle: 'italic' }}>
                {questionTitle}
              </Text>
            </Section>

            {/* Réponse */}
            <Section
              style={{
                backgroundColor: '#EAF3ED',
                borderRadius: '6px',
                padding: '12px 16px',
                margin: '8px 0 16px',
                borderLeft: '3px solid #1A5C3A',
              }}
            >
              <Text style={{ color: '#1A1A18', margin: 0, fontSize: '14px', lineHeight: '1.6' }}>
                {answer}
              </Text>
            </Section>

            <Section style={{ textAlign: 'center', marginTop: '24px' }}>
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
                Voir toutes les Q&amp;A
              </Button>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
