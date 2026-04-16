'use client'

import { useState, useEffect, useCallback } from 'react'
import { getRolePersonnelLabel } from '@/lib/utils'

interface Personnel {
  id: string
  nom: string
  prenom: string
  role: 'CHAUFFEUR' | 'MECANO' | 'RESPONSABLE_SERVICE'
  telephone: string | null
  matricule: string | null
  actif: boolean
  vehiculeAssigne: { immatriculation: string; marque: string; modele: string } | null
}

const ROLE_COLORS: Record<string, string> = {
  CHAUFFEUR:           'bg-blue-500/20 text-blue-400',
  MECANO:              'bg-orange-500/20 text-orange-400',
  RESPONSABLE_SERVICE: 'bg-slate-500/20 text-slate-400',
}

const emptyForm = { nom: '', prenom: '', role: 'CHAUFFEUR', telephone: '' }

export default function PersonnelPage() {
  const [personnel, setPersonnel]   = useState<Personnel[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [editItem, setEditItem]     = useState<Personnel | null>(null)
  const [form, setForm]             = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')

  const fetchPersonnel = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search)     params.set('search', search)
    if (filterRole) params.set('role', filterRole)
    const res  = await fetch(`/api/personnel?${params}`)
    const data = await res.json()
    setPersonnel(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [search, filterRole])

  useEffect(() => { fetchPersonnel() }, [fetchPersonnel])

  const openAdd = () => {
    setEditItem(null)
    setForm(emptyForm)
    setError('')
    setShowModal(true)
  }

  const openEdit = (p: Personnel) => {
    setEditItem(p)
    setForm({ nom: p.nom, prenom: p.prenom, role: p.role, telephone: p.telephone || '' })
    setError('')
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const url    = editItem ? `/api/personnel/${editItem.id}` : '/api/personnel'
    const method = editItem ? 'PUT' : 'POST'
    const res    = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Erreur') }
    else         { setShowModal(false); fetchPersonnel() }
    setSubmitting(false)
  }

  const handleDesactiver = async (id: string) => {
    if (!confirm('Désactiver ce membre du personnel ?')) return
    await fetch(`/api/personnel/${id}`, { method: 'DELETE' })
    fetchPersonnel()
  }

  const actifs = personnel.filter(p => p.actif)

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Personnel</h2>
          <p className="text-slate-400 text-sm">
            {actifs.length} membre{actifs.length !== 1 ? 's' : ''} actif{actifs.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Ajouter un membre
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
            placeholder="Rechercher par nom..."
            className="w-full bg-[#1E293B] border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterRole} onChange={e => setFilterRole(e.target.value)}
          className="bg-[#1E293B] border border-slate-700 rounded-xl px-3 py-2.5 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tous les rôles</option>
          <option value="CHAUFFEUR">Chauffeurs</option>
          <option value="MECANO">Mécaniciens</option>
          <option value="RESPONSABLE_SERVICE">Personnel</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider">Nom</th>
                <th className="text-left px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider">Rôle</th>
                <th className="text-left px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider hidden sm:table-cell">Véhicule</th>
                <th className="text-left px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider hidden md:table-cell">Plaque</th>
                <th className="text-left px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider hidden lg:table-cell">Téléphone</th>
                <th className="text-right px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-500 text-sm">Chargement...</td></tr>
              ) : personnel.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-500 text-sm">Aucun personnel trouvé</td></tr>
              ) : personnel.map(p => (
                <tr key={p.id} className={`hover:bg-slate-800/30 transition-colors ${!p.actif ? 'opacity-50' : ''}`}>

                  {/* Nom */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-white">{p.prenom[0]}{p.nom[0]}</span>
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{p.prenom} {p.nom}</p>
                        {!p.actif && <p className="text-red-400 text-xs">Inactif</p>}
                      </div>
                    </div>
                  </td>

                  {/* Rôle */}
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${ROLE_COLORS[p.role]}`}>
                      {getRolePersonnelLabel(p.role)}
                    </span>
                  </td>

                  {/* Véhicule (marque + modèle) */}
                  <td className="px-5 py-4 hidden sm:table-cell">
                    {p.vehiculeAssigne ? (
                      <p className="text-slate-300 text-sm">{p.vehiculeAssigne.marque} {p.vehiculeAssigne.modele}</p>
                    ) : (
                      <span className="text-slate-600 text-sm">—</span>
                    )}
                  </td>

                  {/* Plaque */}
                  <td className="px-5 py-4 hidden md:table-cell">
                    {p.vehiculeAssigne ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs font-mono font-semibold border border-slate-700">
                        {p.vehiculeAssigne.immatriculation}
                      </span>
                    ) : (
                      <span className="text-slate-600 text-sm">—</span>
                    )}
                  </td>

                  {/* Téléphone */}
                  <td className="px-5 py-4 hidden lg:table-cell">
                    <span className="text-slate-400 text-sm">{p.telephone || '—'}</span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {p.actif && (
                        <button
                          onClick={() => handleDesactiver(p.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 w-full max-w-md shadow-2xl modal-animate">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
              <h3 className="text-white font-semibold">{editItem ? 'Modifier le membre' : 'Nouveau membre'}</h3>
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
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Prénom *</label>
                  <input
                    value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Mamadou" required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Nom *</label>
                  <input
                    value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Diallo" required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-slate-300 mb-1.5">Rôle *</label>
                  <select
                    value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CHAUFFEUR">Chauffeur</option>
                    <option value="MECANO">Mécanicien</option>
                    <option value="RESPONSABLE_SERVICE">Personnel</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-slate-300 mb-1.5">Téléphone</label>
                  <input
                    value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+221 77 000 00 00"
                  />
                </div>
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
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                >
                  {submitting && (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  )}
                  {editItem ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
