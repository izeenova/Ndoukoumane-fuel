'use client'

import { useState } from 'react'
import { PDFDownloadLink, PDFViewer, Document, Page, View, Text } from '@react-pdf/renderer'
import { FacturePDFDocument, type FacturePDFData } from './FacturePDFDocument'
import { RapportCartePDFDocument, type TransactionData } from './RapportCartePDFDocument'

// ─── Bouton de téléchargement ─────────────────────────────────────────────────
export function FactureDownloadButton({ facture }: { facture: FacturePDFData }) {
  return (
    <PDFDownloadLink
      document={<FacturePDFDocument facture={facture} />}
      fileName={`facture-${facture.numero}.pdf`}
    >
      {({ loading, error }) => (
        <button
          disabled={loading}
          title="Télécharger en PDF"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Génération...
            </>
          ) : error ? (
            <span className="text-red-300">Erreur PDF</span>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              PDF
            </>
          )}
        </button>
      )}
    </PDFDownloadLink>
  )
}

// ─── Document PDF multi-factures ─────────────────────────────────────────────
const mfcfa = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 0 }).format(n) + ' FCFA'
const mfdate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })

function MultiFacturePDFDocument({ factures }: { factures: FacturePDFData[] }) {
  const totalGeneral = factures.reduce((s, f) => s + f.total, 0)
  return (
    <Document
      title={`Factures groupées (${factures.length})`}
      author="NDOUKOUMANE Fuel Manager"
    >
      {factures.map((f, fi) => (
        <Page key={f.id} size="A4" style={{ backgroundColor: '#FFFFFF', padding: 40, fontFamily: 'Helvetica', fontSize: 9 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: '#4F46E5' }}>
            <View style={{ gap: 3 }}>
              <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#0F172A' }}>NDOUKOUMANE</Text>
              <Text style={{ fontSize: 8, color: '#4F46E5', fontFamily: 'Helvetica-Bold' }}>FUEL MANAGER</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#4F46E5' }}>FACTURE</Text>
              <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#0F172A' }}>{f.numero}</Text>
              <Text style={{ fontSize: 8, color: '#475569' }}>Date : {mfdate(f.date)}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
            <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 4, padding: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: '#4F46E5', marginBottom: 4 }}>VÉHICULE</Text>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#0F172A' }}>{f.vehicule.immatriculation}</Text>
              <Text style={{ fontSize: 7, color: '#475569' }}>{f.vehicule.marque} {f.vehicule.modele}</Text>
            </View>
            {f.vehicule.personnelAssigne && (
              <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 4, padding: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: '#4F46E5', marginBottom: 4 }}>CHAUFFEUR</Text>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#0F172A' }}>{f.vehicule.personnelAssigne.prenom} {f.vehicule.personnelAssigne.nom}</Text>
              </View>
            )}
            <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 4, padding: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: '#4F46E5', marginBottom: 4 }}>ÉMIS PAR</Text>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#0F172A' }}>{f.createdBy.name}</Text>
            </View>
          </View>

          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', backgroundColor: '#0F172A', borderRadius: 4, paddingVertical: 6, paddingHorizontal: 6 }}>
              <Text style={[{ flex: 1.5, fontSize: 6, fontFamily: 'Helvetica-Bold', color: '#FFFFFF' }]}>Type</Text>
              <Text style={[{ flex: 3, fontSize: 6, fontFamily: 'Helvetica-Bold', color: '#FFFFFF' }]}>Description</Text>
              <Text style={[{ flex: 1, fontSize: 6, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', textAlign: 'right' }]}>Qté</Text>
              <Text style={[{ flex: 1.5, fontSize: 6, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', textAlign: 'right' }]}>Prix unit.</Text>
              <Text style={[{ flex: 1.5, fontSize: 6, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', textAlign: 'right' }]}>Montant</Text>
            </View>
            {f.lignes.map((l, i) => (
              <View key={l.id} style={{ flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: i % 2 === 1 ? '#F8FAFC' : '#FFFFFF' }}>
                <Text style={{ flex: 1.5, fontSize: 7, color: l.type === 'CARBURANT' ? '#2563EB' : l.type === 'VIDANGE' ? '#D97706' : '#475569', fontFamily: 'Helvetica-Bold' }}>{l.type === 'CARBURANT' ? 'Carburant' : l.type === 'VIDANGE' ? 'Vidange' : 'Autre'}</Text>
                <Text style={{ flex: 3, fontSize: 7, color: '#0F172A' }}>{l.description}</Text>
                <Text style={{ flex: 1, fontSize: 7, color: '#475569', textAlign: 'right' }}>{l.quantite != null ? `${l.quantite}${l.type === 'CARBURANT' ? ' L' : ''}` : '—'}</Text>
                <Text style={{ flex: 1.5, fontSize: 7, color: '#475569', textAlign: 'right' }}>{l.prixUnitaire != null ? mfcfa(l.prixUnitaire) : '—'}</Text>
                <Text style={{ flex: 1.5, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#0F172A', textAlign: 'right' }}>{mfcfa(l.montant)}</Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16 }}>
            <View style={{ width: 180, borderTopWidth: 2, borderTopColor: '#4F46E5', paddingTop: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 4 }}>
                <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#0F172A' }}>TOTAL</Text>
                <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#DC2626' }}>{mfcfa(f.total)}</Text>
              </View>
            </View>
          </View>

          {fi < factures.length - 1 && (
            <View style={{ borderBottomWidth: 1, borderBottomColor: '#E2E8F0', marginTop: 10, paddingBottom: 10 }} />
          )}
        </Page>
      ))}
      {/* Page récapitulative */}
      {factures.length > 1 && (
        <Page size="A4" style={{ backgroundColor: '#FFFFFF', padding: 40, fontFamily: 'Helvetica', fontSize: 9 }}>
          <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#0F172A', marginBottom: 20 }}>Récapitulatif</Text>
          <View style={{ flexDirection: 'row', backgroundColor: '#0F172A', borderRadius: 4, paddingVertical: 6, paddingHorizontal: 6 }}>
            <Text style={{ flex: 2, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#FFFFFF' }}>N° Facture</Text>
            <Text style={{ flex: 2, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#FFFFFF' }}>Véhicule</Text>
            <Text style={{ flex: 1.5, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', textAlign: 'right' }}>Date</Text>
            <Text style={{ flex: 1.5, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', textAlign: 'right' }}>Montant</Text>
          </View>
          {factures.map(f => (
            <View key={f.id} style={{ flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
              <Text style={{ flex: 2, fontSize: 7, color: '#0F172A', fontFamily: 'Helvetica-Bold' }}>{f.numero}</Text>
              <Text style={{ flex: 2, fontSize: 7, color: '#475569' }}>{f.vehicule.immatriculation}</Text>
              <Text style={{ flex: 1.5, fontSize: 7, color: '#475569', textAlign: 'right' }}>{mfdate(f.date)}</Text>
              <Text style={{ flex: 1.5, fontSize: 7, color: '#0F172A', fontFamily: 'Helvetica-Bold', textAlign: 'right' }}>{mfcfa(f.total)}</Text>
            </View>
          ))}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
            <View style={{ width: 180, borderTopWidth: 2, borderTopColor: '#4F46E5', paddingTop: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0F172A' }}>TOTAL GÉNÉRAL</Text>
                <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#DC2626' }}>{mfcfa(totalGeneral)}</Text>
              </View>
            </View>
          </View>
        </Page>
      )}
    </Document>
  )
}
export { MultiFacturePDFDocument }

// ─── Bouton téléchargement groupé ────────────────────────────────────────────
export function MultiFactureDownloadButton({ factures }: { factures: FacturePDFData[] }) {
  if (factures.length === 0) return null
  return (
    <PDFDownloadLink
      document={<MultiFacturePDFDocument factures={factures} />}
      fileName={`factures-groupées-${factures.length}-factures.pdf`}
    >
      {({ loading, error }) => (
        <button
          disabled={loading}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          {loading ? (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
          {loading ? 'Génération...' : `PDF groupé (${factures.length})`}
        </button>
      )}
    </PDFDownloadLink>
  )
}

// ─── Bouton téléchargement rapport carte ─────────────────────────────────────
export function RapportCarteDownloadButton({ transactions, soldeInitial, soldeFinal, periodeLabel, nbMouvements, soldeActuel }: {
  transactions: TransactionData[]
  soldeInitial: number
  soldeFinal: number
  periodeLabel: string
  nbMouvements: number
  soldeActuel: number
}) {
  if (transactions.length === 0) return null
  const ascending = [...transactions].reverse()
  return (
    <PDFDownloadLink
      document={<RapportCartePDFDocument transactions={ascending} soldeInitial={soldeInitial} soldeFinal={soldeFinal} periodeLabel={periodeLabel} nbMouvements={nbMouvements} soldeActuel={soldeActuel} />}
      fileName={`rapport-carte-${periodeLabel.toLowerCase().replace(/\s+/g, '-')}.pdf`}
    >
      {({ loading }) => (
        <button
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors flex-shrink-0"
        >
          {loading ? (
            <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
          {loading ? 'Génération...' : 'Télécharger le rapport'}
        </button>
      )}
    </PDFDownloadLink>
  )
}

// ─── Modal de prévisualisation ────────────────────────────────────────────────
export function FacturePreviewModal({ facture, onClose }: { facture: FacturePDFData; onClose: () => void }) {
  const [tab, setTab] = useState<'apercu' | 'pdf'>('apercu')

  // Helpers
  const fcfa = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
  const fdate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
  const TYPE_COLORS: Record<string, string> = {
    CARBURANT: 'bg-blue-500/20 text-blue-400',
    VIDANGE:   'bg-amber-500/20 text-amber-400',
    AUTRE:     'bg-slate-500/20 text-slate-400',
  }
  const TYPE_LABELS: Record<string, string> = { CARBURANT: 'Carburant', VIDANGE: 'Vidange', AUTRE: 'Autre' }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col">
      {/* Barre d'actions */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#0F172A] border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold text-sm">Facture</span>
          <span className="bg-purple-500/20 text-purple-300 text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold">{facture.numero}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex bg-slate-800 rounded-lg p-0.5 mr-2">
            <button onClick={() => setTab('apercu')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === 'apercu' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              Aperçu HTML
            </button>
            <button onClick={() => setTab('pdf')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === 'pdf' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              Aperçu PDF
            </button>
          </div>
          {/* Télécharger */}
          <FactureDownloadButton facture={facture} />
          {/* Fermer */}
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors ml-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-auto p-6 flex items-start justify-center">
        {tab === 'apercu' ? (
          /* ── Aperçu HTML ── */
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl text-slate-900 overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between px-10 py-8 border-b-2 border-indigo-600">
              <div>
                <p className="text-2xl font-black text-slate-900 tracking-wide">NDOUKOUMANE</p>
                <p className="text-indigo-600 text-xs font-bold tracking-widest mt-0.5">FUEL MANAGER</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-indigo-600">FACTURE</p>
                <p className="text-slate-900 font-bold font-mono mt-0.5">{facture.numero}</p>
                <p className="text-slate-500 text-sm mt-0.5">Date : {fdate(facture.date)}</p>
              </div>
            </div>

            {/* Infos */}
            <div className="px-10 py-6 grid grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-2">Véhicule</p>
                <p className="text-slate-900 font-bold">{facture.vehicule.immatriculation}</p>
                <p className="text-slate-500 text-sm">{facture.vehicule.marque} {facture.vehicule.modele}</p>
              </div>
              {facture.vehicule.personnelAssigne && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-2">Chauffeur</p>
                  <p className="text-slate-900 font-bold">{facture.vehicule.personnelAssigne.prenom} {facture.vehicule.personnelAssigne.nom}</p>
                </div>
              )}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-2">Émis par</p>
                <p className="text-slate-900 font-bold">{facture.createdBy.name}</p>
                <p className="text-slate-500 text-sm">NDOUKOUMANE</p>
              </div>
            </div>

            {/* Tableau */}
            <div className="px-10 pb-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider rounded-l-lg">Type</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Description</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Qté</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Prix unit.</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider rounded-r-lg">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {facture.lignes.map((l, i) => (
                    <tr key={l.id} className={i % 2 === 1 ? 'bg-slate-50' : ''}>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${TYPE_COLORS[l.type]}`}>{TYPE_LABELS[l.type]}</span>
                        {l.typeCarburant && <span className={`block text-[10px] mt-0.5 font-medium ${l.typeCarburant === 'GASOIL' ? 'text-amber-600' : 'text-blue-600'}`}>{l.typeCarburant}</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{l.description}</td>
                      <td className="px-4 py-3 text-right text-slate-500">
                        {l.quantite != null ? `${l.quantite}${l.type === 'CARBURANT' ? ' L' : ''}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">
                        {l.prixUnitaire != null ? fcfa(l.prixUnitaire) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-900 font-bold">{fcfa(l.montant)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="px-10 py-6 flex justify-end">
              <div className="w-56 border-t-2 border-indigo-600 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-sm">{facture.lignes.length} ligne{facture.lignes.length > 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200">
                  <span className="text-slate-900 font-bold text-lg">TOTAL</span>
                  <span className="text-red-600 font-black text-xl">{fcfa(facture.total)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {facture.notes && (
              <div className="px-10 pb-6">
                <div className="bg-indigo-50 border-l-4 border-indigo-500 rounded-r-xl p-4">
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">Notes</p>
                  <p className="text-slate-700 text-sm">{facture.notes}</p>
                </div>
              </div>
            )}

            {/* Pièce jointe */}
            {facture.pieceJointe && (
              <div className="px-10 pb-6">
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <p className="text-slate-600 text-xs font-semibold flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      FACTURE PHYSIQUE — {facture.pieceJointeNom}
                    </p>
                    <a href={facture.pieceJointe} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Ouvrir ↗</a>
                  </div>
                  {facture.pieceJointeType?.startsWith('image/') ? (
                    <img src={facture.pieceJointe} alt="Facture physique" className="w-full max-h-96 object-contain bg-white" />
                  ) : (
                    <a href={facture.pieceJointe} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors">
                      <div className="w-10 h-12 bg-red-100 rounded flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-slate-700 font-medium text-sm">{facture.pieceJointeNom}</p>
                        <p className="text-slate-400 text-xs">Cliquer pour ouvrir le PDF</p>
                      </div>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-10 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <p className="text-slate-400 text-xs">NDOUKOUMANE Fuel Manager — Document généré automatiquement</p>
              <p className="text-slate-500 text-xs font-bold font-mono">{facture.numero}</p>
            </div>
          </div>
        ) : (
          /* ── Aperçu PDF intégré ── */
          <div className="w-full max-w-3xl" style={{ height: 'calc(100vh - 120px)' }}>
            <PDFViewer width="100%" height="100%" className="rounded-xl overflow-hidden">
              <FacturePDFDocument facture={facture} />
            </PDFViewer>
          </div>
        )}
      </div>
    </div>
  )
}
