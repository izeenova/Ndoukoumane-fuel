import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const vehiculeId = searchParams.get('vehiculeId') || ''
    const personnelId = searchParams.get('personnelId') || ''
    const dateDebut = searchParams.get('dateDebut') || ''
    const dateFin = searchParams.get('dateFin') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {}
    if (vehiculeId) where.vehiculeId = vehiculeId
    if (personnelId) where.personnelId = personnelId
    if (dateDebut || dateFin) {
      where.date = {}
      if (dateDebut) where.date.gte = new Date(dateDebut)
      if (dateFin) where.date.lte = new Date(dateFin + 'T23:59:59')
    }

    const [sorties, total] = await Promise.all([
      prisma.sortieCarburant.findMany({
        where,
        include: {
          vehicule: true,
          personnel: true,
          createdBy: { select: { name: true } },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sortieCarburant.count({ where }),
    ])

    return NextResponse.json({ sorties, total, page, pages: Math.ceil(total / limit) })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const role = (session.user as { role: string }).role
    if (!['ADMIN', 'CARBURANT'].includes(role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await req.json()
    const { vehiculeId, personnelId, litres, prixLitre, date, notes } = body

    if (!vehiculeId || !personnelId || !litres || !prixLitre) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    const litresNum = parseFloat(litres)
    const prixLitreNum = parseFloat(prixLitre)
    const coutTotal = litresNum * prixLitreNum

    // Vérifier la disponibilité du réservoir
    const vehicule = await prisma.vehicule.findUnique({ where: { id: vehiculeId } })
    if (!vehicule) return NextResponse.json({ error: 'Véhicule introuvable' }, { status: 404 })

    const [sortie] = await prisma.$transaction([
      prisma.sortieCarburant.create({
        data: {
          vehiculeId,
          personnelId,
          litres: litresNum,
          prixLitre: prixLitreNum,
          coutTotal,
          date: date ? new Date(date) : new Date(),
          notes: notes?.trim() || null,
          createdById: (session.user as { id: string }).id,
        },
        include: { vehicule: true, personnel: true },
      }),
      // Déduire du niveau actuel
      prisma.vehicule.update({
        where: { id: vehiculeId },
        data: {
          niveauActuel: Math.max(0, vehicule.niveauActuel - litresNum),
        },
      }),
    ])

    return NextResponse.json(sortie, { status: 201 })
  } catch (error) {
    console.error('POST /api/carburant:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
