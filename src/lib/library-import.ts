import * as XLSX from 'xlsx'

export interface LibraryCandidate {
  lot: string
  sousLot?: string
  intitule: string
  unite?: string
}

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

function findCol(headers: (string | number | null)[], keywords: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = normalize(String(headers[i] ?? ''))
    if (keywords.some((k) => h.includes(k))) return i
  }
  return -1
}

export function parseExcelForLibrary(buffer: Buffer, filename: string): LibraryCandidate[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
  }) as (string | number | null)[][]

  if (rows.length < 2) return []

  let headerRowIdx = 0
  let lotIdx = -1, sousLotIdx = -1, intituleIdx = -1, uniteIdx = -1

  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const row = rows[i].map((c) => String(c ?? ''))
    const ti = findCol(row, ['intitule', 'designation', 'libelle', 'description', 'prestation', 'poste'])
    if (ti !== -1) {
      headerRowIdx = i
      intituleIdx = ti
      lotIdx = findCol(row, ['lot'])
      sousLotIdx = findCol(row, ['sous-lot', 'sous lot', 'sous_lot', 'sous-ouvrage', 'section', 'chapitre'])
      uniteIdx = findCol(row, ['unite', 'u.', 'unit'])
      break
    }
  }

  if (intituleIdx === -1) return []

  const items: LibraryCandidate[] = []
  let currentLot = ''
  let currentSousLot = ''

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i].map((c) => String(c ?? '').trim())
    const lotVal = lotIdx >= 0 ? row[lotIdx] : ''
    const sousLotVal = sousLotIdx >= 0 ? row[sousLotIdx] : ''
    const intituleVal = intituleIdx >= 0 ? row[intituleIdx] : ''
    const uniteVal = uniteIdx >= 0 ? row[uniteIdx] : ''

    if (lotVal && lotVal.length > 1) currentLot = lotVal
    if (sousLotVal && sousLotVal.length > 1) currentSousLot = sousLotVal
    if (!intituleVal || intituleVal.length < 3) continue
    if (!currentLot) continue

    items.push({
      lot: currentLot,
      sousLot: currentSousLot || undefined,
      intitule: intituleVal,
      unite: uniteVal || undefined,
    })
  }

  return items
}
