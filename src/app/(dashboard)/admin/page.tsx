'use client'

import { useState, useEffect } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'CARBURANT' | 'REPARATION'
  actif: boolean
  modules: string[]
  createdAt: string
}

const ALL_MODULES = [
  { key: 'vehicules',   label: 'Véhicules',      icon: '🚗' },
  { key: 'personnel',   label: 'Personnel',       icon: '👥' },
  { key: 'reparations', label: 'Réparations',     icon: '🔧' },
  { key: 'factures',    label: 'Factures',        icon: '📄' },
  { key: 'stats',       label: 'Statistiques',    icon: '📊' },
  { key: 'alertes',     label: 'Alertes',         icon: '🔔' },
  { key: 'carte',       label: 'Carte Essence',   icon: '💳' },
]

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur',
  CARBURANT: 'Gestionnaire Carburant',
  REPARATION: 'Gestionnaire Réparations',
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN:      'bg-purple-500/20 text-purple-300',
  CARBURANT:  'bg-blue-500/20 text-blue-300',
  REPARATION: 'bg-amber-500/20 text-amber-300',
}

const DEFAULT_MODULES: Record<string, string[]> = {
  CARBURANT:  ['vehicules', 'personnel', 'factures', 'alertes'],
  REPARATION: ['vehicules', 'personnel', 'reparations', 'alertes'],
}

function emptyForm() {
  return { name: '', email: '', password: '', role: 'CARBURANT' as User['role'], modules: [] as string[] }
}

