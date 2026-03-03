import Anthropic from '@anthropic-ai/sdk'
import * as XLSX from 'xlsx'

export interface ImportedPost {
  ref?: string       // Numéro original du document (ex: "3.2.1") — conservé tel quel
  title: string
  qty: number | null
  unit: string
  unit_price: number | null
  confidence: number // 0-100
}

export interface ImportedSubLot {
  number: string     // Numéro du sous-lot (ex: "3.2")
  name: string       // Intitulé (ex: "Terrassements")
  posts: ImportedPost[]
}

export interface ImportedLot {
  number?: string    // Numéro du lot/chapitre (ex: "3")
  name: string
  sublots: ImportedSubLot[]
  posts: ImportedPost[]  // Postes directs rattachés au lot (sans sous-lot)
}

export interface AIImportResult {
  lots: ImportedLot[]
  globalConfidence: number
}

const MODEL = 'claude-sonnet-4-5'

const SYSTEM_PROMPT = `Tu es un assistant spécialisé dans l'analyse de documents DPGF (Décomposition du Prix Global et Forfaitaire) du bâtiment.

Tu dois extraire la structure des lots, sous-lots et postes depuis le document fourni, puis retourner UNIQUEMENT un objet JSON valide, sans texte avant ou après.

RÈGLES DE HIÉRARCHIE — À RESPECTER ABSOLUMENT :
1. LOT = ligne en MAJUSCULES sans montant (ex: "CHAPITRE 3 - GROS OEUVRE", "LOT 2 - CHARPENTE"). Chaque chapitre = un lot distinct.
2. SOUS-LOT = ligne avec numéro à 2 niveaux sans montant (ex: "3.2 Terrassements", "3.3 Fondations"). Le sous-lot appartient au chapitre parent. NE PAS en faire un lot séparé.
3. POSTE = ligne avec numéro à 3 niveaux et une quantité + prix unitaire (ex: "3.2.1 Fouilles en tranchée"). Le poste appartient au sous-lot parent.
4. Conserver EXACTEMENT le numéro de référence original du document dans le champ "ref" de chaque poste (ex: "3.2.1").
5. EXEMPLE : "CHAPITRE 3 - GROS OEUVRE" → lot, "3.2 Terrassements" → sous-lot de ce lot, "3.2.1 Fouilles" → poste de ce sous-lot.

Format attendu :
{
  "lots": [
    {
      "number": "3",
      "name": "GROS OEUVRE",
      "sublots": [
        {
          "number": "3.2",
          "name": "Terrassements",
          "posts": [
            {
              "ref": "3.2.1",
              "title": "Fouilles en tranchée",
              "qty": 25.5,
              "unit": "m³",
              "unit_price": 45.00,
              "confidence": 95
            }
          ]
        }
      ],
      "posts": []
    }
  ]
}

Règles supplémentaires :
- "confidence" : 0-100. Met 100 si la valeur est clairement lisible, 50-79 si incertaine, 30 si tu dois deviner (null non accepté)
- Si une quantité ou un prix est absent ou illisible, utilise null
- Ne crée pas de lots, sous-lots ou postes fictifs
- Les unités courantes : m², ml, u, forfait, h, kg, m³
- Si le document a une structure plate (sans sous-lots), utilise "sublots": [] et mets les postes dans "posts"
- Réponds UNIQUEMENT avec le JSON, sans markdown, sans commentaire`

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY manquante — vérifiez votre .env.local')
  }
  return new Anthropic({ apiKey })
}

function sheetToText(wb: XLSX.WorkBook): string {
  const lines: string[] = []
  for (const sheetName of wb.SheetNames) {
    lines.push(`=== Feuille : ${sheetName} ===`)
    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_csv(ws, { FS: '\t' })
    lines.push(rows)
  }
  return lines.join('\n')
}

function mapPost(p: Record<string, unknown>): ImportedPost {
  return {
    ref: p.ref != null ? String(p.ref) : undefined,
    title: String(p.title ?? ''),
    qty: p.qty !== null && p.qty !== undefined ? Number(p.qty) : null,
    unit: String(p.unit ?? 'u'),
    unit_price:
      p.unit_price !== null && p.unit_price !== undefined
        ? Number(p.unit_price)
        : null,
    confidence:
      typeof p.confidence === 'number'
        ? Math.min(100, Math.max(0, Math.round(p.confidence)))
        : 50,
  }
}

