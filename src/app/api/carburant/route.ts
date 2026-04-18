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
    const searchVehicule = searchParams.get('searchVehicule') || ''
    const searchPersonnel = searchParams.get('searchPersonnel') || ''
    const dateDebut = searchParams.get('dateDebut') || ''
    const dateFin = searchParams.get('dateFin') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {}
    if (vehiculeId) where.vehiculeId = vehiculeId
    if (personnelId) where.personnelId = personnelId

    // Recherche par plaque ou marque/modèle du véhicule
    if (searchVehicule) {
      where.vehicule = {
        OR: [
          { immatriculation: { contains: searchVehicule, mode: 'insensitive' } },
          { marque: { contains: searchVehicule, mode: 'insensitive' } },
          { modele: { contains: searchVehicule, mode: 'insensitive' } },
        ]
      }
    }

    // Recherche par nom ou prénom du chauffeur
    if (searchPersonnel) {
      where.personnel = {
        OR: [
          { nom: { contains: searchPersonnel, mode: 'insensitive' } },
          { prenom: { contains: searchPersonnel, mode: 'insensitive' } },
        ]
      }
    }

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
    const { vehiculeId, litres, prixLitre, date, notes, forcer } = body

    if (!vehiculeId || !litres || !prixLitre) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    // Charger le véhicule avec le dernier plein et l'employé assigné
    const vehicule = await prisma.vehicule.findUnique({
      where: { id: vehiculeId },
      include: {
        sorties: { take: 1, orderBy: { date: 'desc' }, select: { date: true } },
      },
    })
    if (!vehicule) return NextResponse.json({ error: 'Véhicule introuvable' }, { status: 404 })

    // Vérification de la période de carburation
    if (!forcer && vehicule.sorties.length > 0) {
      const lastDate = new Date(vehicule.sorties[0].date)
      const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysSince < vehicule.periodeCarburation) {
        const joursRestants = vehicule.periodeCarburation - daysSince
        return NextResponse.json({
          error: `Ce véhicule a été ravitaillé il y a ${daysSince} jour(s). Prochain plein dans ${joursRestants} jour(s).`,
          locked: true,
          daysSince,
          joursRestants,
          periodeCarburation: vehicule.periodeCarburation,
        }, { status: 409 })
      }
    }

    // Utiliser l'employé assigné au véhicule
    const personnelId = vehicule.personnelAssigneId
    if (!personnelId) {
      return NextResponse.json({ error: 'Aucun employé assigné à ce véhicule' }, { status: 400 })
    }

    const litresNum = parseFloat(litres)
    const prixLitreNum = parseFloat(prixLitre)
    const coutTotal = litresNum * prixLitreNum

    // Transaction : créer sortie + maj véhicule + déduire du budget
    const sortie = await prisma.$transaction(async (tx) => {
      const s = await tx.sortieCarburant.create({
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
      })

      await tx.vehicule.update({
        where: { id: vehiculeId },
        data: { niveauActuel: Math.max(0, vehicule.niveauActuel - litresNum) },
      })

      // Déduire du budget carburant
      await tx.budgetCarburant.updateMany({
        data: { solde: { decrement: coutTotal } },
      })

      return s
    })

    return NextResponse.json(sortie, { status: 201 })
  } catch (error) {
    console.error('POST /api/carburant:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
