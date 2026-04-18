'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCFA } from '@/lib/utils'

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

export default function AlertesPage() {
  const [budget, setBudget]           = useState<Budget | null>(null)
  const [loading, setLoading]         = useState(true)
  const [userRole, setUserRole]       = useState('')
  const [showModal, setShowModal]     = useState(false)
  const [montant, setMontant]         = useState('')
  const [note, setNote]               = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState('')
  const [editSeuil, setEditSeuil]     = useState(false)
  const [newSeuil, setNewSeuil]       = useState('')
  const [savingSeuil, setSavingSeuil] = useState(false)

  const fetchBudget = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/budget')
    const data = await res.json()
    setBudget(data)
    setLoading(false)
  }, [])

  const fetchSession = async () => {
    const res  = await fetch('/api/auth/session')
    const data = await res.json()
    setUserRole(data?.user?.role || '')
  }

  useEffect(() => { fetchBudget(); fetchSession() }, [fetchBudget])

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true); setError('')
    const res = await fetch('/api/budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ montant, note }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Erreur') }
    else { setShowModal(false); setMontant(''); setNote(''); fetchBudget() }
    setSubmitting(false)
  }

  const handleSeuilUpdate = async () => {
    if (!newSeuil || isNaN(parseFloat(newSeuil))) return
    setSavingSeuil(true)
    await fetch('/api/budget', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seuilAlerte: newSeuil }),
    })
    setEditSeuil(false); setSavingSeuil(false)
    fetchBudget()
  }

  // Couleur selon niveau du solde
  const getSoldeStyle = (solde: number, seuil: number) => {
    if (solde <= 0)          return { text: 'text-red-400',    border: 'border-red-500/30',    bg: 'bg-red-500/10' }
    if (solde <= seuil)      return { text: 'text-orange-400', border: 'border-orange-500/30', bg: 'bg-orange-500/10' }
    if (solde <= seuil * 2)  return { text: 'text-yellow-400', border: 'border-yellow-500/30', bg: 'bg-yellow-500/10' }
    return                          { text: 'text-green-400',  border: 'border-green-500/30',  bg: 'bg-green-500/10' }
  }

  const style = budget ? getSoldeStyle(budget.solde, budget.seuilAlerte) : null

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Alertes</h2>
          <p className="text-slate-400 text-sm">Budget carburant — carte d'essence</p>
        </div>
        {userRole === 'ADMIN' && (
          <button
            onClick={() => { setError(''); setShowModal(true) }}
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Recharger la carte
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500 text-sm">Chargement...</div>
      ) : budget ? (
        <>
          {/* Alerte banner */}
          {budget.enAlerte && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-red-400 font-semibold text-sm">Solde bas — rechargement requis</p>
                <p className="text-red-400/70 text-xs mt-0.5">
                  Le solde ({formatCFA(budget.solde)}) est en dessous du seuil d'alerte ({formatCFA(budget.seuilAlerte)}).
                  Veuillez contacter l'admin pour recharger la carte d'essence.
                </p>
              </div>
            </div>
          )}

          {/* Carte solde principal */}
          <div className={`rounded-2xl border ${style!.border} ${style!.bg} p-6`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-slate-400 text-sm mb-1">Solde disponible</p>
                <p className={`text-4xl font-bold ${style!.text}`}>
                  {formatCFA(budget.solde)}
                </p>
                <p className="text-slate-500 text-xs mt-2">
                  {budget.recharges.length} recharge{budget.recharges.length !== 1 ? 's' : ''} effectuée{budget.recharges.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Seuil d'alerte */}
              <div className="bg-[#0F172A] rounded-xl p-4 min-w-[180px]">
                <p className="text-slate-400 text-xs mb-1">Seuil d'alerte</p>
                {editSeuil ? (
                  <div className="space-y-2">
                    <input
                      type="number"
                      value={newSeuil}
                      onChange={e => setNewSeuil(e.target.value)}
                      className="w-full bg-[#1E293B] border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={budget.seuilAlerte.toString()}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button onClick={handleSeuilUpdate} disabled={savingSeuil} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg py-1 text-xs font-medium">
                        {savingSeuil ? '...' : 'Valider'}
                      </button>
                      <button onClick={() => setEditSeuil(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg py-1 text-xs">
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-white font-bold text-sm">{formatCFA(budget.seuilAlerte)}</p>
                    {userRole === 'ADMIN' && (
                      <button onClick={() => { setNewSeuil(budget.seuilAlerte.toString()); setEditSeuil(true) }} className="text-slate-500 hover:text-blue-400 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
                <p className="text-slate-600 text-[10px] mt-1">Alerte déclenchée en dessous</p>
              </div>
            </div>
          </div>

          {/* Historique des recharges */}
          <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700/50">
              <h3 className="text-white font-semibold text-sm">Historique des recharges</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider">Date</th>
                    <th className="text-left px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider">Montant</th>
                    <th className="text-left px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider hidden sm:table-cell">Note</th>
                    <th className="text-left px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider hidden md:table-cell">Par</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {budget.recharges.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-slate-500 text-sm">
                        Aucune recharge effectuée
                      </td>
                    </tr>
                  ) : budget.recharges.map(r => (
                    <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-4">
                        <p className="text-white text-sm">
                          {new Date(r.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-slate-500 text-xs">
                          {new Date(r.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-green-400 font-bold text-sm">+{formatCFA(r.montant)}</span>
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <span className="text-slate-400 text-sm">{r.note || <span className="text-slate-600">—</span>}</span>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <span className="text-slate-400 text-sm">{r.createdBy.name}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {/* Modal recharge */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 w-full max-w-md shadow-2xl modal-animate">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
              <div>
                <h3 className="text-white font-semibold">Recharger la carte d'essence</h3>
                <p className="text-slate-400 text-xs mt-0.5">Solde actuel : {budget ? formatCFA(budget.solde) : '—'}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleRecharge} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm">{error}</div>
              )}
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Montant de recharge (FCFA) *</label>
                <input
                  type="number"
                  value={montant}
                  onChange={e => setMontant(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="500 000"
                  min="1"
                  required
                  autoFocus
                />
                {montant && !isNaN(parseFloat(montant)) && (
                  <p className="text-green-400 text-xs mt-1">
                    Nouveau solde : {formatCFA((budget?.solde || 0) + parseFloat(montant))}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Note (optionnel)</label>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Recharge mensuelle avril 2026"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button" onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-sm font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit" disabled={submitting}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                >
                  {submitting && (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  )}
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
