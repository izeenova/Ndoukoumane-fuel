'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCFA, formatLitres, formatDateTime } from '@/lib/utils'

interface Sortie {
  id: string
  litres: number
  prixLitre: number
  coutTotal: number
  date: string
  notes: string | null
  vehicule: { immatriculation: string; marque: string; modele: string }
  personnel: { nom: string; prenom: string; role: string }
  createdBy: { name: string }
}

interface Vehicule { id: string; immatriculation: string; marque: string; modele: string; niveauActuel: number }
interface Personnel { id: string; nom: string; prenom: string; role: string }

const emptyForm = { vehiculeId: '', personnelId: '', litres: '', prixLitre: '650', date: '', notes: '' }

export default function CarburantPage() {
  const [sorties, setSorties] = useState<Sortie[]>([])
  const [vehicules, setVehicules] = useState<Vehicule[]>([])
  const [personnels, setPersonnels] = useState<Personnel[]>([])
  const [loading, setLoading] = useState(true)
  const [totalDepenses, setTotalDepenses] = useState(0)
  const [totalLitres, setTotalLitres] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: page.toString() })
    if (dateDebut) params.set('dateDebut', dateDebut)
    if (dateFin) params.set('dateFin', dateFin)
    const res = await fetch(`/api/carburant?${params}`)
    const data = await res.json()
    setSorties(data.sorties || [])
    setTotalPages(data.pages || 1)
    const total = (data.sorties || []).reduce((s: number, x: Sortie) => s + x.coutTotal, 0)
    const litres = (data.sorties || []).reduce((s: number, x: Sortie) => s + x.litres, 0)
    setTotalDepenses(total)
    setTotalLitres(litres)
    setLoading(false)
  }, [page, dateDebut, dateFin])

  const fetchVehicules = async () => {
    const res = await fetch('/api/vehicules?statut=ACTIF')
    const data = await res.json()
    setVehicules(Array.isArray(data) ? data : [])
  }

  const fetchPersonnels = async () => {
    const res = await fetch('/api/personnel')
    const data = await res.json()
    setPersonnels(Array.isArray(data) ? data.filter((p: any) => p.actif) : [])
  }

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchVehicules(); fetchPersonnels() }, [])

  const coutCalcule = form.litres && form.prixLitre
    ? (parseFloat(form.litres) * parseFloat(form.prixLitre)).toFixed(0)
    : '0'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setError('')
    const res = await fetch('/api/carburant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Erreur') } else {
      setShowModal(false); setForm(emptyForm); fetchData(); fetchVehicules()
    }
    setSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette sortie carburant ?')) return
    await fetch(`/api/carburant/${id}`, { method: 'DELETE' })
    fetchData(); fetchVehicules()
  }

  const getRolePersonnelLabel = (role: string) => {
    const labels: Record<string, string> = { CHAUFFEUR: 'Chauffeur', MECANO: 'Mécanicien', RESPONSABLE_SERVICE: 'Resp. Service' }
    return labels[role] || role
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Sorties Carburant</h2>
          <p className="text-slate-400 text-sm">{sorties.length} sortie{sorties.length !== 1 ? 's' : ''} affichée{sorties.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setError(''); setShowModal(true) }}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle sortie
        </button>
      </div>

      {/* Résumé période */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#1E293B] rounded-xl border border-blue-500/20 p-4">
          <p className="text-slate-400 text-xs mb-1">Total dépenses (filtre)</p>
          <p className="text-white text-xl font-bold">{formatCFA(totalDepenses)}</p>
        </div>
        <div className="bg-[#1E293B] rounded-xl border border-orange-500/20 p-4">
          <p className="text-slate-400 text-xs mb-1">Total litres (filtre)</p>
          <p className="text-white text-xl font-bold">{formatLitres(totalLitres)}</p>
        </div>
      </div>

      {/* Filtres date */}
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Date début</label>
          <input type="date" value={dateDebut} onChange={e => { setDateDebut(e.target.value); setPage(1) }}
            className="bg-[#1E293B] border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Date fin</label>
          <input type="date" value={dateFin} onChange={e => { setDateFin(e.target.value); setPage(1) }}
            className="bg-[#1E293B] border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {(dateDebut || dateFin) && (
          <button onClick={() => { setDateDebut(''); setDateFin(''); setPage(1) }}
            className="px-3 py-2.5 text-slate-400 hover:text-white text-sm rounded-xl border border-slate-700 hover:border-slate-600">
            Réinitialiser
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider">Véhicule</th>
                <th className="text-left px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider hidden md:table-cell">Personnel</th>
                <th className="text-right px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider">Litres</th>
                <th className="text-right px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider">Coût</th>
                <th className="text-right px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-500 text-sm">Chargement...</td></tr>
              ) : sorties.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-500 text-sm">Aucune sortie carburant</td></tr>
              ) : sorties.map(s => (
                <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-white text-sm">{formatDateTime(s.date)}</p>
                    {s.notes && <p className="text-slate-500 text-xs mt-0.5 truncate max-w-32">{s.notes}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-white font-semibold text-sm">{s.vehicule.immatriculation}</p>
                    <p className="text-slate-500 text-xs">{s.vehicule.marque} {s.vehicule.modele}</p>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <p className="text-white text-sm">{s.personnel.prenom} {s.personnel.nom}</p>
                    <p className="text-slate-500 text-xs">{getRolePersonnelLabel(s.personnel.role)}</p>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <p className="text-orange-400 font-semibold text-sm">{formatLitres(s.litres)}</p>
                    <p className="text-slate-500 text-xs">{formatCFA(s.prixLitre)}/L</p>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <p className="text-white font-bold text-sm">{formatCFA(s.coutTotal)}</p>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => handleDelete(s.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-700/50">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-sm disabled:opacity-40 hover:bg-slate-700">
              ← Précédent
            </button>
            <span className="text-slate-400 text-sm">Page {page} / {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-sm disabled:opacity-40 hover:bg-slate-700">
              Suivant →
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 w-full max-w-md shadow-2xl modal-animate">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
              <h3 className="text-white font-semibold">Nouvelle sortie carburant</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm">{error}</div>}
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Véhicule *</label>
                <select value={form.vehiculeId} onChange={e => setForm(f => ({ ...f, vehiculeId: e.target.value }))}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                  <option value="">Sélectionner un véhicule</option>
                  {vehicules.map(v => (
                    <option key={v.id} value={v.id}>{v.immatriculation} — {v.marque} {v.modele} ({formatLitres(v.niveauActuel)} restant)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Personnel *</label>
                <select value={form.personnelId} onChange={e => setForm(f => ({ ...f, personnelId: e.target.value }))}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                  <option value="">Sélectionner un membre</option>
                  {personnels.map(p => (
                    <option key={p.id} value={p.id}>{p.prenom} {p.nom} — {getRolePersonnelLabel(p.role)}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Litres *</label>
                  <input type="number" value={form.litres} onChange={e => setForm(f => ({ ...f, litres: e.target.value }))}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="50" required min="1" step="0.5" />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Prix/litre (FCFA) *</label>
                  <input type="number" value={form.prixLitre} onChange={e => setForm(f => ({ ...f, prixLitre: e.target.value }))}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="650" required min="1" />
                </div>
              </div>
              {form.litres && form.prixLitre && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-blue-300 text-sm">Coût total calculé</span>
                  <span className="text-white font-bold">{formatCFA(parseFloat(coutCalcule))}</span>
                </div>
              )}
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Date et heure</label>
                <input type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2} placeholder="Optionnel..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-sm font-medium">Annuler</button>
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                  {submitting && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
