import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const prix = await prisma.parametre.findUnique({ where: { cle: 'PRIX_CARBURANT' } })
    return NextResponse.json({ prixCarburant: prix?.valeur || '650' })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if ((session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
    const { prixCarburant } = await req.json()
    if (!prixCarburant || isNaN(parseFloat(prixCarburant))) {
      return NextResponse.json({ error: 'Prix invalide' }, { status: 400 })
    }
    await prisma.parametre.upsert({
      where:  { cle: 'PRIX_CARBURANT' },
      update: { valeur: String(parseFloat(prixCarburant)) },
      create: { cle: 'PRIX_CARBURANT', valeur: String(parseFloat(prixCarburant)) },
    })
    return NextResponse.json({ prixCarburant })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
