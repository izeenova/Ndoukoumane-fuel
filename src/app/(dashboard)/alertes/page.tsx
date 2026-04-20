'use client'

import { useState, useEffect, useCallback } from 'react'

interface VehiculeRavitaillement {
  id: string
  immatriculation: string
  marque: string
  modele: string
  typeCarburant: string
  periodeCarburation: number
  sorties: { date: string }[]
  personnelAssigne: { prenom: string; nom: string } | null
}

function getVerrou(v: VehiculeRavitaillement) {
  if (!v.sorties || v.sorties.length === 0) {
    return { daysSince: 9999, joursRestants: -9999, overdue: true, jamaisRavitaille: true }
  }
  const daysSince = Math.floor((Date.now() - new Date(v.sorties[0].date).getTime()) / (1000 * 60 * 60 * 24))
  const joursRestants = v.periodeCarburation - daysSince
  return { daysSince, joursRestants, overdue: joursRestants <= 0, jamaisRavitaille: false }
}

export default function AlertesPage() {
  const [vehicules, setVehicules] = useState<VehiculeRavitaillement[]>([])
  const [loading, setLoading]     = useState(true)
  const [filtre, setFiltre]       = useState<'all' | 'urgent' | 'demain'>('all')

  const fetchVehicules = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/vehicules?statut=ACTIF')
    const data = await res.json()
    setVehicules(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchVehicules() }, [fetchVehicules])

  const avecVerrou = vehicules
    .map(v => ({ ...v, verrou: getVerrou(v) }))
    .filter(v => v.verrou.joursRestants <= 5)
    .sort((a, b) => a.verrou.joursRestants - b.verrou.joursRestants)

  const filtres = {
    all:    avecVerrou,
    urgent: avecVerrou.filter(v => v.verrou.joursRestants <= 0),
    demain: avecVerrou.filter(v => v.verrou.joursRestants === 1),
  }

  const liste = filtres[filtre]
  const nbUrgent = filtres.urgent.length
  const nbDemain = filtres.demain.length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Alertes</h2>
        <p className="text-slate-400 text-sm">Véhicules à ravitailler prochainement</p>
      </div>

      {/* Compteurs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#1E293B] rounded-xl border border-red-500/20 p-4 text-center">
          <p className="text-3xl font-bold text-red-400">{nbUrgent}</p>
          <p className="text-slate-400 text-xs mt-1">En retard</p>
        </div>
        <div className="bg-[#1E293B] rounded-xl border border-orange-500/20 p-4 text-center">
          <p className="text-3xl font-bold text-orange-400">{nbDemain}</p>
          <p className="text-slate-400 text-xs mt-1">Demain (J-1)</p>
        </div>
        <div className="bg-[#1E293B] rounded-xl border border-yellow-500/20 p-4 text-center">
          <p className="text-3xl font-bold text-yellow-400">{avecVerrou.length}</p>
          <p className="text-slate-400 text-xs mt-1">Dans 5 jours</p>
        </div>
      </div>

      {/* Banner urgence */}
      {nbUrgent > 0 && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-red-400 text-sm font-medium">
            {nbUrgent} véhicule{nbUrgent > 1 ? 's' : ''} en retard de ravitaillement — intervention requise
          </p>
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-2">
        {([['all','Tous'], ['urgent','En retard'], ['demain','Demain (J-1)']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setFiltre(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filtre === key ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 overflow-hidden">
        {loading ? (
          <p className="text-center py-12 text-slate-500 text-sm">Chargement...</p>
        ) : liste.length === 0 ? (
          <p className="text-center py-12 text-slate-500 text-sm">Aucun véhicule dans cette catégorie</p>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {liste.map(v => {
              const { joursRestants, overdue, jamaisRavitaille } = v.verrou
              return (
                <div key={v.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${overdue ? 'bg-red-500 animate-pulse' : joursRestants === 1 ? 'bg-orange-400' : 'bg-yellow-400'}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-semibold text-sm">{v.immatriculation}</p>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${v.typeCarburant === 'GASOIL' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                          {v.typeCarburant === 'GASOIL' ? 'Gasoil' : 'Essence'}
                        </span>
                      </div>
                      <p className="text-slate-500 text-xs truncate">
                        {v.marque} {v.modele}{v.personnelAssigne ? ` · ${v.personnelAssigne.prenom} ${v.personnelAssigne.nom}` : ''}{jamaisRavitaille ? ' · Jamais ravitaillé' : ''}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0 ${
                    overdue ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    joursRestants === 1 ? 'bg-orange-500/20 text-orange-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {overdue ? `Retard ${Math.abs(joursRestants)}j` : joursRestants === 1 ? 'Demain' : `J-${joursRestants}`}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
