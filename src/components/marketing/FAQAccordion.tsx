'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const FAQS = [
  {
    question: "Les entreprises peuvent-elles voir les estimatifs de l'architecte ?",
    answer:
      "Non, jamais. Les prix unitaires et totaux estimatifs de l'architecte sont strictement confidentiels. Les entreprises consultées renseignent uniquement leurs propres prix — elles n'ont accès à aucune donnée de l'estimatif.",
  },
  {
    question: "Puis-je importer un DPGF Excel existant ?",
    answer:
      "Oui. ArchFlow intègre un import IA qui analyse automatiquement vos fichiers Excel, CSV ou PDF et reconstruit la structure lots / postes avec leurs références, unités et quantités. Le processus prend moins de 30 secondes.",
  },
  {
    question: "Les entreprises doivent-elles payer pour répondre à un appel d'offre ?",
    answer:
      "Non, jamais. Les entreprises invitées accèdent gratuitement au portail pour consulter les documents DCE et soumettre leur offre. Seuls les architectes paient un abonnement ArchFlow.",
  },
  {
    question: "Mes données sont-elles sécurisées ?",
    answer:
      "Oui. ArchFlow est hébergé en Europe (AWS Paris), respecte le RGPD, et toutes les données sont chiffrées en transit (TLS) et au repos (AES-256). Nous ne partageons jamais vos données avec des tiers.",
  },
]

export function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {FAQS.map((faq, i) => (
        <div
          key={i}
          style={{
            background: 'white',
            border: '1px solid #E8E8E3',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            style={{
              width: '100%', textAlign: 'left',
              padding: '18px 24px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px',
              background: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '15px', fontWeight: 500, color: '#1A1A18', lineHeight: '1.5' }}>
              {faq.question}
            </span>
            <ChevronDown
              size={18}
              style={{
                color: '#9B9B94', flexShrink: 0,
                transform: openIndex === i ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.22s ease',
              }}
            />
          </button>

          {openIndex === i && (
            <div
              style={{
                padding: '0 24px 20px',
                borderTop: '1px solid #F3F3F0',
              }}
            >
              <p style={{ fontSize: '14px', color: '#6B6B65', lineHeight: '1.75', margin: '16px 0 0' }}>
                {faq.answer}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
