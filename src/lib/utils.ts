import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─── Class names ──────────────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Formatage FCFA ───────────────────────────────────────────────────────────
export function formatCFA(amount: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(Math.round(amount))} FCFA`
}

// ─── Formatage litres ─────────────────────────────────────────────────────────
export function formatLitres(litres: number): string {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(litres)} L`
}

// ─── Formatage dates ─────────────────────────────────────────────────────────
export function formatDate(date: Date | string): string {
  return format(new Date(date), 'dd MMM yyyy', { locale: fr })
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), 'dd MMM yyyy à HH:mm', { locale: fr })
}

export function formatRelative(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr })
}

// ─── Niveau carburant ─────────────────────────────────────────────────────────
export function getNiveauPourcentage(niveauActuel: number, capaciteReservoir: number): number {
  if (capaciteReservoir === 0) return 0
  return Math.round((niveauActuel / capaciteReservoir) * 100)
}

export function getNiveauColor(pourcentage: number): string {
  if (pourcentage <= 20) return 'text-red-400'
  if (pourcentage <= 40) return 'text-orange-400'
  return 'text-green-400'
}

export function getNiveauBgColor(pourcentage: number): string {
  if (pourcentage <= 20) return 'bg-red-500'
  if (pourcentage <= 40) return 'bg-orange-500'
  return 'bg-green-500'
}

// ─── Labels ───────────────────────────────────────────────────────────────────
export function getRoleUserLabel(role: string): string {
  const labels: Record<string, string> = {
    ADMIN: 'Responsable Principal',
    CARBURANT: 'Gestionnaire Carburant',
    REPARATION: 'Gestionnaire Réparations',
  }
  return labels[role] || role
}

export function getRolePersonnelLabel(role: string): string {
  const labels: Record<string, string> = {
    CHAUFFEUR: 'Chauffeur',
    MECANO: 'Mécanicien',
    RESPONSABLE_SERVICE: 'Personnel',
  }
  return labels[role] || role
}

export function getTypeVehiculeLabel(type: string): string {
  const labels: Record<string, string> = {
    CAMION: 'Camion',
    VOITURE: 'Voiture',
  }
  return labels[type] || type
}

export function getStatutVehiculeLabel(statut: string): string {
  const labels: Record<string, string> = {
    ACTIF: 'Actif',
    EN_REPARATION: 'En réparation',
    HORS_SERVICE: 'Hors service',
  }
  return labels[statut] || statut
}

// ─── Permissions par rôle ─────────────────────────────────────────────────────
export function canAccessVehicules(role: string): boolean {
  return role === 'ADMIN'
}

export function canAccessPersonnel(role: string): boolean {
  return role === 'ADMIN'
}

export function canAccessCarburant(role: string): boolean {
  return ['ADMIN', 'CARBURANT'].includes(role)
}

export function canAccessReparations(role: string): boolean {
  return ['ADMIN', 'REPARATION'].includes(role)
}

export function canAccessAlertes(role: string): boolean {
  return role === 'ADMIN'
}
