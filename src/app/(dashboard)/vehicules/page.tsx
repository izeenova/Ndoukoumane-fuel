'use client'

import { useState, useEffect, useCallback } from 'react'
import { getStatutVehiculeLabel, getTypeVehiculeLabel } from '@/lib/utils'

interface Vehicule {
  id: string
  immatriculation: string
  type: 'CAMION' | 'VOITURE'
  marque: string
  modele: string
  annee: number | null
  capaciteReservoir: number
  niveauActuel: number
  statut: 'ACTIF' | 'EN_REPARATION' | 'HORS_SERVICE'
  notes: string | null
  periodeCarburation: number
  alerte: { seuil: number; actif: boolean } | null
  personnelAssigne: { id: string; prenom: string; nom: string; matricule: string | null } | null
  sorties: { date: string }[]
}

const STATUT_COLORS: Record<string, string> = {
  ACTIF: 'bg-green-500/20 text-green-400',
  EN_REPARATION: 'bg-orange-500/20 text-orange-400',
  HORS_SERVICE: 'bg-red-500/20 text-red-400',
}

const emptyForm = {
  immatriculation: '', type: 'CAMION', marque: '', modele: '',
  annee: '', capaciteReservoir: '', niveauActuel: '0', statut: 'ACTIF', notes: '', periodeCarburation: '30'
}

function getVehiculeVerrou(v: Vehicule) {
  if (!v.sorties || v.sorties.length === 0) return { locked: false, joursRestants: 0 }
  const daysSince = Math.floor((Date.now() - new Date(v.sorties[0].date).getTime()) / (1000 * 60 * 60 * 24))
  const locked = daysSince < v.periodeCarburation
  const joursRestants = v.periodeCarburation - daysSince
  return { locked, joursRestants }
}

