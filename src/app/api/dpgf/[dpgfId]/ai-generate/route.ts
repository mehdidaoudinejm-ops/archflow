import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface Questionnaire {
  // Section 1
  typeOperation: string
  destinationBatiment: string
  surface: string
  niveaux: string
  niveauPrestations: string
  // Section 2
  espaces: string
  espacesExterieurs: string
  espacesExterieursDetail: string
  partiesCommunes: string
  // Section 3
  structurePrincipale: string
  typeFacade: string[]
  typeCouverture: string
  menuiseriesExt: string
  vitrages: string
  revetementsSol: string[]
  revetementsParois: string[]
  // Section 4
  chauffage: string
  ecs: string
  ventilation: string
  climatisation: string
  climatisationType: string
  ascenseur: string
  electriciteSpec: string[]
  // Section 5
  reprisesSousOeuvre: string
  reprisesSousOeuvreDetail: string
  amiantePlomb: string
  demolitions: string
  demolitionsDetail: string
  contraintesReg: string[]
  contraintesChantier: string[]
  infoComplementaires: string
}

interface GeneratedPost {
  title: string
  unit: string
  qty: null
  unit_price: null
  custom: boolean
}

interface GeneratedSubLot {
  number: string
  name: string
  posts: GeneratedPost[]
}

interface GeneratedLot {
  name: string
  sublots: GeneratedSubLot[]
  posts: GeneratedPost[]
}

async function checkDPGFAccess(dpgfId: string, agencyId: string) {
  const dpgf = await prisma.dPGF.findUnique({
    where: { id: dpgfId },
    include: { project: { select: { agencyId: true } } },
  })
  if (!dpgf || dpgf.project.agencyId !== agencyId) return null
  return dpgf
}

function formatQuestionnaire(q: Questionnaire): string {
  const lines: string[] = [
    '=== INFORMATIONS GÉNÉRALES ===',
    `Type d'opération : ${q.typeOperation}`,
    `Destination du bâtiment : ${q.destinationBatiment}`,
    `Surface : ${q.surface} m²`,
    `Nombre de niveaux : ${q.niveaux}`,
    `Niveau de prestations : ${q.niveauPrestations}`,
    '',
    '=== COMPOSITION DU PROJET ===',
    `Description des espaces : ${q.espaces}`,
    `Espaces extérieurs : ${q.espacesExterieurs}${q.espacesExterieurs === 'oui' && q.espacesExterieursDetail ? ` — ${q.espacesExterieursDetail}` : ''}`,
    `Parties communes : ${q.partiesCommunes}`,
    '',
    '=== MATÉRIAUX ET SYSTÈMES CONSTRUCTIFS ===',
    `Structure principale : ${q.structurePrincipale}`,
    `Type de façade : ${q.typeFacade.length > 0 ? q.typeFacade.join(', ') : 'Non précisé'}`,
    `Type de couverture : ${q.typeCouverture}`,
    `Menuiseries extérieures : ${q.menuiseriesExt}`,
    `Vitrages : ${q.vitrages}`,
    `Revêtements de sol : ${q.revetementsSol.length > 0 ? q.revetementsSol.join(', ') : 'Non précisé'}`,
    `Revêtements des parois : ${q.revetementsParois.length > 0 ? q.revetementsParois.join(', ') : 'Non précisé'}`,
    '',
    '=== ÉQUIPEMENTS TECHNIQUES ===',
    `Chauffage : ${q.chauffage}`,
    `Eau chaude sanitaire : ${q.ecs}`,
    `Ventilation : ${q.ventilation}`,
    `Climatisation : ${q.climatisation}${q.climatisation === 'oui' && q.climatisationType ? ` — ${q.climatisationType}` : ''}`,
    `Ascenseur : ${q.ascenseur}`,
    `Spécificités électricité : ${q.electriciteSpec.length > 0 ? q.electriciteSpec.join(', ') : 'Standard'}`,
    '',
    '=== CONTRAINTES ET SPÉCIFICITÉS ===',
    `Reprises en sous-œuvre : ${q.reprisesSousOeuvre}${q.reprisesSousOeuvre === 'oui' && q.reprisesSousOeuvreDetail ? ` — ${q.reprisesSousOeuvreDetail}` : ''}`,
    `Amiante / plomb : ${q.amiantePlomb}`,
    `Démolitions : ${q.demolitions}${q.demolitions === 'oui' && q.demolitionsDetail ? ` — ${q.demolitionsDetail}` : ''}`,
    `Contraintes réglementaires : ${q.contraintesReg.length > 0 ? q.contraintesReg.join(', ') : 'Aucune'}`,
    `Contraintes de chantier : ${q.contraintesChantier.length > 0 ? q.contraintesChantier.join(', ') : 'Aucune'}`,
    `Informations complémentaires : ${q.infoComplementaires || 'Aucune'}`,
  ]
  return lines.join('\n')
}