function calcGlobalConfidence(lots: ImportedLot[]): number {
  const scores: number[] = []
  for (const lot of lots) {
    for (const post of lot.posts) {
      scores.push(post.confidence)
    }
    for (const sublot of lot.sublots) {
      for (const post of sublot.posts) {
        scores.push(post.confidence)
      }
    }
  }
  if (scores.length === 0) return 0
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

export async function analyzeExcel(
  buffer: Buffer,
  filename = 'fichier'
): Promise<AIImportResult> {
  console.log(`[ai-import] Fichier reçu : ${filename} (${(buffer.length / 1024).toFixed(0)} Ko)`)
  console.log('[ai-import] Type détecté : Excel/CSV')

  const wb = XLSX.read(buffer, { type: 'buffer' })
  const text = sheetToText(wb)
  console.log(`[ai-import] Feuilles lues : ${wb.SheetNames.join(', ')} — ${text.length} caractères`)

  const client = getClient()
  console.log(`[ai-import] Envoi à Claude (${MODEL})...`)

  let message: Anthropic.Message
  try {
    message = await client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Voici le contenu d'un fichier Excel DPGF (format tabulaire TSV) :\n\n${text}`,
        },
      ],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ai-import] Erreur appel Claude:', msg)
    throw err
  }

  const rawText = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')

  console.log('[ai-import] Réponse reçue :', rawText.slice(0, 200))
  return parseClaudeResponse(rawText)
}

export async function analyzePDF(
  buffer: Buffer,
  filename = 'fichier.pdf'
): Promise<AIImportResult> {
  console.log(`[ai-import] Fichier reçu : ${filename} (${(buffer.length / 1024).toFixed(0)} Ko)`)
  console.log('[ai-import] Type détecté : PDF')

  const client = getClient()

  const base64 = buffer.toString('base64')
  console.log(`[ai-import] Conversion base64 : ${base64.length} caractères`)

  console.log(`[ai-import] Envoi à Claude (${MODEL})...`)

  let message: Anthropic.Message
  try {
    message = await client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64,
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
            {
              type: 'text',
              text: 'Analyse ce document DPGF et extrais la structure des lots, sous-lots et postes selon les règles de hiérarchie données.',
            },
          ],
        },
      ],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ai-import] Erreur appel Claude:', msg)
    throw err
  }

  const rawText = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')

  console.log('[ai-import] Réponse reçue :', rawText.slice(0, 200))
  return parseClaudeResponse(rawText)
}

function parseClaudeResponse(raw: string): AIImportResult {
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error('[ai-import] Réponse complète (pas de JSON) :', raw)
    throw new Error("L'IA n'a pas retourné de JSON valide")
  }

  let parsed: { lots?: unknown[] }
  try {
    parsed = JSON.parse(jsonMatch[0]) as { lots?: unknown[] }
  } catch (err) {
    console.error('[ai-import] JSON.parse échoué :', jsonMatch[0].slice(0, 300))
    throw new Error(`JSON invalide : ${err instanceof Error ? err.message : String(err)}`)
  }

  if (!Array.isArray(parsed.lots)) {
    console.error('[ai-import] Champ "lots" manquant dans :', JSON.stringify(parsed).slice(0, 200))
    throw new Error('Structure JSON invalide : champ "lots" manquant')
  }

  const lots: ImportedLot[] = (parsed.lots as Record<string, unknown>[]).map((lot) => ({
    number: lot.number != null ? String(lot.number) : undefined,
    name: String(lot.name ?? 'Sans nom'),
    sublots: Array.isArray(lot.sublots)
      ? (lot.sublots as Record<string, unknown>[]).map((sl) => ({
          number: String(sl.number ?? ''),
          name: String(sl.name ?? 'Sans nom'),
          posts: Array.isArray(sl.posts)
            ? (sl.posts as Record<string, unknown>[]).map(mapPost)
            : [],
        }))
      : [],
    posts: Array.isArray(lot.posts)
      ? (lot.posts as Record<string, unknown>[]).map(mapPost)
      : [],
  }))

  const totalPosts = lots.reduce(
    (acc, l) =>
      acc +
      l.posts.length +
      l.sublots.reduce((sa, sl) => sa + sl.posts.length, 0),
    0
  )

  console.log(
    `[ai-import] Import réussi : ${lots.length} lot(s), ` +
      `${lots.reduce((acc, l) => acc + l.sublots.length, 0)} sous-lot(s), ` +
      `${totalPosts} poste(s)`
  )

  return {
    lots,
    globalConfidence: calcGlobalConfidence(lots),
  }
}