export default function VehiculesPage() {
  const [vehicules, setVehicules] = useState<Vehicule[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatut, setFilterStatut] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editVehicule, setEditVehicule] = useState<Vehicule | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fetchVehicules = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filterType) params.set('type', filterType)
    if (filterStatut) params.set('statut', filterStatut)
    const res = await fetch(`/api/vehicules?${params}`)
    const data = await res.json()
    setVehicules(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [search, filterType, filterStatut])

  useEffect(() => { fetchVehicules() }, [fetchVehicules])

  const openAdd = () => {
    setEditVehicule(null)
    setForm(emptyForm)
    setError('')
    setShowModal(true)
  }

  const openEdit = (v: Vehicule) => {
    setEditVehicule(v)
    setForm({
      immatriculation: v.immatriculation, type: v.type,
      marque: v.marque, modele: v.modele, annee: v.annee?.toString() || '',
      capaciteReservoir: v.capaciteReservoir.toString(),
      niveauActuel: v.niveauActuel.toString(),
      statut: v.statut, notes: v.notes || '',
      periodeCarburation: v.periodeCarburation?.toString() || '30'
    })
    setError('')
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const url = editVehicule ? `/api/vehicules/${editVehicule.id}` : '/api/vehicules'
    const method = editVehicule ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Une erreur est survenue')
    } else {
      setShowModal(false)
      fetchVehicules()
    }
    setSubmitting(false)
  }

  const handleDelete = async (id: string, immat: string) => {
    if (!confirm(`Supprimer le véhicule ${immat} ?`)) return
    await fetch(`/api/vehicules/${id}`, { method: 'DELETE' })
    fetchVehicules()
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Véhicules</h2>
          <p className="text-slate-400 text-sm">{vehicules.length} véhicule{vehicules.length !== 1 ? 's' : ''} dans la flotte</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Ajouter un véhicule
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par immatriculation, marque..."
            className="w-full bg-[#1E293B] border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="bg-[#1E293B] border border-slate-700 rounded-xl px-3 py-2.5 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Tous types</option>
          <option value="CAMION">Camions</option>
          <option value="VOITURE">Voitures</option>
        </select>
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
          className="bg-[#1E293B] border border-slate-700 rounded-xl px-3 py-2.5 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Tous statuts</option>
          <option value="ACTIF">Actif</option>
          <option value="EN_REPARATION">En réparation</option>
          <option value="HORS_SERVICE">Hors service</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider">Véhicule</th>
                <th className="text-left px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider hidden sm:table-cell">Chauffeur</th>
                <th className="text-left px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider">Statut</th>
                <th className="text-right px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={4} className="text-center py-12 text-slate-500 text-sm">Chargement...</td></tr>
              ) : vehicules.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-12 text-slate-500 text-sm">Aucun véhicule trouvé</td></tr>
              ) : vehicules.map(v => {
                const verrou = getVehiculeVerrou(v)

                return (
                  <tr key={v.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 17H5a2 2 0 01-2-2V9a2 2 0 012-2h11l4 4v4a2 2 0 01-2 2h-1m-6 0a2 2 0 100 4 2 2 0 000-4zm6 0a2 2 0 100 4 2 2 0 000-4z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">{v.immatriculation}</p>
                          <p className="text-slate-500 text-xs">{v.marque} {v.modele}{v.annee ? ` · ${v.annee}` : ''} · {getTypeVehiculeLabel(v.type)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      {v.personnelAssigne ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-bold text-white">
                              {v.personnelAssigne.prenom[0]}{v.personnelAssigne.nom[0]}
                            </span>
                          </div>
                          <div>
                            <p className="text-white text-sm">{v.personnelAssigne.prenom} {v.personnelAssigne.nom}</p>
                            <p className="text-slate-500 text-xs">{v.personnelAssigne.matricule}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-600 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${STATUT_COLORS[v.statut]}`}>
                          {getStatutVehiculeLabel(v.statut)}
                        </span>
                        {verrou.locked && (
                          <span title={`Plein dans ${verrou.joursRestants} jour(s)`}>
                            <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(v)}
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(v.id, v.immatriculation)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 w-full max-w-lg shadow-2xl modal-animate">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
              <h3 className="text-white font-semibold">{editVehicule ? 'Modifier le véhicule' : 'Nouveau véhicule'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm">{error}</div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-slate-300 mb-1.5">Immatriculation *</label>
                  <input value={form.immatriculation} onChange={e => setForm(f => ({ ...f, immatriculation: e.target.value }))}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    placeholder="DK-1234-AB" required />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Type *</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="CAMION">Camion</option>
                    <option value="VOITURE">Voiture</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Statut</label>
                  <select value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="ACTIF">Actif</option>
                    <option value="EN_REPARATION">En réparation</option>
                    <option value="HORS_SERVICE">Hors service</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Marque *</label>
                  <input value={form.marque} onChange={e => setForm(f => ({ ...f, marque: e.target.value }))}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Mercedes" required />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Modèle *</label>
                  <input value={form.modele} onChange={e => setForm(f => ({ ...f, modele: e.target.value }))}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Actros 1845" required />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Année</label>
                  <input type="number" value={form.annee} onChange={e => setForm(f => ({ ...f, annee: e.target.value }))}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="2022" min="1990" max="2030" />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Capacité réservoir (L) *</label>
                  <input type="number" value={form.capaciteReservoir} onChange={e => setForm(f => ({ ...f, capaciteReservoir: e.target.value }))}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="600" required min="1" step="0.5" />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Niveau actuel (L)</label>
                  <input type="number" value={form.niveauActuel} onChange={e => setForm(f => ({ ...f, niveauActuel: e.target.value }))}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="300" min="0" step="0.5" />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Période carburant (jours)</label>
                  <input type="number" value={form.periodeCarburation} onChange={e => setForm(f => ({ ...f, periodeCarburation: e.target.value }))}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="30" min="7" max="90" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-slate-300 mb-1.5">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={2} placeholder="Informations supplémentaires..." />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-sm font-medium transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                  {submitting && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                  {editVehicule ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
