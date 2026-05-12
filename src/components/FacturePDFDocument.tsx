import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface FacturePDFData {
  id: string
  numero: string
  date: string
  notes: string | null
  total: number
  vehicule: {
    immatriculation: string
    marque: string
    modele: string
    personnelAssigne: { prenom: string; nom: string } | null
  }
  lignes: {
    id: string
    type: 'CARBURANT' | 'VIDANGE' | 'AUTRE'
    typeCarburant: 'ESSENCE' | 'GASOIL' | null
    description: string
    quantite: number | null
    prixUnitaire: number | null
    montant: number
    notes: string | null
  }[]
  createdBy: { name: string }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fcfa = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 0 }).format(n) + ' FCFA'

const fdate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })

const TYPE_LABELS: Record<string, string> = {
  CARBURANT: 'Carburant',
  VIDANGE:   'Vidange',
  AUTRE:     'Autre',
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const C = {
  navy:    '#0F172A',
  indigo:  '#4F46E5',
  purple:  '#7C3AED',
  slate:   '#475569',
  light:   '#94A3B8',
  border:  '#E2E8F0',
  bg:      '#F8FAFC',
  white:   '#FFFFFF',
  red:     '#DC2626',
  blue:    '#2563EB',
  amber:   '#D97706',
  green:   '#16A34A',
}

const s = StyleSheet.create({
  page:       { backgroundColor: C.white, padding: 40, fontFamily: 'Helvetica', fontSize: 9 },
  // Header
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, paddingBottom: 20, borderBottomWidth: 2, borderBottomColor: C.indigo },
  companyBox: { gap: 3 },
  companyName:{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: C.navy, letterSpacing: 1 },
  companyTag: { fontSize: 9, color: C.indigo, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 },
  invoiceBox: { alignItems: 'flex-end', gap: 2 },
  invoiceLabel:{ fontSize: 22, fontFamily: 'Helvetica-Bold', color: C.indigo },
  invoiceNum: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.navy, textAlign: 'right' },
  invoiceDate:{ fontSize: 9, color: C.slate, textAlign: 'right' },
  // Info blocks
  infoRow:    { flexDirection: 'row', gap: 16, marginBottom: 24 },
  infoBlock:  { flex: 1, backgroundColor: C.bg, borderRadius: 6, padding: 12, borderWidth: 1, borderColor: C.border },
  infoTitle:  { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.indigo, letterSpacing: 0.8, marginBottom: 6, textTransform: 'uppercase' },
  infoText:   { fontSize: 9, color: C.navy, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  infoSub:    { fontSize: 8, color: C.slate, marginBottom: 1 },
  // Table
  table:      { marginBottom: 20 },
  thead:      { flexDirection: 'row', backgroundColor: C.navy, borderRadius: 4, paddingVertical: 8, paddingHorizontal: 6 },
  th:         { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.white, letterSpacing: 0.5 },
  thDesc:     { flex: 3 },
  thType:     { flex: 1.5 },
  thQte:      { flex: 1, textAlign: 'right' },
  thPrix:     { flex: 1.5, textAlign: 'right' },
  thMontant:  { flex: 1.5, textAlign: 'right' },
  tbody:      {},
  tr:         { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  trAlt:      { backgroundColor: C.bg },
  td:         { fontSize: 8.5, color: C.navy },
  tdDesc:     { flex: 3 },
  tdType:     { flex: 1.5 },
  tdQte:      { flex: 1, textAlign: 'right', color: C.slate },
  tdPrix:     { flex: 1.5, textAlign: 'right', color: C.slate },
  tdMontant:  { flex: 1.5, textAlign: 'right', fontFamily: 'Helvetica-Bold', color: C.navy },
  typeBadge:  { fontSize: 7, fontFamily: 'Helvetica-Bold' },
  // Total
  totalSection:{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 24 },
  totalBox:   { width: 200, borderTopWidth: 2, borderTopColor: C.indigo, paddingTop: 10, gap: 4 },
  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 9, color: C.slate },
  totalValue: { fontSize: 9, color: C.navy, fontFamily: 'Helvetica-Bold' },
  totalLabelBig:{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.navy },
  totalValueBig:{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.red },
  // Notes
  notesBox:   { backgroundColor: C.bg, borderRadius: 6, padding: 10, borderLeftWidth: 3, borderLeftColor: C.indigo, marginBottom: 20 },
  notesTitle: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.indigo, marginBottom: 4, letterSpacing: 0.5 },
  notesText:  { fontSize: 8.5, color: C.slate, lineHeight: 1.5 },
  // Footer
  footer:     { position: 'absolute', bottom: 30, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10 },
  footerText: { fontSize: 7.5, color: C.light },
  footerBold: { fontSize: 7.5, color: C.slate, fontFamily: 'Helvetica-Bold' },
})

