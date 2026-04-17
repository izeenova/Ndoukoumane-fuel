'use client'

export default function AlertesPage() {
  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h2 className="text-xl font-bold text-white">Alertes</h2>
        <p className="text-slate-400 text-sm">Suivi et traçabilité</p>
      </div>

      {/* Placeholder */}
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <p className="text-slate-400 font-medium text-sm">Fonctionnalité à venir</p>
        <p className="text-slate-600 text-xs mt-1">Cette section sera dédiée à la traçabilité des sorties</p>
      </div>
    </div>
  )
}
