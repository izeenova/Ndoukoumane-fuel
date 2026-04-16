'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-slate-400 text-sm">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    redirect('/login')
    return null
  }

  const user = {
    name: session.user.name || 'Utilisateur',
    email: session.user.email || '',
    role: (session.user as { role: string }).role || 'CARBURANT',
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E]">
      {/* Sidebar desktop */}
      <div className="hidden md:block">
        <Sidebar user={user} />
      </div>

      {/* Navigation mobile */}
      <MobileNav
        user={user}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Header */}
      <Header user={user} onMenuToggle={() => setMobileMenuOpen(true)} />

      {/* Contenu principal */}
      <main className="md:ml-64 pt-16 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
