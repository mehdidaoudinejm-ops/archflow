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

interface CompanySelectedEmailProps {
  companyName: string
  aoName: string
  projectName: string
  isSelected: boolean
  note?: string
  contactEmail: string
}

export function CompanySelectedEmail({
  companyName,
  aoName,
  projectName,
  isSelected,
  note,
  contactEmail,
}: CompanySelectedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {isSelected
          ? `Félicitations — Vous avez été retenu pour ${aoName}`
          : `Résultat de l'appel d'offre — ${aoName}`}
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
            {isSelected ? (
              <Section
                style={{
                  backgroundColor: '#EAF3ED',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  marginBottom: '20px',
                }}
              >
                <Text style={{ color: '#1A5C3A', margin: 0, fontWeight: '600', fontSize: '14px' }}>
                  ✓ Entreprise retenue
                </Text>
              </Section>
            ) : (
              <Section
                style={{
                  backgroundColor: '#F3F3F0',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  marginBottom: '20px',
                }}
              >
                <Text style={{ color: '#6B6B65', margin: 0, fontWeight: '600', fontSize: '14px' }}>
                  Offre non retenue
                </Text>
              </Section>
            )}

            <Heading as="h2" style={{ color: '#1A1A18', fontSize: '20px', marginBottom: '16px' }}>
              {isSelected ? 'Félicitations !' : 'Résultat de l\'appel d\'offre'}
            </Heading>

            <Text style={{ color: '#6B6B65', lineHeight: '1.6' }}>
              Bonjour <strong style={{ color: '#1A1A18' }}>{companyName}</strong>,
            </Text>

            {isSelected ? (
              <Text style={{ color: '#6B6B65', lineHeight: '1.6' }}>
                Nous avons le plaisir de vous informer que votre offre pour l&apos;appel d&apos;offre{' '}
                <strong style={{ color: '#1A1A18' }}>{aoName}</strong> du projet{' '}
                <strong style={{ color: '#1A1A18' }}>{projectName}</strong> a été <strong style={{ color: '#1A5C3A' }}>retenue</strong>.
                L&apos;architecte reprendra contact avec vous prochainement.
              </Text>
            ) : (
              <Text style={{ color: '#6B6B65', lineHeight: '1.6' }}>
                Nous vous informons que votre offre pour l&apos;appel d&apos;offre{' '}
                <strong style={{ color: '#1A1A18' }}>{aoName}</strong> du projet{' '}
                <strong style={{ color: '#1A1A18' }}>{projectName}</strong> n&apos;a pas été retenue.
                Nous vous remercions de votre participation.
              </Text>
            )}

            {note && (
              <Section
                style={{
                  backgroundColor: '#F3F3F0',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  margin: '16px 0',
                }}
              >
                <Text style={{ color: '#6B6B65', margin: 0, fontSize: '13px', fontStyle: 'italic' }}>
                  Note de l&apos;architecte : {note}
                </Text>
              </Section>
            )}

            <Text style={{ color: '#6B6B65', lineHeight: '1.6' }}>
              Pour toute question, contactez l&apos;architecte à :{' '}
              <a href={`mailto:${contactEmail}`} style={{ color: '#1A5C3A' }}>
                {contactEmail}
              </a>
            </Text>

            {isSelected && (
              <Section style={{ textAlign: 'center', marginTop: '32px' }}>
                <Button
                  href={`mailto:${contactEmail}`}
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
                  Contacter l&apos;architecte
                </Button>
              </Section>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
