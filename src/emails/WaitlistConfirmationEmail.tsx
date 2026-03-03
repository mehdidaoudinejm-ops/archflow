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

interface WaitlistConfirmationEmailProps {
  firstName: string
  cabinetName: string
}

export function WaitlistConfirmationEmail({
  firstName,
  cabinetName,
}: WaitlistConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Votre demande d&apos;accès ArchFlow a bien été reçue</Preview>
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
              Demande bien reçue, {firstName} !
            </Heading>
            <Text style={{ color: '#6B6B65', lineHeight: '1.6' }}>
              Merci pour votre intérêt pour ArchFlow. Nous avons bien reçu la demande d&apos;accès
              de <strong style={{ color: '#1A1A18' }}>{cabinetName}</strong>.
            </Text>
            <Text style={{ color: '#6B6B65', lineHeight: '1.6' }}>
              Notre équipe examine chaque demande avec attention. Nous reviendrons vers vous
              sous <strong style={{ color: '#1A1A18' }}>48h</strong> pour vous confirmer
              l&apos;accès à la plateforme.
            </Text>
            <Text style={{ color: '#9B9B94', fontSize: '13px', marginTop: '24px' }}>
              En attendant, n&apos;hésitez pas à nous contacter à{' '}
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
