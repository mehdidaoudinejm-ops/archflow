'use client'

import { useState } from 'react'
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Questionnaire {
  typeOperation: string
  destinationBatiment: string
  surface: string
  niveaux: string
  niveauPrestations: string
  espaces: string
  espacesExterieurs: string
  espacesExterieursDetail: string
  partiesCommunes: string
  structurePrincipale: string
  typeFacade: string[]
  typeCouverture: string
  menuiseriesExt: string
  vitrages: string
  revetementsSol: string[]
  revetementsParois: string[]
  chauffage: string
  ecs: string
  ventilation: string
  climatisation: string
  climatisationType: string
  ascenseur: string
  electriciteSpec: string[]
  reprisesSousOeuvre: string
  reprisesSousOeuvreDetail: string
  amiantePlomb: string
  demolitions: string
  demolitionsDetail: string
  contraintesReg: string[]
  contraintesChantier: string[]
  infoComplementaires: string
}

interface EditablePost {
  title: string
  unit: string
  custom: boolean
}

interface EditableSubLot {
  name: string
  number: string
  posts: EditablePost[]
}

interface EditableLot {
  name: string
  sublots: EditableSubLot[]
  posts: EditablePost[]
}

type Phase = 'questionnaire' | 'generating' | 'preview'

interface Props {
  open: boolean
  onClose: () => void
  dpgfId: string
  onImported: () => void
}

// ─── Section names ────────────────────────────────────────────────────────────

const SECTION_NAMES = [
  'Informations générales',
  'Composition du projet',
  'Matériaux et systèmes constructifs',
  'Équipements techniques',
  'Contraintes et spécificités',
]

// ─── Helper: deep clone ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface RadioGroupProps {
  options: string[]
  value: string
  onChange: (v: string) => void
  label: string
}

function RadioGroup({ options, value, onChange, label }: RadioGroupProps) {
  return (
    <div>
      <label
        className="block text-sm font-medium mb-2"
        style={{ color: 'var(--text)' }}
      >
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className="px-3 py-1.5 text-sm rounded-md border transition-colors"
            style={{
              background: value === opt ? 'var(--green-light)' : 'var(--surface)',
              borderColor: value === opt ? 'var(--green)' : 'var(--border)',
              color: value === opt ? 'var(--green)' : 'var(--text2)',
              fontWeight: value === opt ? 600 : 400,
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

interface CheckboxGroupProps {
  options: string[]
  values: string[]
  onChange: (values: string[]) => void
  label: string
}

function CheckboxGroup({ options, values, onChange, label }: CheckboxGroupProps) {
  function toggle(opt: string) {
    if (values.includes(opt)) {
      onChange(values.filter((v) => v !== opt))
    } else {
      onChange([...values, opt])
    }
  }

  return (
    <div>
      <label
        className="block text-sm font-medium mb-2"
        style={{ color: 'var(--text)' }}
      >
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const checked = values.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className="px-3 py-1.5 text-sm rounded-md border transition-colors"
              style={{
                background: checked ? 'var(--green-light)' : 'var(--surface)',
                borderColor: checked ? 'var(--green)' : 'var(--border)',
                color: checked ? 'var(--green)' : 'var(--text2)',
                fontWeight: checked ? 600 : 400,
              }}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface OuiNonProps {
  label: string
  value: string
  onChange: (v: string) => void
  detailLabel?: string
  detailValue?: string
  onDetailChange?: (v: string) => void
}

function OuiNon({
  label,
  value,
  onChange,
  detailLabel,
  detailValue,
  onDetailChange,
}: OuiNonProps) {
  return (
    <div className="space-y-2">
      <label
        className="block text-sm font-medium"
        style={{ color: 'var(--text)' }}
      >
        {label}
      </label>
      <div className="flex gap-2">
        {['oui', 'non'].map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className="px-4 py-1.5 text-sm rounded-md border capitalize transition-colors"
            style={{
              background: value === opt ? 'var(--green-light)' : 'var(--surface)',
              borderColor: value === opt ? 'var(--green)' : 'var(--border)',
              color: value === opt ? 'var(--green)' : 'var(--text2)',
              fontWeight: value === opt ? 600 : 400,
            }}
          >
            {opt === 'oui' ? 'Oui' : 'Non'}
          </button>
        ))}
      </div>
      {value === 'oui' && detailLabel && onDetailChange && (
        <input
          type="text"
          value={detailValue ?? ''}
          onChange={(e) => onDetailChange(e.target.value)}
          placeholder={detailLabel}
          className="w-full px-3 py-2 text-sm rounded-md outline-none"
          style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          }}
        />
      )}
    </div>
  )
}

interface TextFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  multiline?: boolean
}

function TextField({ label, value, onChange, placeholder, multiline }: TextFieldProps) {
  return (
    <div>
      <label
        className="block text-sm font-medium mb-1.5"
        style={{ color: 'var(--text)' }}
      >
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full px-3 py-2 text-sm rounded-md outline-none resize-none"
          style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm rounded-md outline-none"
          style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          }}
        />
      )}
    </div>
  )
}

