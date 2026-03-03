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

interface WaitlistRejectedEmailProps {
  firstName: string
}

export function WaitlistRejectedEmail({ firstName }: WaitlistRejectedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Votre demande d&apos;accès ArchFlow</Preview>
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
              Bonjour {firstName},
            </Heading>
            <Text style={{ color: '#6B6B65', lineHeight: '1.6' }}>
              Nous avons bien examiné votre demande d&apos;accès à ArchFlow. Malheureusement, nous ne
              sommes pas en mesure d&apos;accepter votre candidature pour le moment.
            </Text>
            <Text style={{ color: '#6B6B65', lineHeight: '1.6' }}>
              Nous ouvrons progressivement l&apos;accès à la plateforme et devons prioriser certains
              profils. Cela ne remet pas en question la qualité de votre cabinet.
            </Text>
            <Text style={{ color: '#6B6B65', lineHeight: '1.6' }}>
              Si votre situation évolue ou si vous souhaitez plus d&apos;informations, n&apos;hésitez pas
              à nous contacter à{' '}
              <a href="mailto:hello@archflow.fr" style={{ color: '#2D7A50' }}>
                hello@archflow.fr
              </a>
            </Text>
            <Text style={{ color: '#9B9B94', fontSize: '13px', marginTop: '24px' }}>
              L&apos;équipe ArchFlow
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
