import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

export interface TransactionData {
  id: string
  type: 'RECHARGE' | 'CARBURANT' | 'VIDANGE' | 'FACTURE'
  date: string
  montant: number
  description: string
  createdBy?: string
  soldePrecedent: number
  soldeCumul: number
}

const fcfa = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 0 }).format(n) + ' FCFA'

const fdate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })

const C = {
  navy: '#0F172A', indigo: '#4F46E5', slate: '#475569', light: '#94A3B8',
  border: '#E2E8F0', bg: '#F8FAFC', white: '#FFFFFF', red: '#DC2626', green: '#16A34A',
}

const s = StyleSheet.create({
  page: { backgroundColor: C.white, padding: 40, fontFamily: 'Helvetica', fontSize: 9 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: C.indigo },
  title: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: C.navy },
  subtitle: { fontSize: 8, color: C.indigo, marginTop: 2 },
  period: { fontSize: 9, color: C.slate, textAlign: 'right' },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  summaryBox: { flex: 1, backgroundColor: C.bg, borderRadius: 4, padding: 10, borderWidth: 1, borderColor: C.border },
  summaryLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.indigo, marginBottom: 4 },
  summaryValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: C.navy },
  table: { marginBottom: 16 },
  thead: { flexDirection: 'row', backgroundColor: C.navy, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 6 },
  th: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.white },
  thType: { flex: 1.5 }, thDesc: { flex: 3 }, thDate: { flex: 1.5 }, thMontant: { flex: 1.5, textAlign: 'right' }, thSolde: { flex: 1.5, textAlign: 'right' },
  tr: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  trAlt: { backgroundColor: C.bg },
  td: { fontSize: 7.5, color: C.navy },
  tdType: { flex: 1.5, fontSize: 7, fontFamily: 'Helvetica-Bold' },
  tdDesc: { flex: 3 },
  tdDate: { flex: 1.5, color: C.slate },
  tdMontant: { flex: 1.5, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  tdSolde: { flex: 1.5, textAlign: 'right', color: C.slate },
  footer: { borderTopWidth: 1, borderTopColor: C.indigo, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  footerBlock: { gap: 3 },
  footerLabel: { fontSize: 8, color: C.slate },
  footerValue: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  pageFooter: { position: 'absolute', bottom: 30, left: 40, right: 40, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8 },
  pageFooterText: { fontSize: 7, color: C.light, textAlign: 'center' },
})

export function RapportCartePDFDocument({
  transactions, soldeInitial, soldeFinal, periodeLabel, nbMouvements, soldeActuel,
}: {
  transactions: TransactionData[]
  soldeInitial: number
  soldeFinal: number
  periodeLabel: string
  nbMouvements: number
  soldeActuel: number
}) {
  const TYPE_COLORS: Record<string, string> = {
    RECHARGE: '#16A34A', CARBURANT: '#2563EB', FACTURE: '#7C3AED', VIDANGE: '#D97706',
  }
  const TYPE_LABELS: Record<string, string> = {
    RECHARGE: 'Recharge', CARBURANT: 'Carburant', FACTURE: 'Facture', VIDANGE: 'Vidange',
  }

  return (
    <Document title="Rapport Carte Essence" author="NDOUKOUMANE Fuel Manager">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>Rapport Carte Essence</Text>
            <Text style={s.subtitle}>NDOUKOUMANE Fuel Manager</Text>
          </View>
          <Text style={s.period}>{periodeLabel}</Text>
        </View>

        <View style={s.summaryRow}>
          <View style={s.summaryBox}>
            <Text style={s.summaryLabel}>Solde début</Text>
            <Text style={[s.summaryValue, { color: soldeInitial < 0 ? C.red : C.navy }]}>{fcfa(soldeInitial)}</Text>
          </View>
          <View style={s.summaryBox}>
            <Text style={s.summaryLabel}>Solde fin période</Text>
            <Text style={[s.summaryValue, { color: soldeFinal < 0 ? C.red : C.green }]}>{fcfa(soldeFinal)}</Text>
          </View>
          <View style={s.summaryBox}>
            <Text style={s.summaryLabel}>Mouvements</Text>
            <Text style={s.summaryValue}>{nbMouvements}</Text>
          </View>
          <View style={s.summaryBox}>
            <Text style={s.summaryLabel}>Solde actuel</Text>
            <Text style={[s.summaryValue, { color: soldeActuel < 0 ? C.red : C.navy }]}>{fcfa(soldeActuel)}</Text>
          </View>
        </View>

        {/* Note sur le solde */}
        {soldeInitial > 0 && soldeInitial !== soldeFinal && (
          <View style={{ backgroundColor: C.bg, borderRadius: 4, padding: 8, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: C.indigo }}>
            <Text style={{ fontSize: 7, color: C.slate, lineHeight: 1.4 }}>
              Le solde de début de période ({fcfa(soldeInitial)}) correspond au solde juste avant la première transaction affichée. 
              Il peut être différent du solde final de la période précédente car seuls les mouvements filtrés sont pris en compte.
            </Text>
          </View>
        )}

        <View style={s.table}>
          <View style={s.thead}>
            <Text style={[s.th, s.thType]}>Type</Text>
            <Text style={[s.th, s.thDesc]}>Description</Text>
            <Text style={[s.th, s.thDate]}>Date</Text>
            <Text style={[s.th, s.thMontant]}>Montant</Text>
            <Text style={[s.th, s.thSolde]}>Solde</Text>
          </View>
          {transactions.map((t, i) => (
            <View key={`${t.type}-${t.id}`} style={[s.tr, i % 2 === 1 ? s.trAlt : {}]}>
              <Text style={[s.tdType, { color: TYPE_COLORS[t.type] }]}>{TYPE_LABELS[t.type]}</Text>
              <Text style={[s.td, s.tdDesc]}>{t.description}</Text>
              <Text style={[s.td, s.tdDate]}>{fdate(t.date)}</Text>
              <Text style={[s.td, s.tdMontant, { color: t.montant > 0 ? C.green : C.red }]}>
                {t.montant > 0 ? '+' : ''}{fcfa(t.montant)}
              </Text>
              <Text style={[s.td, s.tdSolde]}>{fcfa(t.soldeCumul)}</Text>
            </View>
          ))}
        </View>

        <View style={s.footer}>
          <View style={s.footerBlock}>
            <Text style={s.footerLabel}>Solde début</Text>
            <Text style={[s.footerValue, { color: soldeInitial < 0 ? C.red : C.navy }]}>{fcfa(soldeInitial)}</Text>
          </View>
          <View style={s.footerBlock}>
            <Text style={s.footerLabel}>Solde fin de période</Text>
            <Text style={[s.footerValue, { color: soldeFinal < 0 ? C.red : C.green }]}>{fcfa(soldeFinal)}</Text>
          </View>
          <View style={s.footerBlock}>
            <Text style={s.footerLabel}>Mouvements</Text>
            <Text style={s.footerValue}>{nbMouvements}</Text>
          </View>
          <View style={s.footerBlock}>
            <Text style={s.footerLabel}>Solde actuel</Text>
            <Text style={[s.footerValue, { color: soldeActuel < 0 ? C.red : C.navy }]}>{fcfa(soldeActuel)}</Text>
          </View>
        </View>

        <View style={s.pageFooter} fixed>
          <Text style={s.pageFooterText}>NDOUKOUMANE Fuel Manager — Rapport généré automatiquement</Text>
        </View>
      </Page>
    </Document>
  )
}
