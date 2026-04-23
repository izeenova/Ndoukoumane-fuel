'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCFA, formatDate } from '@/lib/utils'

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

  const fetchBudget = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/budget')
    const data = await res.json()
    setBudget(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchBudget() }, [fetchBudget])

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

          {/* Historique recharges */}
          <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700/50">
              <h3 className="text-white font-semibold text-sm">Historique des recharges</h3>
            </div>
            {budget.recharges.length === 0 ? (
              <p className="text-center py-10 text-slate-500 text-sm">Aucune recharge effectuée</p>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {budget.recharges.map(r => (
                  <div key={r.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium">{formatCFA(r.montant)}</p>
                      <p className="text-slate-500 text-xs">{r.createdBy.name} · {formatDate(r.createdAt)}{r.note ? ` · ${r.note}` : ''}</p>
                    </div>
                    <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                ))}
              </div>
            )}
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