export default function AdminPage() {
  const [users, setUsers]         = useState<User[]>([])
  const [loading, setLoading]     = useState(true)
  const [editUser, setEditUser]   = useState<User | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm]           = useState(emptyForm())
  const [editForm, setEditForm]   = useState<Partial<User & { password: string }>>({})
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')

  const fetchUsers = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/utilisateurs')
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const flash = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  // Créer un utilisateur
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')
    const res = await fetch('/api/admin/utilisateurs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Erreur'); setSaving(false); return }
    setShowCreate(false); setForm(emptyForm()); fetchUsers()
    flash('Utilisateur créé avec succès')
    setSaving(false)
  }

  // Ouvrir modal édition
  const openEdit = (u: User) => {
    setEditUser(u)
    setEditForm({
      name: u.name, role: u.role, actif: u.actif,
      modules: u.modules.length > 0 ? u.modules : (DEFAULT_MODULES[u.role] || []),
      password: '',
    })
    setError('')
  }

  // Sauvegarder édition
  const handleSave = async () => {
    if (!editUser) return
    setSaving(true); setError('')
    const body: any = {
      name: editForm.name, role: editForm.role,
      actif: editForm.actif, modules: editForm.modules,
    }
    if (editForm.password) body.password = editForm.password
    const res = await fetch(`/api/admin/utilisateurs/${editUser.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Erreur'); setSaving(false); return }
    setEditUser(null); fetchUsers()
    flash('Modifications enregistrées')
    setSaving(false)
  }

  // Supprimer (désactiver)
  const handleDelete = async (u: User) => {
    if (!confirm(`Désactiver le compte de ${u.name} ? L'utilisateur ne pourra plus se connecter.`)) return
    const res = await fetch(`/api/admin/utilisateurs/${u.id}`, { method: 'DELETE' })
    if (res.ok) { fetchUsers(); flash('Compte désactivé') }
  }

  // Réactiver
  const handleReactivate = async (u: User) => {
    const res = await fetch(`/api/admin/utilisateurs/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actif: true }),
    })
    if (res.ok) { fetchUsers(); flash('Compte réactivé') }
  }

  const toggleModule = (modules: string[], key: string): string[] =>
    modules.includes(key) ? modules.filter(m => m !== key) : [...modules, key]

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Gestion des utilisateurs</h2>
          <p className="text-slate-400 text-sm">Créer, modifier et gérer les accès de chaque utilisateur</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setForm(emptyForm()); setError('') }}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Nouvel utilisateur
        </button>
      </div>

      {/* Flash success */}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl p-3 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {success}
        </div>
      )}

      {/* Liste */}
      <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 overflow-hidden">
        {loading ? (
          <p className="text-center py-16 text-slate-500 text-sm">Chargement...</p>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {users.map(u => (
              <div key={u.id} className={`px-5 py-4 flex items-center gap-4 ${!u.actif ? 'opacity-50' : ''}`}>
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${u.actif ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                  {u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-medium text-sm">{u.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                    {!u.actif && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">Désactivé</span>}
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5">{u.email}</p>
                  {u.role !== 'ADMIN' && (
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      {(() => {
                        const mods = u.modules.length > 0 ? u.modules : (DEFAULT_MODULES[u.role] || [])
                        return mods.map(m => {
                          const mod = ALL_MODULES.find(am => am.key === m)
                          if (!mod) return null
                          return (
                            <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">
                              {mod.icon} {mod.label}
                            </span>
                          )
                        })
                      })()}
                    </div>
                  )}
                  {u.role === 'ADMIN' && (
                    <p className="text-slate-500 text-xs mt-0.5 italic">Accès complet à tous les modules</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => openEdit(u)}
                    className="text-slate-400 hover:text-blue-400 transition-colors p-1.5 rounded-lg hover:bg-blue-500/10"
                    title="Modifier">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  {u.actif ? (
                    <button onClick={() => handleDelete(u)}
                      className="text-slate-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
                      title="Désactiver">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </button>
                  ) : (
                    <button onClick={() => handleReactivate(u)}
                      className="text-slate-500 hover:text-green-400 transition-colors p-1.5 rounded-lg hover:bg-green-500/10"
                      title="Réactiver">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal Créer utilisateur ── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
              <h3 className="text-white font-semibold">Nouvel utilisateur</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm">{error}</div>}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-slate-300 mb-1.5">Nom complet *</label>
                  <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required
                    placeholder="Ex: Amadou Diallo"
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-slate-300 mb-1.5">Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required
                    placeholder="email@exemple.com"
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-slate-300 mb-1.5">Mot de passe *</label>
                  <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required
                    placeholder="Minimum 6 caractères"
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-slate-300 mb-1.5">Rôle *</label>
                  <div className="flex gap-2">
                    {(['ADMIN', 'CARBURANT', 'REPARATION'] as const).map(r => (
                      <button key={r} type="button"
                        onClick={() => setForm({...form, role: r, modules: r === 'ADMIN' ? [] : (DEFAULT_MODULES[r] || [])})}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                          form.role === r ? ROLE_COLORS[r] + ' border-current' : 'bg-transparent border-slate-700 text-slate-500 hover:border-slate-500'
                        }`}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {form.role !== 'ADMIN' && (
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Modules accessibles</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_MODULES.map(m => (
                      <label key={m.key} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                        form.modules.includes(m.key)
                          ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                          : 'bg-[#0F172A] border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}>
                        <input type="checkbox" checked={form.modules.includes(m.key)}
                          onChange={() => setForm({...form, modules: toggleModule(form.modules, m.key)})}
                          className="hidden" />
                        <span className="text-sm">{m.icon}</span>
                        <span className="text-xs font-medium">{m.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-sm font-medium">Annuler</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                  {saving && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                  Créer l&apos;utilisateur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Éditer utilisateur ── */}
      {editUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 w-full max-w-lg shadow-2xl my-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
              <div>
                <h3 className="text-white font-semibold">Modifier — {editUser.name}</h3>
                <p className="text-slate-400 text-xs mt-0.5">{editUser.email}</p>
              </div>
              <button onClick={() => setEditUser(null)} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm">{error}</div>}

              {/* Nom */}
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Nom complet</label>
                <input type="text" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Rôle */}
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Rôle</label>
                <div className="flex gap-2">
                  {(['ADMIN', 'CARBURANT', 'REPARATION'] as const).map(r => (
                    <button key={r} type="button"
                      onClick={() => setEditForm({...editForm, role: r, modules: r === 'ADMIN' ? [] : (editUser.modules.length > 0 ? editUser.modules : (DEFAULT_MODULES[r] || []))})}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                        editForm.role === r ? ROLE_COLORS[r] + ' border-current' : 'bg-transparent border-slate-700 text-slate-500 hover:border-slate-500'
                      }`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modules */}
              {editForm.role !== 'ADMIN' && (
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Modules accessibles</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_MODULES.map(m => {
                      const checked = (editForm.modules || []).includes(m.key)
                      return (
                        <label key={m.key} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                          checked ? 'bg-blue-600/20 border-blue-500/50 text-blue-300' : 'bg-[#0F172A] border-slate-700 text-slate-400 hover:border-slate-500'
                        }`}>
                          <input type="checkbox" checked={checked}
                            onChange={() => setEditForm({...editForm, modules: toggleModule(editForm.modules || [], m.key)})}
                            className="hidden" />
                          <span className="text-sm">{m.icon}</span>
                          <span className="text-xs font-medium">{m.label}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Statut */}
              <div className="flex items-center justify-between bg-[#0F172A] rounded-xl px-4 py-3 border border-slate-700">
                <div>
                  <p className="text-white text-sm font-medium">Compte actif</p>
                  <p className="text-slate-400 text-xs mt-0.5">L&apos;utilisateur peut se connecter</p>
                </div>
                <button type="button"
                  onClick={() => setEditForm({...editForm, actif: !editForm.actif})}
                  className={`relative w-11 h-6 rounded-full transition-colors ${editForm.actif ? 'bg-blue-600' : 'bg-slate-600'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${editForm.actif ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Nouveau mot de passe */}
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Nouveau mot de passe <span className="text-slate-500">(laisser vide = inchangé)</span></label>
                <input type="password" value={editForm.password || ''} onChange={e => setEditForm({...editForm, password: e.target.value})}
                  placeholder="••••••••"
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditUser(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-sm font-medium">Annuler</button>
                <button type="button" onClick={handleSave} disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                  {saving && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
