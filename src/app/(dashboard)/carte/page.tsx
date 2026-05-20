'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { formatCFA, formatDate } from '@/lib/utils'

const RapportCarteDownloadButton = dynamic(
  () => import('@/components/FacturePDFActions').then(m => m.RapportCarteDownloadButton),
  { ssr: false, loading: () => null }
)

interface Recharge {
  id: string
  montant: number
  note: string | null
  createdAt: string
  createdBy: { name: string }
}

interface Budget {
  id: string
  solde: number
  seuilAlerte: number
  enAlerte: boolean
  recharges: Recharge[]
}

interface Transaction {
  id: string
  type: 'RECHARGE' | 'CARBURANT' | 'VIDANGE' | 'FACTURE'
  date: string
  montant: number
  description: string
  createdBy?: string
  soldePrecedent: number
  soldeCumul: number
}

export default function CartePage() {
  const [budget, setBudget]           = useState<Budget | null>(null)
  const [loading, setLoading]         = useState(true)
  const [showModal, setShowModal]     = useState(false)
  const [montant, setMontant]         = useState('')
  const [note, setNote]               = useState('')
  const [date, setDate]               = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState('')
  const [editSeuil, setEditSeuil]       = useState(false)
  const [newSeuil, setNewSeuil]         = useState('')
  const [savingSeuil, setSavingSeuil]   = useState(false)
  const [showReset, setShowReset]       = useState(false)
  const [resetting, setResetting]       = useState(false)
  const [deletingId, setDeletingId]     = useState<string | null>(null)
  const [historique, setHistorique]       = useState<Transaction[]>([])
  const [loadingHist, setLoadingHist]     = useState(false)
  const [histDateDebut, setHistDateDebut] = useState('')
  const [histDateFin, setHistDateFin]     = useState('')
  const [histTypeFilter, setHistTypeFilter] = useState<'TOUS' | 'ENTREES' | 'SORTIES'>('TOUS')
  const [histPeriode, setHistPeriode]       = useState<string>('')
  const [prixEssence, setPrixEssence]       = useState('650')
  const [prixGasoil, setPrixGasoil]         = useState('700')
  const [editPrixEssence, setEditPrixEssence]   = useState(false)
  const [editPrixGasoil, setEditPrixGasoil]     = useState(false)
  const [newPrixEssence, setNewPrixEssence]     = useState('')
  const [newPrixGasoil, setNewPrixGasoil]       = useState('')
  const [savingPrix, setSavingPrix]             = useState(false)

  const fetchBudget = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/budget')
    const data = await res.json()
    setBudget(data)
    setLoading(false)
  }, [])

  const HIST_PERIODES = [
    { value: '',      label: 'Tout' },
    { value: 'jour',  label: 'Aujourd\'hui' },
    { value: 'mois',  label: 'Ce mois' },
    { value: 'trim',  label: 'Ce trimestre' },
  ]

  const fetchHistorique = useCallback(async () => {
    setLoadingHist(true)
    const params = new URLSearchParams()
    if (histDateDebut) params.set('dateDebut', histDateDebut)
    if (histDateFin)   params.set('dateFin', histDateFin)
    if (histPeriode) params.set('periode', histPeriode)
    const res  = await fetch(`/api/budget/historique?${params}`)
    const data = await res.json()
    setHistorique(Array.isArray(data) ? data : [])
    setLoadingHist(false)
  }, [histDateDebut, histDateFin, histPeriode])

  useEffect(() => { fetchBudget() }, [fetchBudget])
  useEffect(() => { fetchHistorique() }, [fetchHistorique])

  // Gestion des périodes prédéfinies
  useEffect(() => {
    if (!histPeriode) return
    const now = new Date()
    let debut = ''
    let fin = ''
    if (histPeriode === 'jour') {
      debut = now.toISOString().slice(0, 10)
      fin = debut
    } else if (histPeriode === 'mois') {
      debut = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    } else if (histPeriode === 'trim') {
      debut = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().slice(0, 10)
    }
    setHistDateDebut(debut)
    setHistDateFin(fin)
  }, [histPeriode])

  const fetchPrix = useCallback(async () => {
    const res = await fetch('/api/parametres')
    const data = await res.json()
    if (data.prixCarburant) setPrixEssence(data.prixCarburant)
    if (data.prixGasoil) setPrixGasoil(data.prixGasoil)
  }, [])

  useEffect(() => { fetchPrix() }, [fetchPrix])

  const handlePrixEssenceUpdate = async () => {
    if (!newPrixEssence || isNaN(parseFloat(newPrixEssence))) return
    setSavingPrix(true)
    await fetch('/api/parametres', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prixCarburant: newPrixEssence }),
    })
    setPrixEssence(newPrixEssence)
    setEditPrixEssence(false)
    setSavingPrix(false)
  }

  const handlePrixGasoilUpdate = async () => {
    if (!newPrixGasoil || isNaN(parseFloat(newPrixGasoil))) return
    setSavingPrix(true)
    await fetch('/api/parametres', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prixGasoil: newPrixGasoil }),
    })
    setPrixGasoil(newPrixGasoil)
    setEditPrixGasoil(false)
    setSavingPrix(false)
  }

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true); setError('')
    const res = await fetch('/api/budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ montant, note, date: date || undefined }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Erreur') }
    else { setShowModal(false); setMontant(''); setNote(''); setDate(''); fetchBudget() }
    setSubmitting(false)
  }

  const handleDeleteRecharge = async (id: string) => {
    if (!confirm('Supprimer cette recharge ? Le montant sera déduit du solde actuel.')) return
    setDeletingId(id)
    await fetch(`/api/budget/recharge/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    fetchBudget()
    fetchHistorique()
  }

  const handleReset = async () => {
    setResetting(true)
    await fetch('/api/budget', { method: 'PATCH' })
    setShowReset(false)
    setResetting(false)
    fetchBudget()
  }

  const handleSeuilUpdate = async () => {
    if (!newSeuil || isNaN(parseFloat(newSeuil))) return
    setSavingSeuil(true)
    await fetch('/api/budget', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seuilAlerte: newSeuil }),
    })
    setEditSeuil(false); setSavingSeuil(false); fetchBudget()
  }

  const totalRecharge = budget?.recharges.reduce((s, r) => s + r.montant, 0) || 0
  const moyenneRecharge = budget && budget.recharges.length > 0 ? totalRecharge / budget.recharges.length : 0

  const getSoldeStyle = (solde: number, seuil: number) => {
    if (solde <= 0)         return { text: 'text-red-400',    border: 'border-red-500/30',    bg: 'bg-red-500/10' }
    if (solde <= seuil)     return { text: 'text-orange-400', border: 'border-orange-500/30', bg: 'bg-orange-500/10' }
    if (solde <= seuil * 2) return { text: 'text-yellow-400', border: 'border-yellow-500/30', bg: 'bg-yellow-500/10' }
    return                         { text: 'text-green-400',  border: 'border-green-500/30',  bg: 'bg-green-500/10' }
  }

  const style = budget ? getSoldeStyle(budget.solde, budget.seuilAlerte) : null

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Carte Essence</h2>
          <p className="text-slate-400 text-sm">Budget carburant — gestion et historique</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowReset(true)}
            className="inline-flex items-center gap-2 bg-slate-700 hover:bg-red-600/80 text-slate-300 hover:text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Réinitialiser
          </button>
          <button onClick={() => { setError(''); setShowModal(true) }}
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Recharger la carte
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500 text-sm">Chargement...</div>
      ) : budget ? (
        <>
          {budget.enAlerte && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-red-400 font-semibold text-sm">Solde bas — rechargement requis</p>
                <p className="text-red-400/70 text-xs mt-0.5">Le solde ({formatCFA(budget.solde)}) est en dessous du seuil ({formatCFA(budget.seuilAlerte)}).</p>
              </div>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className={`rounded-xl border ${style!.border} ${style!.bg} p-4`}>
              <p className="text-slate-400 text-xs mb-1">Solde actuel</p>
              <p className={`text-2xl font-bold ${style!.text}`}>{formatCFA(budget.solde)}</p>
            </div>
            <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 p-4">
              <p className="text-slate-400 text-xs mb-1">Total rechargé</p>
              <p className="text-2xl font-bold text-white">{formatCFA(totalRecharge)}</p>
            </div>
            <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 p-4">
              <p className="text-slate-400 text-xs mb-1">Nb recharges</p>
              <p className="text-2xl font-bold text-white">{budget.recharges.length}</p>
            </div>
            <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 p-4">
              <p className="text-slate-400 text-xs mb-1">Moy. par recharge</p>
              <p className="text-2xl font-bold text-white">{formatCFA(moyenneRecharge)}</p>
            </div>
          </div>

          {/* Prix des carburants */}
          <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 p-5">
            <h3 className="text-white font-semibold text-sm mb-4">Prix des carburants</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Essence */}
              <div className="bg-[#0F172A] rounded-xl border border-slate-700/50 p-4">
                <p className="text-slate-400 text-xs mb-2">Essence</p>
                {editPrixEssence ? (
                  <div className="flex items-center gap-2">
                    <input type="number" value={newPrixEssence} onChange={e => setNewPrixEssence(e.target.value)} autoFocus
                      className="w-28 bg-[#1E293B] border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    <button onClick={handlePrixEssenceUpdate} disabled={savingPrix}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg text-xs font-medium">
                      {savingPrix ? '...' : 'Valider'}
                    </button>
                    <button onClick={() => setEditPrixEssence(false)} className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-xs">Annuler</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-white font-bold text-lg">{parseInt(prixEssence).toLocaleString('fr-FR')} FCFA/L</p>
                    <button onClick={() => { setNewPrixEssence(prixEssence); setEditPrixEssence(true) }}
                      className="text-slate-500 hover:text-green-400 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              {/* Gasoil */}
              <div className="bg-[#0F172A] rounded-xl border border-amber-500/20 p-4">
                <p className="text-amber-400 text-xs mb-2">Gasoil</p>
                {editPrixGasoil ? (
                  <div className="flex items-center gap-2">
                    <input type="number" value={newPrixGasoil} onChange={e => setNewPrixGasoil(e.target.value)} autoFocus
                      className="w-28 bg-[#1E293B] border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                    <button onClick={handlePrixGasoilUpdate} disabled={savingPrix}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white rounded-lg text-xs font-medium">
                      {savingPrix ? '...' : 'Valider'}
                    </button>
                    <button onClick={() => setEditPrixGasoil(false)} className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-xs">Annuler</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-amber-400 font-bold text-lg">{parseInt(prixGasoil).toLocaleString('fr-FR')} FCFA/L</p>
                    <button onClick={() => { setNewPrixGasoil(prixGasoil); setEditPrixGasoil(true) }}
                      className="text-slate-500 hover:text-amber-400 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Seuil d'alerte */}
          <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-slate-400 text-sm">Seuil d&apos;alerte</p>
              {editSeuil ? (
                <div className="flex items-center gap-2 mt-1">
                  <input type="number" value={newSeuil} onChange={e => setNewSeuil(e.target.value)} autoFocus
                    className="w-32 bg-[#0F172A] border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button onClick={handleSeuilUpdate} disabled={savingSeuil}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-xs font-medium">
                    {savingSeuil ? '...' : 'Valider'}
                  </button>
                  <button onClick={() => setEditSeuil(false)} className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-xs">Annuler</button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-white font-bold text-lg">{formatCFA(budget.seuilAlerte)}</p>
                  <button onClick={() => { setNewSeuil(budget.seuilAlerte.toString()); setEditSeuil(true) }}
                    className="text-slate-500 hover:text-blue-400 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <p className="text-slate-500 text-xs text-right">Une alerte est émise sur le tableau de bord<br/>quand le solde passe en dessous de ce seuil.</p>
          </div>

          {/* Historique complet des mouvements */}
          <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700/50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <h3 className="text-white font-semibold text-sm">Historique des mouvements</h3>
                <RapportCarteDownloadButton
                  transactions={historique.filter(t =>
                    histTypeFilter === 'TOUS' ? true :
                    histTypeFilter === 'ENTREES' ? t.montant > 0 :
                    t.montant < 0
                  )}
                  soldeInitial={(() => {
                    const f = historique.filter(t =>
                      histTypeFilter === 'TOUS' ? true :
                      histTypeFilter === 'ENTREES' ? t.montant > 0 :
                      t.montant < 0)
                    return f.length > 0 ? f[f.length - 1].soldePrecedent : 0
                  })()}
                  soldeFinal={(() => {
                    const f = historique.filter(t =>
                      histTypeFilter === 'TOUS' ? true :
                      histTypeFilter === 'ENTREES' ? t.montant > 0 :
                      t.montant < 0)
                    return f.length > 0 ? f[0].soldeCumul : 0
                  })()}
                  periodeLabel={HIST_PERIODES.find(p => p.value === histPeriode)?.label || 'Période personnalisée'}
                  nbMouvements={historique.filter(t =>
                    histTypeFilter === 'TOUS' ? true :
                    histTypeFilter === 'ENTREES' ? t.montant > 0 :
                    t.montant < 0
                  ).length}
                />
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Périodes prédéfinies */}
                  {HIST_PERIODES.map(p => (
                    <button key={p.value} onClick={() => setHistPeriode(p.value)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        histPeriode === p.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-[#0F172A] text-slate-500 border border-slate-700 hover:text-slate-300'
                      }`}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <input type="date" value={histDateDebut} onChange={e => setHistDateDebut(e.target.value)}
                    className="bg-[#0F172A] border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <span className="text-slate-500 text-xs">→</span>
                  <input type="date" value={histDateFin} onChange={e => setHistDateFin(e.target.value)}
                    className="bg-[#0F172A] border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  {(histDateDebut || histDateFin) && (
                    <button onClick={() => { setHistDateDebut(''); setHistDateFin('') }}
                      className="text-slate-500 hover:text-white text-xs px-2 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500">✕</button>
                  )}
                </div>
              </div>
              {/* Filtre par type de mouvement */}
              <div className="flex gap-1.5">
                {([
                  { key: 'TOUS',    label: 'Tous les mouvements' },
                  { key: 'ENTREES', label: '↑ Entrées seulement' },
                  { key: 'SORTIES', label: '↓ Sorties seulement' },
                ] as const).map(f => (
                  <button key={f.key} onClick={() => setHistTypeFilter(f.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      histTypeFilter === f.key
                        ? f.key === 'ENTREES' ? 'bg-green-600/20 text-green-400 border border-green-500/40'
                        : f.key === 'SORTIES' ? 'bg-red-600/20 text-red-400 border border-red-500/40'
                        : 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                        : 'bg-[#0F172A] text-slate-500 border border-slate-700 hover:text-slate-300'
                    }`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {loadingHist ? (
              <p className="text-center py-10 text-slate-500 text-sm">Chargement...</p>
            ) : historique.filter(t =>
                histTypeFilter === 'TOUS' ? true :
                histTypeFilter === 'ENTREES' ? t.montant > 0 :
                t.montant < 0
              ).length === 0 ? (
              <p className="text-center py-10 text-slate-500 text-sm">Aucun mouvement sur cette période</p>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {historique.filter(t =>
                  histTypeFilter === 'TOUS' ? true :
                  histTypeFilter === 'ENTREES' ? t.montant > 0 :
                  t.montant < 0
                ).map(t => {
                  const isEntree = t.montant > 0
                  const badgeStyle =
                    t.type === 'RECHARGE' ? 'bg-green-500/20 text-green-400' :
                    t.type === 'CARBURANT' ? 'bg-blue-500/20 text-blue-400' :
                    t.type === 'FACTURE'   ? 'bg-purple-500/20 text-purple-400' :
                    'bg-amber-500/20 text-amber-400'
                  const badgeLabel =
                    t.type === 'RECHARGE'  ? 'Recharge' :
                    t.type === 'CARBURANT' ? 'Carburant' :
                    t.type === 'FACTURE'   ? 'Facture' :
                    'Vidange'

                  return (
                    <div key={`${t.type}-${t.id}`} className="px-5 py-3.5 flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeStyle}`}>{badgeLabel}</span>
                          {t.createdBy && (
                            <span className="text-slate-500 text-xs">{t.createdBy}</span>
                          )}
                        </div>
                        <p className="text-slate-300 text-sm truncate">{t.description}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{formatDate(t.date)}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className={`font-bold text-sm ${isEntree ? 'text-green-400' : 'text-red-400'}`}>
                            {isEntree ? '+' : ''}{formatCFA(t.montant)}
                          </p>
                          <p className="text-slate-600 text-xs mt-0.5">
                            <span className="text-slate-500">{formatCFA(t.soldePrecedent)}</span>
                            <span className="mx-1">→</span>
                            <span className={t.soldeCumul < 0 ? 'text-red-400' : 'text-slate-400'}>{formatCFA(t.soldeCumul)}</span>
                          </p>
                        </div>
                        {t.type === 'RECHARGE' && (
                          <button
                            onClick={() => handleDeleteRecharge(t.id)}
                            disabled={deletingId === t.id}
                            className="text-slate-600 hover:text-red-400 transition-colors disabled:opacity-40 flex-shrink-0"
                            title="Supprimer cette recharge"
                          >
                            {deletingId === t.id ? (
                              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {/* Solde final */}
            {!loadingHist && historique.length > 0 && (() => {
              const filtered = historique.filter(t =>
                histTypeFilter === 'TOUS' ? true :
                histTypeFilter === 'ENTREES' ? t.montant > 0 :
                t.montant < 0
              )
              const soldeFinal = filtered.length > 0 ? filtered[0].soldeCumul : 0
              const soldeInitial = filtered.length > 0 ? filtered[filtered.length - 1].soldePrecedent : 0
              return (
                <div className="px-5 py-4 border-t border-slate-700/50 bg-[#0F172A]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-slate-400 text-xs">Solde de début de période</p>
                      <p className="text-white font-bold">{formatCFA(soldeInitial)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-xs">Solde de fin de période</p>
                      <p className={`text-lg font-bold ${soldeFinal < 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {formatCFA(soldeFinal)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </>
      ) : (
        <p className="text-center py-20 text-slate-500 text-sm">Budget introuvable</p>
      )}

      {/* Modal réinitialisation */}
      {showReset && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
              <h3 className="text-white font-semibold">Réinitialiser le solde</h3>
              <button onClick={() => setShowReset(false)} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-slate-300 text-sm">
                Cette action va remettre le solde de la carte à <span className="text-white font-bold">0 FCFA</span>.
                L&apos;historique des recharges est conservé. Continuer ?
              </p>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowReset(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-sm font-medium">Annuler</button>
                <button onClick={handleReset} disabled={resetting}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                  {resetting && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                  Réinitialiser à 0
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal recharge */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
              <h3 className="text-white font-semibold">Recharger la carte</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleRecharge} className="p-6 space-y-4">
              {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm">{error}</div>}
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Montant (FCFA) *</label>
                <input type="number" value={montant} onChange={e => setMontant(e.target.value)} autoFocus
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="500000" required min="1" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Date de recharge <span className="text-slate-500">(optionnel — aujourd&apos;hui par défaut)</span></label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Note (optionnel)</label>
                <input value={note} onChange={e => setNote(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Recharge mensuelle..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-sm font-medium">Annuler</button>
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                  {submitting && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                  Recharger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
