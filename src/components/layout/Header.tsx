'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn, getRoleUserLabel } from '@/lib/utils'

interface HeaderProps {
  user: {
    name: string
    email: string
    role: string
  }
  onMenuToggle: () => void
}

const pageTitles: Record<string, string> = {
  '/dashboard': 'Tableau de bord',
  '/vehicules': 'Gestion des Véhicules',
  '/personnel': 'Gestion du Personnel',
  '/carburant': 'Sorties Carburant',
  '/reparations': 'Réparations',
  '/alertes': 'Alertes Carburant',
}

export function Header({ user, onMenuToggle }: HeaderProps) {
  const pathname = usePathname()
  const currentTitle = Object.entries(pageTitles).find(([key]) =>
    pathname.startsWith(key)
  )?.[1] || 'Ndoukouman-Fuel'

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 h-16 bg-[#0F172A]/95 backdrop-blur border-b border-slate-800/80 flex items-center justify-between px-4 md:px-6 z-20">
      {/* Bouton menu mobile + Titre */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div>
          <h1 className="text-white font-semibold text-base">{currentTitle}</h1>
          <p className="text-slate-500 text-xs hidden sm:block">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Actions droite */}
      <div className="flex items-center gap-2">
        {/* Rôle badge */}
        <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-400 text-xs font-medium border border-blue-600/30">
          {getRoleUserLabel(user.role)}
        </span>

        {/* Avatar + déconnexion */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-800 group"
          title="Se déconnecter"
        >
          <div className="w-7 h-7 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-white">{initials}</span>
          </div>
          <span className="text-slate-400 text-sm hidden md:block group-hover:text-white">{user.name}</span>
        </button>
      </div>
    </header>
  )
}
