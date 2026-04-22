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
    const searchVehicule = searchParams.get('searchVehicule') || ''
    const dateDebut = searchParams.get('dateDebut') || ''
    const dateFin = searchParams.get('dateFin') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {}
    if (vehiculeId) where.vehiculeId = vehiculeId

    if (searchVehicule) {
      where.vehicule = {
        OR: [
          { immatriculation: { contains: searchVehicule, mode: 'insensitive' } },
          { marque: { contains: searchVehicule, mode: 'insensitive' } },
          { modele: { contains: searchVehicule, mode: 'insensitive' } },
        ],
      }
    }

    if (dateDebut || dateFin) {
      where.date = {}
      if (dateDebut) where.date.gte = new Date(dateDebut)
      if (dateFin) where.date.lte = new Date(dateFin + 'T23:59:59')
    }

    const [vidanges, total] = await Promise.all([
      prisma.vidange.findMany({
        where,
        include: {
          vehicule: true,
          createdBy: { select: { name: true } },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.vidange.count({ where }),
    ])

    return NextResponse.json({ vidanges, total, page, pages: Math.ceil(total / limit) })
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
    const { vehiculeId, cout, date, notes } = body

    if (!vehiculeId || !cout) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    const vehicule = await prisma.vehicule.findUnique({ where: { id: vehiculeId } })
    if (!vehicule) return NextResponse.json({ error: 'Véhicule introuvable' }, { status: 404 })

    const vidange = await prisma.vidange.create({
      data: {
        vehiculeId,
        cout: parseFloat(cout),
        date: date ? new Date(date) : new Date(),
        notes: notes?.trim() || null,
        createdById: (session.user as { id: string }).id,
      },
      include: { vehicule: true, createdBy: { select: { name: true } } },
    })

    return NextResponse.json(vidange, { status: 201 })
  } catch (error) {
    console.error('POST /api/vidanges:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