function parseGeneratedResponse(raw: string): GeneratedLot[] {
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error('[ai-generate] Pas de JSON dans la réponse :', raw.slice(0, 300))
    throw new Error("L'IA n'a pas retourné de JSON valide")
  }

  let parsed: { lots?: unknown[] }
  try {
    parsed = JSON.parse(jsonMatch[0]) as { lots?: unknown[] }
  } catch (err) {
    console.error('[ai-generate] JSON.parse échoué :', jsonMatch[0].slice(0, 300))
    throw new Error(`JSON invalide : ${err instanceof Error ? err.message : String(err)}`)
  }

  if (!Array.isArray(parsed.lots)) {
    throw new Error('Structure JSON invalide : champ "lots" manquant')
  }

  return (parsed.lots as Record<string, unknown>[]).map((lot) => ({
    name: String(lot.name ?? 'Sans nom'),
    sublots: Array.isArray(lot.sublots)
      ? (lot.sublots as Record<string, unknown>[]).map((sl) => ({
          number: String(sl.number ?? '1'),
          name: String(sl.name ?? 'Sans nom'),
          posts: Array.isArray(sl.posts)
            ? (sl.posts as Record<string, unknown>[]).map((p) => ({
                title: String(p.title ?? ''),
                unit: String(p.unit ?? 'u'),
                qty: null,
                unit_price: null,
                custom: p.custom === true,
              }))
            : [],
        }))
      : [],
    posts: Array.isArray(lot.posts)
      ? (lot.posts as Record<string, unknown>[]).map((p) => ({
          title: String(p.title ?? ''),
          unit: String(p.unit ?? 'u'),
          qty: null,
          unit_price: null,
          custom: p.custom === true,
        }))
      : [],
  }))
}

export async function POST(
  req: Request,
  { params }: { params: { dpgfId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const access = await checkDPGFAccess(params.dpgfId, user.agencyId!)
    if (!access) {
      return NextResponse.json({ error: 'DPGF introuvable' }, { status: 404 })
    }

    const body = await req.json() as { questionnaire: Questionnaire }
    const { questionnaire } = body

    if (!questionnaire || typeof questionnaire !== 'object') {
      return NextResponse.json({ error: 'Questionnaire manquant' }, { status: 422 })
    }

    // Fetch validated library items grouped by lot
    const libraryItems = await prisma.libraryItem.findMany({
      where: { validated: true },
      orderBy: [{ lot: 'asc' }, { sousLot: 'asc' }],
    })

    // Format library items grouped by lot
    const libraryByLot = new Map<string, string[]>()
    for (const item of libraryItems) {
      const lotKey = item.lot
      if (!libraryByLot.has(lotKey)) {
        libraryByLot.set(lotKey, [])
      }
      const uniteStr = item.unite ? ` (${item.unite})` : ''
      const sousLotPrefix = item.sousLot ? `[${item.sousLot}] ` : ''
      libraryByLot.get(lotKey)!.push(`  ${sousLotPrefix}${item.intitule}${uniteStr}`)
    }

    const libraryText = Array.from(libraryByLot.entries())
      .map(([lot, items]) => `${lot}:\n${items.join('\n')}`)
      .join('\n\n')

    const projectText = formatQuestionnaire(questionnaire)

    const systemPrompt = `Tu es un expert en DPGF (Décomposition du Prix Global et Forfaitaire) du bâtiment français. Tu dois générer une liste de lots, sous-lots et postes adaptés à un projet spécifique, en sélectionnant uniquement les éléments pertinents depuis la bibliothèque fournie.

RÈGLES IMPORTANTES :
1. Sélectionne UNIQUEMENT les lots et postes pertinents pour ce projet spécifique — ne génère pas tout ce qui est dans la bibliothèque
2. Si un poste existe dans la bibliothèque, marque "custom": false
3. Si tu dois créer un poste qui n'existe pas dans la bibliothèque (parce que le projet le nécessite vraiment), marque "custom": true
4. Laisse toujours qty et unit_price à null
5. Organise les postes en sous-lots cohérents si nécessaire
6. Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après, sans balises markdown

Format de réponse attendu :
{
  "lots": [
    {
      "name": "VRD / Terrassements généraux",
      "sublots": [
        {
          "number": "1",
          "name": "Terrassements",
          "posts": [
            { "title": "Décapage de la terre végétale", "unit": "m²", "qty": null, "unit_price": null, "custom": false }
          ]
        }
      ],
      "posts": []
    }
  ]
}`

    const userMessage = `PROJET À ANALYSER :
${projectText}

BIBLIOTHÈQUE DE POSTES DISPONIBLES (validés) :
${libraryText || 'Aucun poste en bibliothèque — utilise uniquement des postes custom.'}

Génère le DPGF adapté à ce projet en sélectionnant les lots et postes pertinents depuis la bibliothèque. Adapte la sélection au type d'opération, à la destination du bâtiment, au niveau de prestations et aux contraintes spécifiques mentionnées.`

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY manquante')
    }

    const client = new Anthropic({ apiKey })

    console.log('[ai-generate] Envoi à Claude...')
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const rawText = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    console.log('[ai-generate] Réponse reçue :', rawText.slice(0, 200))

    const lots = parseGeneratedResponse(rawText)

    const totalPosts = lots.reduce(
      (acc, l) =>
        acc +
        l.posts.length +
        l.sublots.reduce((sa, sl) => sa + sl.posts.length, 0),
      0
    )
    console.log(
      `[ai-generate] Généré : ${lots.length} lot(s), ` +
        `${lots.reduce((acc, l) => acc + l.sublots.length, 0)} sous-lot(s), ` +
        `${totalPosts} poste(s)`
    )

    return NextResponse.json({ lots }, { status: 200 })
  } catch (error) {
    console.error('[POST /api/dpgf/[dpgfId]/ai-generate]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
