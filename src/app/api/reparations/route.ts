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
    const dateDebut = searchParams.get('dateDebut') || ''
    const dateFin = searchParams.get('dateFin') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {}
    if (vehiculeId) where.vehiculeId = vehiculeId
    if (dateDebut || dateFin) {
      where.date = {}
      if (dateDebut) where.date.gte = new Date(dateDebut)
      if (dateFin) where.date.lte = new Date(dateFin + 'T23:59:59')
    }

    const [reparations, total] = await Promise.all([
      prisma.reparation.findMany({
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
      prisma.reparation.count({ where }),
    ])

    return NextResponse.json({ reparations, total, page, pages: Math.ceil(total / limit) })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const role = (session.user as { role: string }).role
    if (!['ADMIN', 'REPARATION'].includes(role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await req.json()
    const { vehiculeId, personnelId, description, cout, date, pieces, notes } = body

    if (!vehiculeId || !description || !cout) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    const reparation = await prisma.reparation.create({
      data: {
        vehiculeId,
        personnelId: personnelId || null,
        description: description.trim(),
        cout: parseFloat(cout),
        date: date ? new Date(date) : new Date(),
        pieces: pieces?.trim() || null,
        notes: notes?.trim() || null,
        createdById: (session.user as { id: string }).id,
      },
      include: { vehicule: true, personnel: true },
    })

    // Mettre le statut du véhicule en réparation si ACTIF
    await prisma.vehicule.updateMany({
      where: { id: vehiculeId, statut: 'ACTIF' },
      data: { statut: 'EN_REPARATION' },
    })

    return NextResponse.json(reparation, { status: 201 })
  } catch (error) {
    console.error('POST /api/reparations:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
