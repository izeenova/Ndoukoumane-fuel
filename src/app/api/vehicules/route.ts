import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const type   = searchParams.get('type')   || ''
    const statut = searchParams.get('statut') || ''

    const vehicules = await prisma.vehicule.findMany({
      where: {
        AND: [
          search ? { OR: [
            { immatriculation: { contains: search, mode: 'insensitive' } },
            { marque:          { contains: search, mode: 'insensitive' } },
            { modele:          { contains: search, mode: 'insensitive' } },
          ]} : {},
          type   ? { type:   type   as 'CAMION' | 'VOITURE' } : {},
          statut ? { statut: statut as 'ACTIF' | 'EN_REPARATION' | 'HORS_SERVICE' } : {},
        ],
      },
      include: {
        alerte: true,
        personnelAssigne: { select: { id: true, prenom: true, nom: true } },
        sorties: { take: 1, orderBy: { date: 'desc' }, select: { date: true } },
      },
      orderBy: { immatriculation: 'asc' },
    })

    return NextResponse.json(vehicules)
  } catch (error) {
    console.error('GET /api/vehicules:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if ((session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await req.json()
    const { immatriculation, type, marque, modele, annee, capaciteReservoir,
            niveauActuel, statut, notes, personnelAssigneId, newPersonnel, typeCarburant } = body

    if (!immatriculation || !type || !marque || !modele || !capaciteReservoir) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    let finalPersonnelId: string | null = personnelAssigneId || null

    if (newPersonnel?.prenom && newPersonnel?.nom) {
      const created = await prisma.personnel.create({
        data: {
          prenom:    newPersonnel.prenom.trim(),
          nom:       newPersonnel.nom.trim(),
          role:      newPersonnel.role || 'RESPONSABLE_SERVICE',
          telephone: newPersonnel.telephone?.trim() || null,
          actif:     true,
        },
      })
      finalPersonnelId = created.id
    }

    const vehicule = await prisma.vehicule.create({
      data: {
        immatriculation:    immatriculation.toUpperCase().trim(),
        type,
        marque:             marque.trim(),
        modele:             modele.trim(),
        annee:              annee ? parseInt(annee) : null,
        capaciteReservoir:  parseFloat(capaciteReservoir),
        niveauActuel:       parseFloat(niveauActuel || 0),
        statut:             statut || 'ACTIF',
        notes:              notes?.trim() || null,
        typeCarburant:      typeCarburant || 'ESSENCE',
        personnelAssigneId: finalPersonnelId,
        alerte: { create: { seuil: 20, actif: true } },
      },
      include: {
        alerte: true,
        personnelAssigne: { select: { id: true, prenom: true, nom: true } },
      },
    })

    return NextResponse.json(vehicule, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Cette immatriculation existe déjà' }, { status: 409 })
    }
    console.error('POST /api/vehicules:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
