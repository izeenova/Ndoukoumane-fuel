import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const [essence, gasoil] = await Promise.all([
      prisma.parametre.findUnique({ where: { cle: 'PRIX_CARBURANT' } }),
      prisma.parametre.findUnique({ where: { cle: 'PRIX_GASOIL' } }),
    ])
    return NextResponse.json({
      prixCarburant: essence?.valeur || '650',
      prixGasoil:    gasoil?.valeur  || '700',
    })
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
    const body = await req.json()
    const { prixCarburant, prixGasoil } = body

    if (prixCarburant !== undefined) {
      if (isNaN(parseFloat(prixCarburant))) return NextResponse.json({ error: 'Prix invalide' }, { status: 400 })
      await prisma.parametre.upsert({
        where: { cle: 'PRIX_CARBURANT' },
        update: { valeur: String(parseFloat(prixCarburant)) },
        create: { cle: 'PRIX_CARBURANT', valeur: String(parseFloat(prixCarburant)) },
      })
    }
    if (prixGasoil !== undefined) {
      if (isNaN(parseFloat(prixGasoil))) return NextResponse.json({ error: 'Prix invalide' }, { status: 400 })
      await prisma.parametre.upsert({
        where: { cle: 'PRIX_GASOIL' },
        update: { valeur: String(parseFloat(prixGasoil)) },
        create: { cle: 'PRIX_GASOIL', valeur: String(parseFloat(prixGasoil)) },
      })
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