// ─── Document ─────────────────────────────────────────────────────────────────
export function FacturePDFDocument({ facture }: { facture: FacturePDFData }) {
  const nbLignes = facture.lignes.length

  return (
    <Document
      title={`Facture ${facture.numero}`}
      author="NDOUKOUMANE Fuel Manager"
      creator="NDOUKOUMANE"
    >
      <Page size="A4" style={s.page}>

        {/* ── En-tête ── */}
        <View style={s.header}>
          <View style={s.companyBox}>
            <Text style={s.companyName}>NDOUKOUMANE</Text>
            <Text style={s.companyTag}>FUEL MANAGER</Text>
          </View>
          <View style={s.invoiceBox}>
            <Text style={s.invoiceLabel}>FACTURE</Text>
            <Text style={s.invoiceNum}>{facture.numero}</Text>
            <Text style={s.invoiceDate}>Date : {fdate(facture.date)}</Text>
          </View>
        </View>

        {/* ── Informations ── */}
        <View style={s.infoRow}>
          {/* Véhicule */}
          <View style={s.infoBlock}>
            <Text style={s.infoTitle}>Véhicule</Text>
            <Text style={s.infoText}>{facture.vehicule.immatriculation}</Text>
            <Text style={s.infoSub}>{facture.vehicule.marque} {facture.vehicule.modele}</Text>
          </View>
          {/* Chauffeur */}
          {facture.vehicule.personnelAssigne && (
            <View style={s.infoBlock}>
              <Text style={s.infoTitle}>Chauffeur</Text>
              <Text style={s.infoText}>
                {facture.vehicule.personnelAssigne.prenom} {facture.vehicule.personnelAssigne.nom}
              </Text>
            </View>
          )}
          {/* Émis par */}
          <View style={s.infoBlock}>
            <Text style={s.infoTitle}>Émis par</Text>
            <Text style={s.infoText}>{facture.createdBy.name}</Text>
            <Text style={s.infoSub}>NDOUKOUMANE Fuel Manager</Text>
          </View>
        </View>

        {/* ── Tableau des lignes ── */}
        <View style={s.table}>
          {/* Entête */}
          <View style={s.thead}>
            <Text style={[s.th, s.thType]}>Type</Text>
            <Text style={[s.th, s.thDesc]}>Description</Text>
            <Text style={[s.th, s.thQte]}>Qté</Text>
            <Text style={[s.th, s.thPrix]}>Prix unit.</Text>
            <Text style={[s.th, s.thMontant]}>Montant</Text>
          </View>
          {/* Lignes */}
          <View style={s.tbody}>
            {facture.lignes.map((l, i) => (
              <View key={l.id} style={[s.tr, i % 2 === 1 ? s.trAlt : {}]}>
                <View style={[s.tdType]}>
                  <Text style={[s.typeBadge, {
                    color: l.type === 'CARBURANT' ? C.blue : l.type === 'VIDANGE' ? C.amber : C.slate,
                  }]}>
                    {TYPE_LABELS[l.type]}
                  </Text>
                  {l.typeCarburant && (
                    <Text style={[s.typeBadge, { color: l.typeCarburant === 'GASOIL' ? C.amber : C.blue, fontSize: 6.5, marginTop: 2 }]}>
                      {l.typeCarburant}
                    </Text>
                  )}
                </View>
                <Text style={[s.td, s.tdDesc]}>{l.description}</Text>
                <Text style={[s.td, s.tdQte]}>
                  {l.quantite != null ? `${l.quantite}${l.type === 'CARBURANT' ? ' L' : ''}` : '—'}
                </Text>
                <Text style={[s.td, s.tdPrix]}>
                  {l.prixUnitaire != null ? fcfa(l.prixUnitaire) : '—'}
                </Text>
                <Text style={[s.td, s.tdMontant]}>{fcfa(l.montant)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Total ── */}
        <View style={s.totalSection}>
          <View style={s.totalBox}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>{nbLignes} ligne{nbLignes > 1 ? 's' : ''}</Text>
              <Text style={s.totalValue}></Text>
            </View>
            <View style={[s.totalRow, { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 6, marginTop: 2 }]}>
              <Text style={s.totalLabelBig}>TOTAL</Text>
              <Text style={s.totalValueBig}>{fcfa(facture.total)}</Text>
            </View>
          </View>
        </View>

        {/* ── Notes ── */}
        {facture.notes && (
          <View style={s.notesBox}>
            <Text style={s.notesTitle}>NOTES</Text>
            <Text style={s.notesText}>{facture.notes}</Text>
          </View>
        )}

        {/* ── Pied de page ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>NDOUKOUMANE Fuel Manager — Document généré automatiquement</Text>
          <Text style={s.footerBold}>{facture.numero}</Text>
        </View>

      </Page>
    </Document>
  )
}
