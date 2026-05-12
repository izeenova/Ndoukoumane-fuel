'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { formatCFA, formatDate } from '@/lib/utils'

interface LigneFacture {
  id: string
  type: 'CARBURANT' | 'VIDANGE' | 'AUTRE'
  description: string
  quantite: number | null
  prixUnitaire: number | null
  montant: number
  notes: string | null
}

interface Facture {
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
  lignes: LigneFacture[]
  createdBy: { name: string }
}

interface Vehicule {
  id: string
  immatriculation: string
  marque: string
  modele: string
  personnelAssigne: { prenom: string; nom: string } | null
}

const TYPE_LABELS: Record<string, string> = { CARBURANT: 'Carburant', VIDANGE: 'Vidange', AUTRE: 'Autre' }
const TYPE_COLORS: Record<string, string> = {
  CARBURANT: 'bg-blue-500/20 text-blue-400',
  VIDANGE:   'bg-amber-500/20 text-amber-400',
  AUTRE:     'bg-slate-500/20 text-slate-400',
}

const emptyLigne = () => ({ type: 'AUTRE' as const, description: '', quantite: '', prixUnitaire: '', montant: '', notes: '' })

// Combobox véhicule
function VehiculeSelect({ vehicules, value, onChange }: {
  vehicules: Vehicule[]
  value: string
  onChange: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const selected = vehicules.find(v => v.id === value)
  const filtered = query
    ? vehicules.filter(v => `${v.immatriculation} ${v.marque} ${v.modele}`.toLowerCase().includes(query.toLowerCase()))
    : vehicules

  return (
    <div ref={ref} className="relative">
      <div
        className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-sm flex items-center gap-2 cursor-text focus-within:ring-2 focus-within:ring-blue-500"
        onClick={() => setOpen(true)}
      >
        <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={open ? query : (selected ? `${selected.immatriculation} — ${selected.marque} ${selected.modele}` : '')}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { setQuery(''); setOpen(true) }}
          placeholder="Rechercher un véhicule..."
          className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none min-w-0"
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-[#0F172A] border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-3">Aucun résultat</p>
            ) : filtered.map(v => (
              <button key={v.id} type="button"
                onClick={() => { onChange(v.id); setQuery(''); setOpen(false) }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-800 transition-colors ${value === v.id ? 'bg-blue-600/20 text-blue-300' : 'text-white'}`}
              >
                <span className="font-medium">{v.immatriculation}</span>
                <span className="text-slate-400 ml-2">{v.marque} {v.modele}</span>
                {v.personnelAssigne && <span className="text-slate-500 ml-2 text-xs">· {v.personnelAssigne.prenom} {v.personnelAssigne.nom}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function FacturesPage() {
  const [factures, setFactures]     = useState<Facture[]>([])
  const [vehicules, setVehicules]   = useState<Vehicule[]>([])
  const [loading, setLoading]       = useState(true)
  const [page, setPage]             = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch]         = useState('')
  const [dateDebut, setDateDebut]   = useState('')
  const [dateFin, setDateFin]       = useState('')
  const [userRole, setUserRole]     = useState('')
  const [budgetSolde, setBudgetSolde] = useState<number | null>(null)
  const [expanded, setExpanded]     = useState<string | null>(null)

  // Modal création
  const [showModal, setShowModal]       = useState(false)
  const [submitting, setSubmitting]     = useState(false)
  const [error, setError]               = useState('')
  const [formNumero, setFormNumero]     = useState('')
  const [formVehicule, setFormVehicule] = useState('')
  const [formDate, setFormDate]         = useState('')
  const [formNotes, setFormNotes]       = useState('')
  const [lignes, setLignes]             = useState([emptyLigne()])
  const [deletingId, setDeletingId]     = useState<string | null>(null)

  const fetchFactures = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: page.toString() })
    if (search)    params.set('search', search)
    if (dateDebut) params.set('dateDebut', dateDebut)
    if (dateFin)   params.set('dateFin', dateFin)
    const res  = await fetch(`/api/factures?${params}`)
    const data = await res.json()
    setFactures(data.factures || [])
    setTotalPages(data.pages || 1)
    setLoading(false)
  }, [page, search, dateDebut, dateFin])

  useEffect(() => { fetchFactures() }, [fetchFactures])

  useEffect(() => {
    fetch('/api/vehicules').then(r => r.json()).then(d => setVehicules(Array.isArray(d) ? d : []))
    fetch('/api/auth/session').then(r => r.json()).then(d => setUserRole(d?.user?.role || ''))
    fetch('/api/budget').then(r => r.json()).then(d => { if (d.solde !== undefined) setBudgetSolde(d.solde) })
  }, [])

  // Calcul automatique du montant d'une ligne quand quantite × prixUnitaire
  const updateLigne = (idx: number, field: string, value: string) => {
    setLignes(prev => {
      const next = [...prev]
      const l = { ...next[idx], [field]: value }
      // Recalculer montant si quantite et prixUnitaire renseignés
      if ((field === 'quantite' || field === 'prixUnitaire') && l.quantite && l.prixUnitaire) {
        const q = parseFloat(l.quantite as unknown as string)
        const p = parseFloat(l.prixUnitaire as unknown as string)
        if (!isNaN(q) && !isNaN(p)) l.montant = String(Math.round(q * p)) as unknown as string
      }
      next[idx] = l
      return next
    })
  }

  const addLigne = () => setLignes(prev => [...prev, emptyLigne()])
  const removeLigne = (idx: number) => setLignes(prev => prev.filter((_, i) => i !== idx))

  const totalFacture = lignes.reduce((s, l) => {
    const m = parseFloat(l.montant as unknown as string)
    return s + (isNaN(m) ? 0 : m)
  }, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true); setError('')

    const res = await fetch('/api/factures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        numero:     formNumero,
        vehiculeId: formVehicule,
        date:       formDate || undefined,
        notes:      formNotes || undefined,
        lignes:     lignes.map(l => ({
          type:         l.type,
          description:  l.description,
          quantite:     l.quantite  || undefined,
          prixUnitaire: l.prixUnitaire || undefined,
          montant:      l.montant,
          notes:        l.notes || undefined,
        })),
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Erreur')
    } else {
      setShowModal(false)
      resetForm()
      fetchFactures()
      fetch('/api/budget').then(r => r.json()).then(d => { if (d.solde !== undefined) setBudgetSolde(d.solde) })
    }
    setSubmitting(false)
  }

  const resetForm = () => {
    setFormNumero(''); setFormVehicule(''); setFormDate(''); setFormNotes('')
    setLignes([emptyLigne()]); setError('')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette facture ? Le montant total sera remboursé sur la carte essence.')) return
    setDeletingId(id)
    await fetch(`/api/factures/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    fetchFactures()
    fetch('/api/budget').then(r => r.json()).then(d => { if (d.solde !== undefined) setBudgetSolde(d.solde) })
  }

  const totalAffiche = factures.reduce((s, f) => s + f.total, 0)

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Factures</h2>
          <p className="text-slate-400 text-sm">Sorties groupées par numéro de facture</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {budgetSolde !== null && (
            <div className="bg-[#1E293B] border border-slate-700/50 rounded-xl px-4 py-2.5">
              <p className="text-slate-400 text-xs">Budget carte</p>
              <p className="text-white font-bold text-sm">{formatCFA(budgetSolde)}</p>
            </div>
          )}
          <button onClick={() => { resetForm(); setShowModal(true) }}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle facture
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Rechercher n° facture, véhicule..."
            className="w-full bg-[#1E293B] border border-slate-700/50 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500" />
        </div>
        <input type="date" value={dateDebut} onChange={e => { setDateDebut(e.target.value); setPage(1) }}
          className="bg-[#1E293B] border border-slate-700/50 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <span className="text-slate-500 text-sm">→</span>
        <input type="date" value={dateFin} onChange={e => { setDateFin(e.target.value); setPage(1) }}
          className="bg-[#1E293B] border border-slate-700/50 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        {(dateDebut || dateFin || search) && (
          <button onClick={() => { setSearch(''); setDateDebut(''); setDateFin(''); setPage(1) }}
            className="text-slate-500 hover:text-white text-sm px-3 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 transition-colors">✕ Réinitialiser</button>
        )}
      </div>

      {/* KPI rapide */}
      {factures.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 p-4">
            <p className="text-slate-400 text-xs mb-1">Factures affichées</p>
            <p className="text-2xl font-bold text-white">{factures.length}</p>
          </div>
          <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 p-4">
            <p className="text-slate-400 text-xs mb-1">Total affiché</p>
            <p className="text-2xl font-bold text-red-400">{formatCFA(totalAffiche)}</p>
          </div>
          <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 p-4">
            <p className="text-slate-400 text-xs mb-1">Moy. par facture</p>
            <p className="text-2xl font-bold text-white">{formatCFA(factures.length > 0 ? totalAffiche / factures.length : 0)}</p>
          </div>
        </div>
      )}

      {/* Liste */}
      <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 overflow-hidden">
        {loading ? (
          <p className="text-center py-20 text-slate-500 text-sm">Chargement...</p>
        ) : factures.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-slate-400 font-medium">Aucune facture</p>
            <p className="text-slate-500 text-sm mt-1">Créez une facture pour regrouper des sorties</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {factures.map(f => {
              const isExpanded = expanded === f.id
              return (
                <div key={f.id}>
                  {/* Ligne principale */}
                  <div className="px-5 py-4 flex items-center gap-4">
                    {/* Chevron */}
                    <button onClick={() => setExpanded(isExpanded ? null : f.id)}
                      className="text-slate-500 hover:text-white transition-colors flex-shrink-0">
                      <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    {/* Numéro + véhicule */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-purple-500/20 text-purple-300 text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold">{f.numero}</span>
                        <span className="text-white font-medium text-sm">{f.vehicule.immatriculation}</span>
                        <span className="text-slate-400 text-sm">{f.vehicule.marque} {f.vehicule.modele}</span>
                        {f.vehicule.personnelAssigne && (
                          <span className="text-slate-500 text-xs">· {f.vehicule.personnelAssigne.prenom} {f.vehicule.personnelAssigne.nom}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-slate-500 text-xs">{formatDate(f.date)}</span>
                        <span className="text-slate-600 text-xs">·</span>
                        <span className="text-slate-500 text-xs">{f.lignes.length} ligne{f.lignes.length > 1 ? 's' : ''}</span>
                        {f.notes && <span className="text-slate-500 text-xs italic truncate max-w-xs">· {f.notes}</span>}
                      </div>
                      {/* Badges types */}
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {Array.from(new Set(f.lignes.map(l => l.type))).map(type => (
                          <span key={type} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${TYPE_COLORS[type]}`}>{TYPE_LABELS[type]}</span>
                        ))}
                      </div>
                    </div>

                    {/* Total + actions */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-red-400 font-bold">{formatCFA(f.total)}</p>
                        <p className="text-slate-500 text-xs">{f.createdBy.name}</p>
                      </div>
                      {userRole === 'ADMIN' && (
                        <button onClick={() => handleDelete(f.id)} disabled={deletingId === f.id}
                          className="text-slate-600 hover:text-red-400 transition-colors disabled:opacity-40">
                          {deletingId === f.id ? (
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

                  {/* Détail des lignes (expandable) */}
                  {isExpanded && (
                    <div className="px-5 pb-4 ml-8">
                      <div className="bg-[#0F172A] rounded-xl border border-slate-800 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-800">
                              <th className="text-left px-4 py-2.5 text-slate-500 text-xs font-medium">Type</th>
                              <th className="text-left px-4 py-2.5 text-slate-500 text-xs font-medium">Description</th>
                              <th className="text-right px-4 py-2.5 text-slate-500 text-xs font-medium">Qté</th>
                              <th className="text-right px-4 py-2.5 text-slate-500 text-xs font-medium">Prix unit.</th>
                              <th className="text-right px-4 py-2.5 text-slate-500 text-xs font-medium">Montant</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {f.lignes.map(l => (
                              <tr key={l.id}>
                                <td className="px-4 py-2.5">
                                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${TYPE_COLORS[l.type]}`}>{TYPE_LABELS[l.type]}</span>
                                </td>
                                <td className="px-4 py-2.5 text-slate-300">{l.description}</td>
                                <td className="px-4 py-2.5 text-right text-slate-400">
                                  {l.quantite != null ? `${l.quantite}${l.type === 'CARBURANT' ? ' L' : ''}` : '—'}
                                </td>
                                <td className="px-4 py-2.5 text-right text-slate-400">
                                  {l.prixUnitaire != null ? formatCFA(l.prixUnitaire) : '—'}
                                </td>
                                <td className="px-4 py-2.5 text-right text-white font-medium">{formatCFA(l.montant)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-slate-700">
                              <td colSpan={4} className="px-4 py-2.5 text-right text-slate-400 text-xs font-medium">TOTAL</td>
                              <td className="px-4 py-2.5 text-right text-red-400 font-bold">{formatCFA(f.total)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-slate-800/60 flex items-center justify-between">
            <p className="text-slate-500 text-xs">Page {page} / {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-lg text-xs">← Préc.</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-lg text-xs">Suiv. →</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal création ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 w-full max-w-2xl shadow-2xl my-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
              <h3 className="text-white font-semibold">Nouvelle facture</h3>
              <button onClick={() => { setShowModal(false); resetForm() }} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm">{error}</div>}

              {/* Infos facture */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">N° de facture *</label>
                  <input type="text" value={formNumero} onChange={e => setFormNumero(e.target.value)} required autoFocus
                    placeholder="FAC-001, 2024-056..."
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono" />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Date <span className="text-slate-500">(aujourd&apos;hui par défaut)</span></label>
                  <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Véhicule *</label>
                <VehiculeSelect vehicules={vehicules} value={formVehicule} onChange={setFormVehicule} />
                <input type="hidden" value={formVehicule} required />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Notes <span className="text-slate-500">(optionnel)</span></label>
                <input type="text" value={formNotes} onChange={e => setFormNotes(e.target.value)}
                  placeholder="Référence, commentaire..."
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>

              {/* Lignes */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm text-slate-300 font-medium">Lignes de la facture *</label>
                  <button type="button" onClick={addLigne}
                    className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Ajouter une ligne
                  </button>
                </div>

                <div className="space-y-3">
                  {lignes.map((l, idx) => (
                    <div key={idx} className="bg-[#0F172A] rounded-xl p-4 border border-slate-800 relative">
                      {lignes.length > 1 && (
                        <button type="button" onClick={() => removeLigne(idx)}
                          className="absolute top-3 right-3 text-slate-600 hover:text-red-400 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Type */}
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Type</label>
                          <select value={l.type} onChange={e => updateLigne(idx, 'type', e.target.value)}
                            className="w-full bg-[#1E293B] border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                            <option value="CARBURANT">Carburant</option>
                            <option value="VIDANGE">Vidange</option>
                            <option value="AUTRE">Autre</option>
                          </select>
                        </div>
                        {/* Description */}
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Description *</label>
                          <input type="text" value={l.description} onChange={e => updateLigne(idx, 'description', e.target.value)} required
                            placeholder={l.type === 'CARBURANT' ? 'Plein essence' : l.type === 'VIDANGE' ? 'Vidange moteur' : 'Détail...'}
                            className="w-full bg-[#1E293B] border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                        </div>
                        {/* Quantité */}
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">
                            Quantité {l.type === 'CARBURANT' ? '(litres)' : '(optionnel)'}
                          </label>
                          <input type="number" step="0.01" min="0" value={l.quantite as unknown as string}
                            onChange={e => updateLigne(idx, 'quantite', e.target.value)}
                            placeholder="ex: 50"
                            className="w-full bg-[#1E293B] border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                        </div>
                        {/* Prix unitaire */}
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">
                            Prix unitaire {l.type === 'CARBURANT' ? '(FCFA/L)' : '(optionnel)'}
                          </label>
                          <input type="number" step="1" min="0" value={l.prixUnitaire as unknown as string}
                            onChange={e => updateLigne(idx, 'prixUnitaire', e.target.value)}
                            placeholder="ex: 650"
                            className="w-full bg-[#1E293B] border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                        </div>
                        {/* Montant */}
                        <div className="sm:col-span-2">
                          <label className="block text-xs text-slate-400 mb-1">Montant (FCFA) *</label>
                          <input type="number" step="1" min="1" value={l.montant as unknown as string}
                            onChange={e => updateLigne(idx, 'montant', e.target.value)} required
                            placeholder="Montant exact de cette ligne"
                            className="w-full bg-[#1E293B] border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono" />
                          {l.quantite && l.prixUnitaire && (
                            <p className="text-xs text-purple-400 mt-1">
                              Auto-calculé : {parseFloat(l.quantite as unknown as string) || 0} × {parseFloat(l.prixUnitaire as unknown as string) || 0} = {Math.round((parseFloat(l.quantite as unknown as string) || 0) * (parseFloat(l.prixUnitaire as unknown as string) || 0)).toLocaleString('fr-FR')} FCFA
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total calculé */}
              {totalFacture > 0 && (
                <div className="bg-purple-600/10 border border-purple-500/30 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-purple-400 text-sm font-medium">Total facture</p>
                    <p className="text-slate-400 text-xs mt-0.5">{lignes.length} ligne{lignes.length > 1 ? 's' : ''} · sera déduit de la carte essence</p>
                  </div>
                  <p className="text-purple-300 font-bold text-xl">{formatCFA(totalFacture)}</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowModal(false); resetForm() }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-sm font-medium">Annuler</button>
                <button type="submit" disabled={submitting || !formVehicule || totalFacture <= 0}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                  {submitting && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                  {submitting ? 'Enregistrement...' : `Créer la facture — ${formatCFA(totalFacture)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