// ─── Default state ────────────────────────────────────────────────────────────

function defaultQuestionnaire(): Questionnaire {
  return {
    typeOperation: '',
    destinationBatiment: '',
    surface: '',
    niveaux: '',
    niveauPrestations: '',
    espaces: '',
    espacesExterieurs: '',
    espacesExterieursDetail: '',
    partiesCommunes: '',
    structurePrincipale: '',
    typeFacade: [],
    typeCouverture: '',
    menuiseriesExt: '',
    vitrages: '',
    revetementsSol: [],
    revetementsParois: [],
    chauffage: '',
    ecs: '',
    ventilation: '',
    climatisation: '',
    climatisationType: '',
    ascenseur: '',
    electriciteSpec: [],
    reprisesSousOeuvre: '',
    reprisesSousOeuvreDetail: '',
    amiantePlomb: '',
    demolitions: '',
    demolitionsDetail: '',
    contraintesReg: [],
    contraintesChantier: [],
    infoComplementaires: '',
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AiGenerateModal({ open, onClose, dpgfId, onImported }: Props) {
  const [phase, setPhase] = useState<Phase>('questionnaire')
  const [currentSection, setCurrentSection] = useState(1)
  const [q, setQ] = useState<Questionnaire>(defaultQuestionnaire())
  const [editableLots, setEditableLots] = useState<EditableLot[]>([])
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [expandedLots, setExpandedLots] = useState<Set<number>>(new Set([0]))

  function handleClose() {
    // Reset state on close
    setPhase('questionnaire')
    setCurrentSection(1)
    setQ(defaultQuestionnaire())
    setEditableLots([])
    setError(null)
    setImporting(false)
    onClose()
  }

  function updateQ<K extends keyof Questionnaire>(key: K, value: Questionnaire[K]) {
    setQ((prev) => ({ ...prev, [key]: value }))
  }

  async function handleGenerate() {
    setPhase('generating')
    setError(null)
    try {
      const res = await fetch(`/api/dpgf/${dpgfId}/ai-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionnaire: q }),
      })
      const data = await res.json() as { lots?: EditableLot[]; error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Erreur lors de la génération')
        setPhase('questionnaire')
        return
      }
      const lots = (data.lots ?? []) as EditableLot[]
      setEditableLots(deepClone(lots))
      setExpandedLots(new Set(lots.map((_, i) => i)))
      setPhase('preview')
    } catch {
      setError('Erreur réseau — veuillez réessayer')
      setPhase('questionnaire')
    }
  }

  async function handleImport() {
    setImporting(true)
    try {
      const res = await fetch(`/api/dpgf/${dpgfId}/ai-generate/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lots: editableLots }),
      })
      if (res.ok) {
        onImported()
        handleClose()
      } else {
        const data = await res.json() as { error?: string }
        setError(data.error ?? "Erreur lors de l'import")
        setImporting(false)
      }
    } catch {
      setError("Erreur réseau lors de l'import")
      setImporting(false)
    }
  }

  function toggleLot(idx: number) {
    setExpandedLots((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) {
        next.delete(idx)
      } else {
        next.add(idx)
      }
      return next
    })
  }

  function updateLotName(lotIdx: number, name: string) {
    setEditableLots((prev) => {
      const next = deepClone(prev)
      next[lotIdx].name = name
      return next
    })
  }

  function updateSublotName(lotIdx: number, slIdx: number, name: string) {
    setEditableLots((prev) => {
      const next = deepClone(prev)
      next[lotIdx].sublots[slIdx].name = name
      return next
    })
  }

  function updatePost(
    lotIdx: number,
    slIdx: number | null,
    postIdx: number,
    field: 'title' | 'unit',
    value: string
  ) {
    setEditableLots((prev) => {
      const next = deepClone(prev)
      if (slIdx === null) {
        next[lotIdx].posts[postIdx][field] = value
      } else {
        next[lotIdx].sublots[slIdx].posts[postIdx][field] = value
      }
      return next
    })
  }

  // Stats
  const totalLots = editableLots.length
  const totalSublots = editableLots.reduce((acc, l) => acc + l.sublots.length, 0)
  const totalPosts = editableLots.reduce(
    (acc, l) =>
      acc +
      l.posts.length +
      l.sublots.reduce((sa, sl) => sa + sl.posts.length, 0),
    0
  )

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {/* ── Phase: questionnaire ── */}
        {phase === 'questionnaire' && (
          <>
            <DialogHeader>
              <DialogTitle
                style={{ fontFamily: 'var(--font-dm-serif)', color: 'var(--text)' }}
              >
                Générer le DPGF avec l&apos;IA
              </DialogTitle>
            </DialogHeader>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: 'var(--text3)' }}>
                  Section {currentSection} sur 5
                </span>
                <span className="text-xs font-medium" style={{ color: 'var(--text2)' }}>
                  {SECTION_NAMES[currentSection - 1]}
                </span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: 'var(--surface2)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(currentSection / 5) * 100}%`,
                    background: 'var(--green)',
                  }}
                />
              </div>
              {/* 5 segments */}
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div
                    key={s}
                    className="flex-1 h-0.5 rounded-full"
                    style={{
                      background: s <= currentSection ? 'var(--green)' : 'var(--border)',
                    }}
                  />
                ))}
              </div>
            </div>

            {error && (
              <div
                className="px-4 py-3 rounded-md text-sm"
                style={{ background: 'var(--red-light)', color: 'var(--red)', border: '1px solid var(--red)' }}
              >
                {error}
              </div>
            )}

            {/* Section content */}
            <div className="space-y-5 py-2">
              {currentSection === 1 && (
                <>
                  <RadioGroup
                    label="Type d'opération"
                    options={['Construction neuve', 'Réhabilitation', 'Extension', 'Surélévation', 'Aménagement intérieur']}
                    value={q.typeOperation}
                    onChange={(v) => updateQ('typeOperation', v)}
                  />
                  <RadioGroup
                    label="Destination du bâtiment"
                    options={['Logement collectif', 'Maison individuelle', 'Bureaux', 'Commerce', 'ERP', 'Équipement public', 'Industriel', 'Autre']}
                    value={q.destinationBatiment}
                    onChange={(v) => updateQ('destinationBatiment', v)}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <TextField
                      label="Surface totale (m²)"
                      value={q.surface}
                      onChange={(v) => updateQ('surface', v)}
                      placeholder="ex : 450"
                    />
                    <TextField
                      label="Nombre de niveaux"
                      value={q.niveaux}
                      onChange={(v) => updateQ('niveaux', v)}
                      placeholder="ex : 3"
                    />
                  </div>
                  <RadioGroup
                    label="Niveau de prestations"
                    options={['Économique', 'Standard', 'Haut de gamme']}
                    value={q.niveauPrestations}
                    onChange={(v) => updateQ('niveauPrestations', v)}
                  />
                </>
              )}

              {currentSection === 2 && (
                <>
                  <TextField
                    label="Description des espaces"
                    value={q.espaces}
                    onChange={(v) => updateQ('espaces', v)}
                    placeholder="ex : 4 appartements T3, hall d'entrée, locaux vélo..."
                    multiline
                  />
                  <OuiNon
                    label="Espaces extérieurs ?"
                    value={q.espacesExterieurs}
                    onChange={(v) => updateQ('espacesExterieurs', v)}
                    detailLabel="Précisez (terrasses, jardins, parkings...)"
                    detailValue={q.espacesExterieursDetail}
                    onDetailChange={(v) => updateQ('espacesExterieursDetail', v)}
                  />
                  <RadioGroup
                    label="Parties communes"
                    options={['oui', 'non']}
                    value={q.partiesCommunes}
                    onChange={(v) => updateQ('partiesCommunes', v)}
                  />
                </>
              )}

              {currentSection === 3 && (
                <>
                  <RadioGroup
                    label="Structure principale"
                    options={['Béton armé', 'Charpente bois', 'Charpente métallique', 'Maçonnerie', 'Mixte']}
                    value={q.structurePrincipale}
                    onChange={(v) => updateQ('structurePrincipale', v)}
                  />
                  <CheckboxGroup
                    label="Type de façade"
                    options={['Enduit', 'Bardage bois', 'Bardage métallique', 'Pierre', 'Brique', 'Isolation thermique par l\'extérieur (ITE)', 'Autre']}
                    values={q.typeFacade}
                    onChange={(v) => updateQ('typeFacade', v)}
                  />
                  <TextField
                    label="Type de couverture"
                    value={q.typeCouverture}
                    onChange={(v) => updateQ('typeCouverture', v)}
                    placeholder="ex : Tuiles, ardoises, toiture-terrasse..."
                  />
                  <RadioGroup
                    label="Menuiseries extérieures"
                    options={['PVC', 'Aluminium', 'Bois', 'Mixte']}
                    value={q.menuiseriesExt}
                    onChange={(v) => updateQ('menuiseriesExt', v)}
                  />
                  <RadioGroup
                    label="Vitrages"
                    options={['Simple', 'Double', 'Triple']}
                    value={q.vitrages}
                    onChange={(v) => updateQ('vitrages', v)}
                  />
                  <CheckboxGroup
                    label="Revêtements de sol"
                    options={['Carrelage', 'Parquet', 'Stratifié', 'Béton ciré', 'Résine', 'Moquette', 'Pierre naturelle']}
                    values={q.revetementsSol}
                    onChange={(v) => updateQ('revetementsSol', v)}
                  />
                  <CheckboxGroup
                    label="Revêtements des parois"
                    options={['Peinture', 'Papier peint', 'Carrelage', 'Faïence', 'Enduit décoratif', 'Lambris', 'Autre']}
                    values={q.revetementsParois}
                    onChange={(v) => updateQ('revetementsParois', v)}
                  />
                </>
              )}

              {currentSection === 4 && (
                <>
                  <TextField
                    label="Système de chauffage"
                    value={q.chauffage}
                    onChange={(v) => updateQ('chauffage', v)}
                    placeholder="ex : Chaudière gaz, pompe à chaleur, plancher chauffant..."
                  />
                  <TextField
                    label="Eau chaude sanitaire (ECS)"
                    value={q.ecs}
                    onChange={(v) => updateQ('ecs', v)}
                    placeholder="ex : Chauffe-eau thermodynamique, ballon solaire..."
                  />
                  <TextField
                    label="Ventilation"
                    value={q.ventilation}
                    onChange={(v) => updateQ('ventilation', v)}
                    placeholder="ex : VMC simple flux, double flux, naturelle..."
                  />
                  <OuiNon
                    label="Climatisation ?"
                    value={q.climatisation}
                    onChange={(v) => updateQ('climatisation', v)}
                    detailLabel="Type de climatisation"
                    detailValue={q.climatisationType}
                    onDetailChange={(v) => updateQ('climatisationType', v)}
                  />
                  <OuiNon
                    label="Ascenseur ?"
                    value={q.ascenseur}
                    onChange={(v) => updateQ('ascenseur', v)}
                  />
                  <CheckboxGroup
                    label="Spécificités électricité"
                    options={['Domotique', 'Interphonie', 'Contrôle d\'accès', 'Borne de recharge (IRVE)', 'Panneaux photovoltaïques', 'Alarme incendie', 'Autre']}
                    values={q.electriciteSpec}
                    onChange={(v) => updateQ('electriciteSpec', v)}
                  />
                </>
              )}

              {currentSection === 5 && (
                <>
                  <OuiNon
                    label="Reprises en sous-œuvre ?"
                    value={q.reprisesSousOeuvre}
                    onChange={(v) => updateQ('reprisesSousOeuvre', v)}
                    detailLabel="Précisez la nature des reprises"
                    detailValue={q.reprisesSousOeuvreDetail}
                    onDetailChange={(v) => updateQ('reprisesSousOeuvreDetail', v)}
                  />
                  <RadioGroup
                    label="Amiante / plomb"
                    options={['Oui', 'Non', 'À diagnostiquer']}
                    value={q.amiantePlomb}
                    onChange={(v) => updateQ('amiantePlomb', v)}
                  />
                  <OuiNon
                    label="Démolitions ?"
                    value={q.demolitions}
                    onChange={(v) => updateQ('demolitions', v)}
                    detailLabel="Précisez les éléments à démolir"
                    detailValue={q.demolitionsDetail}
                    onDetailChange={(v) => updateQ('demolitionsDetail', v)}
                  />
                  <CheckboxGroup
                    label="Contraintes réglementaires"
                    options={['PMR / accessibilité', 'ERP', 'Monument historique', 'Zone inondable', 'Plan de prévention des risques', 'Réglementation thermique RE2020', 'Autre']}
                    values={q.contraintesReg}
                    onChange={(v) => updateQ('contraintesReg', v)}
                  />
                  <CheckboxGroup
                    label="Contraintes de chantier"
                    options={['Accès difficile', 'Mitoyenneté', 'Occupation pendant travaux', 'Nuisances sonores limitées', 'Chantier en hauteur', 'Autre']}
                    values={q.contraintesChantier}
                    onChange={(v) => updateQ('contraintesChantier', v)}
                  />
                  <TextField
                    label="Informations complémentaires"
                    value={q.infoComplementaires}
                    onChange={(v) => updateQ('infoComplementaires', v)}
                    placeholder="Tout élément important non couvert ci-dessus..."
                    multiline
                  />
                </>
              )}
            </div>

            <DialogFooter className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => setCurrentSection((s) => Math.max(1, s - 1))}
                disabled={currentSection === 1}
                style={{ color: 'var(--text2)' }}
              >
                Précédent
              </Button>
              {currentSection < 5 ? (
                <Button
                  onClick={() => setCurrentSection((s) => Math.min(5, s + 1))}
                  style={{
                    background: 'var(--green-btn)',
                    color: '#fff',
                    border: 'none',
                  }}
                >
                  Suivant
                </Button>
              ) : (
                <Button
                  onClick={handleGenerate}
                  style={{
                    background: 'var(--green-btn)',
                    color: '#fff',
                    border: 'none',
                  }}
                >
                  Générer avec l&apos;IA
                </Button>
              )}
            </DialogFooter>
          </>
        )}

        {/* ── Phase: generating ── */}
        {phase === 'generating' && (
          <div className="flex flex-col items-center justify-center py-16 gap-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'var(--green-light)' }}
            >
              <Loader2
                size={32}
                className="animate-spin"
                style={{ color: 'var(--green)' }}
              />
            </div>
            <div className="text-center space-y-2">
              <p
                className="text-lg font-semibold"
                style={{ fontFamily: 'var(--font-dm-serif)', color: 'var(--text)' }}
              >
                Analyse du projet en cours…
              </p>
              <p className="text-sm" style={{ color: 'var(--text2)' }}>
                L&apos;IA sélectionne et organise les postes adaptés à votre projet
              </p>
            </div>
            <AnimatedDots />
          </div>
        )}

        {/* ── Phase: preview ── */}
        {phase === 'preview' && (
          <>
            <DialogHeader>
              <DialogTitle
                style={{ fontFamily: 'var(--font-dm-serif)', color: 'var(--text)' }}
              >
                Aperçu du DPGF généré
              </DialogTitle>
            </DialogHeader>

            {/* Stats */}
            <div
              className="flex items-center gap-4 px-4 py-3 rounded-lg text-sm"
              style={{ background: 'var(--green-light)', border: '1px solid var(--green)' }}
            >
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>
                {totalLots} lot{totalLots > 1 ? 's' : ''}
              </span>
              <span style={{ color: 'var(--text3)' }}>•</span>
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>
                {totalSublots} sous-lot{totalSublots > 1 ? 's' : ''}
              </span>
              <span style={{ color: 'var(--text3)' }}>•</span>
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>
                {totalPosts} poste{totalPosts > 1 ? 's' : ''}
              </span>
              <span className="ml-auto text-xs" style={{ color: 'var(--text2)' }}>
                Vous pouvez modifier les intitulés avant d&apos;importer
              </span>
            </div>

            {error && (
              <div
                className="px-4 py-3 rounded-md text-sm"
                style={{ background: 'var(--red-light)', color: 'var(--red)', border: '1px solid var(--red)' }}
              >
                {error}
              </div>
            )}

            {/* Lots list */}
            <div className="space-y-3">
              {editableLots.map((lot, lotIdx) => (
                <div
                  key={lotIdx}
                  className="rounded-lg overflow-hidden"
                  style={{ border: '1px solid var(--border)' }}
                >
                  {/* Lot header */}
                  <button
                    type="button"
                    onClick={() => toggleLot(lotIdx)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    style={{ background: 'var(--surface2)' }}
                  >
                    {expandedLots.has(lotIdx) ? (
                      <ChevronDown size={15} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                    ) : (
                      <ChevronRight size={15} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                    )}
                    <input
                      type="text"
                      value={lot.name}
                      onChange={(e) => {
                        e.stopPropagation()
                        updateLotName(lotIdx, e.target.value)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 bg-transparent outline-none text-sm font-semibold"
                      style={{ color: 'var(--text)' }}
                    />
                    <span className="text-xs flex-shrink-0" style={{ color: 'var(--text3)' }}>
                      {lot.sublots.length > 0
                        ? `${lot.sublots.length} sous-lot${lot.sublots.length > 1 ? 's' : ''}`
                        : `${lot.posts.length} poste${lot.posts.length > 1 ? 's' : ''}`}
                    </span>
                  </button>

                  {/* Lot expanded content */}
                  {expandedLots.has(lotIdx) && (
                    <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                      {/* Direct posts */}
                      {lot.posts.map((post, postIdx) => (
                        <PostRow
                          key={`direct-${postIdx}`}
                          post={post}
                          onTitleChange={(v) => updatePost(lotIdx, null, postIdx, 'title', v)}
                          onUnitChange={(v) => updatePost(lotIdx, null, postIdx, 'unit', v)}
                          indent={0}
                        />
                      ))}

                      {/* Sublots */}
                      {lot.sublots.map((sublot, slIdx) => (
                        <div key={slIdx}>
                          {/* Sublot header */}
                          <div
                            className="flex items-center gap-3 px-4 py-2"
                            style={{ background: 'var(--surface)' }}
                          >
                            <span
                              className="text-xs font-semibold px-2 py-0.5 rounded"
                              style={{
                                background: 'var(--surface2)',
                                color: 'var(--text2)',
                                border: '1px solid var(--border)',
                              }}
                            >
                              {sublot.number}
                            </span>
                            <input
                              type="text"
                              value={sublot.name}
                              onChange={(e) => updateSublotName(lotIdx, slIdx, e.target.value)}
                              className="flex-1 bg-transparent outline-none text-sm font-medium"
                              style={{ color: 'var(--text)' }}
                            />
                          </div>
                          {/* Sublot posts */}
                          {sublot.posts.map((post, postIdx) => (
                            <PostRow
                              key={postIdx}
                              post={post}
                              onTitleChange={(v) => updatePost(lotIdx, slIdx, postIdx, 'title', v)}
                              onUnitChange={(v) => updatePost(lotIdx, slIdx, postIdx, 'unit', v)}
                              indent={1}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <DialogFooter className="flex items-center justify-between gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setPhase('questionnaire')
                  setEditableLots([])
                  setError(null)
                }}
                style={{ color: 'var(--text2)' }}
                disabled={importing}
              >
                Recommencer
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing}
                style={{
                  background: importing ? 'var(--surface2)' : 'var(--green-btn)',
                  color: importing ? 'var(--text2)' : '#fff',
                  border: 'none',
                }}
              >
                {importing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Import en cours…
                  </span>
                ) : (
                  'Importer dans le projet'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── PostRow sub-component ────────────────────────────────────────────────────

interface PostRowProps {
  post: EditablePost
  onTitleChange: (v: string) => void
  onUnitChange: (v: string) => void
  indent: number
}

function PostRow({ post, onTitleChange, onUnitChange, indent }: PostRowProps) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2"
      style={{
        background: 'var(--surface)',
        paddingLeft: indent > 0 ? '2.5rem' : '1rem',
      }}
    >
      <input
        type="text"
        value={post.title}
        onChange={(e) => onTitleChange(e.target.value)}
        className="flex-1 bg-transparent outline-none text-sm"
        style={{ color: 'var(--text)' }}
      />
      {post.custom && (
        <span
          className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
          style={{
            background: 'var(--amber-light)',
            color: 'var(--amber)',
            border: '1px solid var(--amber)',
          }}
        >
          Personnalisé
        </span>
      )}
      <input
        type="text"
        value={post.unit}
        onChange={(e) => onUnitChange(e.target.value)}
        className="w-14 text-center bg-transparent outline-none text-xs rounded px-1 py-0.5"
        style={{
          color: 'var(--text2)',
          border: '1px solid var(--border)',
          background: 'var(--surface2)',
          flexShrink: 0,
        }}
      />
    </div>
  )
}

// ─── AnimatedDots ─────────────────────────────────────────────────────────────

function AnimatedDots() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full"
          style={{
            background: 'var(--green)',
            animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}
