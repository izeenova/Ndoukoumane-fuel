import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const vehicule = await prisma.vehicule.findUnique({
      where: { id: params.id },
      include: {
        alerte: true,
        sorties:     { orderBy: { date: 'desc' }, take: 10, include: { personnel: true } },
        reparations: { orderBy: { date: 'desc' }, take: 5 },
      },
    })

    if (!vehicule) return NextResponse.json({ error: 'Véhicule introuvable' }, { status: 404 })
    return NextResponse.json(vehicule)
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if ((session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await req.json()
    const { immatriculation, type, marque, modele, annee, capaciteReservoir,
            niveauActuel, statut, notes, periodeCarburation,
            personnelAssigneId, newPersonnel, removePersonnel } = body

    // Résoudre l'ID personnel final
    let finalPersonnelId: string | null | undefined = undefined

    if (removePersonnel) {
      finalPersonnelId = null
    } else if (newPersonnel?.prenom && newPersonnel?.nom) {
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
    } else if (personnelAssigneId !== undefined) {
      finalPersonnelId = personnelAssigneId || null
    }

    const updateData: any = {
      immatriculation:   immatriculation?.toUpperCase().trim(),
      type,
      marque:            marque?.trim(),
      modele:            modele?.trim(),
      annee:             annee ? parseInt(annee) : null,
      capaciteReservoir: parseFloat(capaciteReservoir),
      niveauActuel:      parseFloat(niveauActuel || 0),
      statut,
      notes:             notes?.trim() || null,
      periodeCarburation: periodeCarburation ? parseInt(periodeCarburation) : 30,
    }

    if (finalPersonnelId !== undefined) {
      updateData.personnelAssigneId = finalPersonnelId
    }

    const vehicule = await prisma.vehicule.update({
      where: { id: params.id },
      data:  updateData,
      include: {
        alerte: true,
        personnelAssigne: { select: { id: true, prenom: true, nom: true } },
      },
    })

    return NextResponse.json(vehicule)
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Cette immatriculation existe déjà' }, { status: 409 })
    }
    console.error('PUT /api/vehicules/[id]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if ((session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    await prisma.vehicule.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
