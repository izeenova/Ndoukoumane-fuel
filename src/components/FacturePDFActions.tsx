'use client'

import { useState } from 'react'
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer'
import { FacturePDFDocument, type FacturePDFData } from './FacturePDFDocument'

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
