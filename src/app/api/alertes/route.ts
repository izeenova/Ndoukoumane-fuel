import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const vehiculesAvecAlerte = await prisma.vehicule.findMany({
      where: { statut: 'ACTIF' },
      include: { alerte: true },
      orderBy: { niveauActuel: 'asc' },
    })

    const alertes = vehiculesAvecAlerte.map(v => ({
      ...v,
      pourcentage: v.capaciteReservoir > 0
        ? Math.round((v.niveauActuel / v.capaciteReservoir) * 100)
        : 0,
      enAlerte: v.alerte?.actif && v.capaciteReservoir > 0
        ? (v.niveauActuel / v.capaciteReservoir) * 100 <= (v.alerte?.seuil || 20)
        : false,
    }))

    return NextResponse.json(alertes)
  } catch (error) {
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
    const { vehiculeId, seuil, actif } = body

    const alerte = await prisma.alerteCarburant.upsert({
      where: { vehiculeId },
      update: {
        seuil: parseFloat(seuil),
        actif: actif ?? true,
      },
      create: {
        vehiculeId,
        seuil: parseFloat(seuil),
        actif: actif ?? true,
      },
    })

    return NextResponse.json(alerte)
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
