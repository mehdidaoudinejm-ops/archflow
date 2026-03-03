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

interface WaitlistAdminEmailProps {
  firstName: string
  lastName: string
  cabinetName: string
  city: string
  email: string
  message?: string
  adminUrl: string
}

export function WaitlistAdminEmail({
  firstName,
  lastName,
  cabinetName,
  city,
  email,
  message,
  adminUrl,
}: WaitlistAdminEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Nouvelle demande d&apos;accès — {firstName} {lastName} — {cabinetName}
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
              Nouvelle demande d&apos;accès
            </Heading>
            <Text style={{ color: '#6B6B65', lineHeight: '1.6', margin: '0 0 8px' }}>
              <strong style={{ color: '#1A1A18' }}>Nom :</strong> {firstName} {lastName}
            </Text>
            <Text style={{ color: '#6B6B65', lineHeight: '1.6', margin: '0 0 8px' }}>
              <strong style={{ color: '#1A1A18' }}>Cabinet :</strong> {cabinetName}
            </Text>
            <Text style={{ color: '#6B6B65', lineHeight: '1.6', margin: '0 0 8px' }}>
              <strong style={{ color: '#1A1A18' }}>Ville :</strong> {city}
            </Text>
            <Text style={{ color: '#6B6B65', lineHeight: '1.6', margin: '0 0 8px' }}>
              <strong style={{ color: '#1A1A18' }}>Email :</strong> {email}
            </Text>
            {message && (
              <Section
                style={{
                  backgroundColor: '#F3F3F0',
                  borderRadius: '6px',
                  padding: '16px',
                  marginTop: '16px',
                }}
              >
                <Text style={{ color: '#1A1A18', fontSize: '13px', fontWeight: '600', margin: '0 0 8px' }}>
                  Message :
                </Text>
                <Text style={{ color: '#6B6B65', lineHeight: '1.6', margin: '0', fontSize: '14px' }}>
                  {message}
                </Text>
              </Section>
            )}
            <Section style={{ textAlign: 'center', marginTop: '32px' }}>
              <Button
                href={adminUrl}
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
                Gérer la liste d&apos;attente
              </Button>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
