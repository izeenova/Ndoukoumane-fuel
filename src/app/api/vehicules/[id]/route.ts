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
        sorties: { orderBy: { date: 'desc' }, take: 10, include: { personnel: true } },
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
    const { immatriculation, type, marque, modele, annee, capaciteReservoir, niveauActuel, statut, notes } = body

    const vehicule = await prisma.vehicule.update({
      where: { id: params.id },
      data: {
        immatriculation: immatriculation?.toUpperCase().trim(),
        type,
        marque: marque?.trim(),
        modele: modele?.trim(),
        annee: annee ? parseInt(annee) : null,
        capaciteReservoir: parseFloat(capaciteReservoir),
        niveauActuel: parseFloat(niveauActuel || 0),
        statut,
        notes: notes?.trim() || null,
      },
      include: { alerte: true },
    })

    return NextResponse.json(vehicule)
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Cette immatriculation existe déjà' }, { status: 409 })
    }
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
