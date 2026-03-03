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

interface BroadcastEmailProps {
  subject: string
  body: string
}

export function BroadcastEmail({ subject, body }: BroadcastEmailProps) {
  // Convertir les sauts de ligne en paragraphes
  const paragraphs = body.split('\n').filter(p => p.trim())

  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
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
            {paragraphs.map((para, i) => (
              <Text key={i} style={{ color: '#6B6B65', lineHeight: '1.6', marginBottom: '12px' }}>
                {para}
              </Text>
            ))}
            <Text style={{ color: '#9B9B94', fontSize: '12px', marginTop: '32px', borderTop: '1px solid #E8E8E3', paddingTop: '16px' }}>
              Vous recevez cet email car vous êtes inscrit sur ArchFlow.
              Pour vous désabonner, contactez-nous à{' '}
              <a href="mailto:hello@archflow.fr" style={{ color: '#2D7A50' }}>
                hello@archflow.fr
              </a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
