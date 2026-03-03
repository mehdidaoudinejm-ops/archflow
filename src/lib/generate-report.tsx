import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 8,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
    color: '#1A1A18',
  },
  subtitle: {
    fontSize: 9,
    color: '#6B6B65',
    marginBottom: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
    color: '#1A5C3A',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E3',
    paddingBottom: 3,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E8E8E3',
    borderRadius: 4,
    backgroundColor: '#F8F8F6',
  },
  statLabel: {
    fontSize: 7,
    color: '#9B9B94',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1A1A18',
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F3F0',
    borderWidth: 1,
    borderColor: '#E8E8E3',
    borderRadius: 3,
    marginBottom: 1,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E3',
    paddingVertical: 3,
  },
  tableRowAlt: {
    backgroundColor: '#FAFAFA',
  },
  cell: {
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  cellRef: {
    width: 50,
    fontFamily: 'Helvetica',
    color: '#6B6B65',
  },
  cellTitle: {
    flex: 1,
    fontFamily: 'Helvetica',
    color: '#1A1A18',
  },
  cellNum: {
    width: 60,
    textAlign: 'right',
    fontFamily: 'Helvetica',
    color: '#1A1A18',
  },
  cellNumBold: {
    fontFamily: 'Helvetica-Bold',
  },
  cellMin: {
    color: '#1A5C3A',
    fontFamily: 'Helvetica-Bold',
  },
  headerCell: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#6B6B65',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  lotHeader: {
    backgroundColor: '#EAF3ED',
    paddingHorizontal: 4,
    paddingVertical: 5,
    borderRadius: 2,
    marginTop: 8,
    marginBottom: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lotTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1A5C3A',
  },
  retainedSection: {
    marginTop: 8,
  },
  retainedCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 6,
    borderWidth: 1,
    borderColor: '#1A5C3A',
    borderRadius: 4,
    marginBottom: 4,
    backgroundColor: '#EAF3ED',
  },
  retainedName: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1A5C3A',
  },
  retainedTotal: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1A5C3A',
  },
  retainedNote: {
    fontSize: 7,
    color: '#6B6B65',
    marginTop: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 32,
    right: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E3',
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: '#9B9B94',
  },
  pageNumber: {
    fontSize: 7,
    color: '#9B9B94',
  },
})

function formatPrice(v: number | null): string {
  if (v == null) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
}

interface Post {
  id: string
  ref: string
  title: string
  unit: string
  qtyArchi: number | null
  unitPriceArchi: number | null
  totalArchi: number | null
  minPrice: number | null
  maxPrice: number | null
  minCompanyId: string | null
  maxCompanyId: string | null
  hasQtyDivergence: boolean
}

interface Lot {
  id: string
  number: number
  name: string
  totalArchi: number | null
  posts: Post[]
}

interface Company {
  id: string
  name: string
  total: number | null
  offerPosts: Record<string, { unitPrice: number | null; qtyCompany: number | null; qtyMotive: string | null }>
}

export interface AnalysisReportData {
  ao: { id: string; name: string; deadline: string; status: string }
  project: { id: string; name: string }
  companies: Company[]
  lots: Lot[]
  totals: { estimatif: number | null; min: number | null; max: number | null; ecart: number | null }
  divergenceCount: number
  selectedCompanyIds?: string[]
  companyNotes?: Record<string, string>
}

export function AnalysisReport({ data }: { data: AnalysisReportData }) {
  const { ao, project, companies, lots, totals } = data
  const selectedIds = data.selectedCompanyIds ?? []
  const notes = data.companyNotes ?? {}
  const retainedCompanies = companies.filter((c) => selectedIds.includes(c.id))

  // Limit columns to avoid overflow (max 4 companies in PDF landscape)
  const displayedCompanies = companies.slice(0, 4)

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* En-tête */}
        <Text style={styles.title}>Analyse des offres — {project.name}</Text>
        <Text style={styles.subtitle}>
          {ao.name} · Clôture {new Date(ao.deadline).toLocaleDateString('fr-FR')} · {companies.length} offre(s) reçue(s)
        </Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Estimatif architecte</Text>
            <Text style={styles.statValue}>{formatPrice(totals.estimatif)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Offre la + basse</Text>
            <Text style={[styles.statValue, { color: '#1A5C3A' }]}>{formatPrice(totals.min)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Offre la + haute</Text>
            <Text style={[styles.statValue, { color: '#B45309' }]}>{formatPrice(totals.max)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Écart min / max</Text>
            <Text style={styles.statValue}>{formatPrice(totals.ecart)}</Text>
          </View>
        </View>

        {/* Tableau comparatif */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tableau comparatif des offres</Text>

          {/* En-têtes */}
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, { width: 50 }]}>Réf.</Text>
            <Text style={[styles.headerCell, { flex: 1 }]}>Désignation</Text>
            <Text style={[styles.headerCell, { width: 35 }]}>Qté</Text>
            <Text style={[styles.headerCell, { width: 60, textAlign: 'right' }]}>Estimatif</Text>
            {displayedCompanies.map((c) => (
              <Text key={c.id} style={[styles.headerCell, { width: 70, textAlign: 'right' }]}>
                {c.name.slice(0, 12)}
              </Text>
            ))}
          </View>

          {/* Lignes par lot */}
          {lots.map((lot) => (
            <View key={lot.id}>
              <View style={styles.lotHeader}>
                <Text style={styles.lotTitle}>Lot {lot.number} — {lot.name}</Text>
                <Text style={styles.lotTitle}>{formatPrice(lot.totalArchi)}</Text>
              </View>
              {lot.posts.map((post, i) => (
                <View key={post.id} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                  <Text style={[styles.cell, styles.cellRef]}>{post.ref}</Text>
                  <Text style={[styles.cell, styles.cellTitle]}>{post.title.slice(0, 60)}</Text>
                  <Text style={[styles.cell, styles.cellNum]}>{post.qtyArchi ?? '—'}</Text>
                  <Text style={[styles.cell, styles.cellNum]}>{formatPrice(post.totalArchi)}</Text>
                  {displayedCompanies.map((c) => {
                    const op = post.id ? c.offerPosts[post.id] : undefined
                    const qty = op?.qtyCompany ?? post.qtyArchi
                    const total = qty != null && op?.unitPrice != null ? qty * op.unitPrice : null
                    const isMin = c.id === post.minCompanyId
                    return (
                      <Text
                        key={c.id}
                        style={[
                          styles.cell,
                          styles.cellNum,
                          isMin ? styles.cellMin : {},
                        ]}
                      >
                        {formatPrice(total)}
                      </Text>
                    )
                  })}
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Entreprises retenues */}
        {retainedCompanies.length > 0 && (
          <View style={styles.retainedSection}>
            <Text style={styles.sectionTitle}>Entreprises retenues</Text>
            {retainedCompanies.map((c) => (
              <View key={c.id} style={styles.retainedCard}>
                <View>
                  <Text style={styles.retainedName}>{c.name}</Text>
                  {notes[c.id] && <Text style={styles.retainedNote}>{notes[c.id]}</Text>}
                </View>
                <Text style={styles.retainedTotal}>{formatPrice(c.total)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>ArchFlow — {project.name} · {ao.name}</Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
