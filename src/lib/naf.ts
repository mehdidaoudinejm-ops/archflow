// Table NAF 2008 — codes APE les plus courants pour le BTP et les services liés
// Source : INSEE classification des activités françaises (NAF rév. 2, 2008)

const NAF_LABELS: Record<string, string> = {
  // ── Section F — Construction ──────────────────────────────────────────────
  '41.10A': 'Promotion immobilière de logements',
  '41.10B': "Promotion immobilière d'autres bâtiments",
  '41.20A': 'Construction de maisons individuelles',
  '41.20B': "Construction d'autres bâtiments",
  '42.11Z': 'Construction de routes et autoroutes',
  '42.12Z': 'Construction de voies ferrées',
  '42.13A': "Construction d'ouvrages d'art",
  '42.13B': 'Construction et entretien de tunnels',
  '42.21Z': 'Construction de réseaux pour fluides',
  '42.22Z': 'Construction de réseaux électriques et de télécommunications',
  '42.91Z': 'Construction d\'ouvrages maritimes et fluviaux',
  '42.99Z': "Construction d'autres ouvrages de génie civil",
  '43.11Z': 'Travaux de démolition',
  '43.12A': 'Travaux de terrassement courants et travaux préparatoires',
  '43.12B': 'Travaux de terrassement spécialisés ou de grande masse',
  '43.13Z': 'Forages et sondages',
  '43.21A': "Travaux d'installation électrique dans tous locaux",
  '43.21B': "Travaux d'installation électrique sur la voie publique",
  '43.22A': "Travaux d'installation d'eau et de gaz en tous locaux",
  '43.22B': "Travaux d'installation d'équipements thermiques et de climatisation",
  '43.29A': "Autres travaux d'installation",
  '43.29B': 'Installation de cuisines professionnelles, fours et brûleurs',
  '43.31Z': 'Travaux de plâtrerie',
  '43.32A': 'Travaux de menuiserie bois et PVC',
  '43.32B': 'Travaux de menuiserie métallique et serrurerie',
  '43.32C': 'Agencement de lieux de vente',
  '43.33Z': 'Travaux de revêtement des sols et des murs',
  '43.34Z': 'Travaux de peinture et vitrerie',
  '43.39Z': 'Autres travaux de finition',
  '43.91A': 'Travaux de charpente',
  '43.91B': 'Travaux de couverture par éléments',
  '43.99A': "Travaux d'étanchéification",
  '43.99B': 'Travaux de montage de structures métalliques',
  '43.99C': "Travaux de maçonnerie générale et gros œuvre de bâtiment",
  '43.99D': "Autres travaux spécialisés de construction",
  '43.99E': 'Location avec opérateur de matériel de construction',
  // ── Section L — Immobilier ────────────────────────────────────────────────
  '68.10Z': 'Activités des marchands de biens immobiliers',
  '68.20A': 'Location de logements',
  '68.20B': 'Location de terrains et d\'autres biens immobiliers',
  '68.31Z': 'Agences immobilières',
  '68.32A': "Administration d'immeubles et autres biens immobiliers",
  // ── Section M — Activités spécialisées ───────────────────────────────────
  '70.10Z': 'Activités des sièges sociaux',
  '71.11Z': "Activités d'architecture",
  '71.12A': 'Conseil et assistance technique',
  '71.12B': 'Ingénierie et études techniques',
  '74.10Z': 'Activités spécialisées de design',
  // ── Commerce ──────────────────────────────────────────────────────────────
  '46.13Z': 'Commerce de bois et matériaux de construction (agents)',
  '46.73A': 'Commerce de gros de bois et matériaux de construction',
  '46.73B': "Commerce de gros d'appareils sanitaires et de décoration",
  '47.52A': 'Commerce de détail de quincaillerie, peintures et verres',
  '47.52B': 'Commerce de détail de matériaux de construction et bricolage',
}

export function getNafLabel(code: string): string | null {
  return NAF_LABELS[code] ?? null
}
