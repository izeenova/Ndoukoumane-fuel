'use client'

import { useState, useEffect } from 'react'
import { formatLitres, getNiveauPourcentage, getNiveauBgColor, getNiveauColor } from '@/lib/utils'

interface VehiculeAlerte {
  id: string
  immatriculation: string
  marque: string
  modele: string
  type: string
  capaciteReservoir: number
  niveauActuel: number
  statut: string
  pourcentage: number
  enAlerte: boolean
  alerte: { id: string; seuil: number; actif: boolean } | null
}

export default function AlertesPage() {
  const [vehicules, setVehicules] = useState<VehiculeAlerte[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [seuilsEdites, setSeuilsEdites] = useState<Record<string, string>>({})

  const fetchAlertes = async () => {
    setLoading(true)
    const res = await fetch('/api/alertes')
    const data = await res.json()
    setVehicules(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { fetchAlertes() }, [])

  const enAlerteCount = vehicules.filter(v => v.enAlerte).length
  const alertesActives = vehicules.filter(v => v.alerte?.actif).length

  const handleSeuil = async (vehiculeId: string, actif: boolean) => {
    const seuil = seuilsEdites[vehiculeId] || '20'
    setSaving(vehiculeId)
    await fetch('/api/alertes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehiculeId, seuil: parseFloat(seuil), actif }),
    })
    await fetchAlertes()
    setSaving(null)
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h2 className="text-xl font-bold text-white">Alertes Carburant</h2>
        <p className="text-slate-400 text-sm">Configuration et suivi des niveaux de carburant</p>
      </div>

      {/* Stats alertes */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#1E293B] rounded-xl border border-red-500/20 p-4 text-center">
          <p className="text-4xl font-bold text-red-400">{enAlerteCount}</p>
          <p className="text-slate-400 text-xs mt-1">En alerte</p>
        </div>
        <div className="bg-[#1E293B] rounded-xl border border-blue-500/20 p-4 text-center">
          <p className="text-4xl font-bold text-blue-400">{alertesActives}</p>
          <p className="text-slate-400 text-xs mt-1">Alertes actives</p>
        </div>
        <div className="bg-[#1E293B] rounded-xl border border-green-500/20 p-4 text-center">
          <p className="text-4xl font-bold text-green-400">{vehicules.length - enAlerteCount}</p>
          <p className="text-slate-400 text-xs mt-1">Niveaux OK</p>
        </div>
      </div>

      {/* Véhicules en alerte */}
      {enAlerteCount > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-red-400 font-semibold text-sm">{enAlerteCount} véhicule{enAlerteCount > 1 ? 's' : ''} avec niveau bas</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {vehicules.filter(v => v.enAlerte).map(v => (
              <div key={v.id} className="bg-[#0F172A] rounded-xl p-3 border border-red-500/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white font-bold text-sm">{v.immatriculation}</p>
                  <span className="text-red-400 text-xs font-semibold">{v.pourcentage}%</span>
                </div>
                <p className="text-slate-400 text-xs mb-2">{v.marque} {v.modele}</p>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${v.pourcentage}%` }} />
                </div>
                <p className="text-slate-500 text-xs mt-1">{formatLitres(v.niveauActuel)} / {formatLitres(v.capaciteReservoir)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tableau de configuration */}
      <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700/50">
          <h3 className="text-white font-semibold text-sm">Configuration des alertes par véhicule</h3>
          <p className="text-slate-500 text-xs mt-0.5">Définissez le seuil d&apos;alerte (%) pour chaque véhicule</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider">Véhicule</th>
                <th className="text-left px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider hidden md:table-cell">Niveau actuel</th>
                <th className="text-left px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider">Seuil alerte (%)</th>
                <th className="text-center px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider">Statut</th>
                <th className="text-right px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-500 text-sm">Chargement...</td></tr>
              ) : vehicules.map(v => {
                const bgColor = getNiveauBgColor(v.pourcentage)
                const textColor = getNiveauColor(v.pourcentage)
                const currentSeuil = seuilsEdites[v.id] ?? (v.alerte?.seuil?.toString() || '20')

                return (
                  <tr key={v.id} className={`hover:bg-slate-800/30 transition-colors ${v.enAlerte ? 'bg-red-500/5' : ''}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {v.enAlerte && <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 animate-pulse" />}
                        <div>
                          <p className="text-white font-semibold text-sm">{v.immatriculation}</p>
                          <p className="text-slate-500 text-xs">{v.marque} {v.modele}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${bgColor}`} style={{ width: `${v.pourcentage}%` }} />
                        </div>
                        <span className={`text-sm font-semibold ${textColor}`}>{v.pourcentage}%</span>
                      </div>
                      <p className="text-slate-500 text-xs mt-1">{formatLitres(v.niveauActuel)} / {formatLitres(v.capaciteReservoir)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <input
                        type="number"
                        value={currentSeuil}
                        onChange={e => setSeuilsEdites(s => ({ ...s, [v.id]: e.target.value }))}
                        className="w-20 bg-[#0F172A] border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="5" max="80" step="5"
                      />
                      <span className="text-slate-500 text-xs ml-1">%</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {v.enAlerte ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium">⚠ Alerte</span>
                      ) : v.alerte?.actif ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium">✓ OK</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-700 text-slate-400 text-xs font-medium">Inactif</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleSeuil(v.id, true)}
                          disabled={saving === v.id}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-xs font-medium flex items-center gap-1"
                        >
                          {saving === v.id && <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                          Sauvegarder
                        </button>
                        {v.alerte?.actif && (
                          <button
                            onClick={() => handleSeuil(v.id, false)}
                            disabled={saving === v.id}
                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-60 text-slate-300 rounded-lg text-xs font-medium"
                          >
                            Désactiver
                          </button>
                        )}
                        {!v.alerte?.actif && (
                          <button
                            onClick={() => handleSeuil(v.id, true)}
                            disabled={saving === v.id}
                            className="px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg text-xs font-medium border border-green-600/30"
                          >
                            Activer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
