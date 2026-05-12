import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const page      = parseInt(searchParams.get('page') || '1')
    const limit     = parseInt(searchParams.get('limit') || '20')
    const vehiculeId = searchParams.get('vehiculeId') || ''
    const dateDebut  = searchParams.get('dateDebut')  || ''
    const dateFin    = searchParams.get('dateFin')    || ''
    const search     = searchParams.get('search')     || ''

    const where: any = {}
    if (vehiculeId) where.vehiculeId = vehiculeId
    if (dateDebut || dateFin) {
      where.date = {}
      if (dateDebut) where.date.gte = new Date(dateDebut)
      if (dateFin)   where.date.lte = new Date(dateFin + 'T23:59:59')
    }
    if (search) {
      where.OR = [
        { numero: { contains: search, mode: 'insensitive' } },
        { vehicule: { immatriculation: { contains: search, mode: 'insensitive' } } },
        { vehicule: { marque:          { contains: search, mode: 'insensitive' } } },
        { vehicule: { personnelAssigne: { nom:    { contains: search, mode: 'insensitive' } } } },
        { vehicule: { personnelAssigne: { prenom: { contains: search, mode: 'insensitive' } } } },
        { notes: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [factures, total] = await Promise.all([
      prisma.facture.findMany({
        where,
        include: {
          vehicule:  { select: { immatriculation: true, marque: true, modele: true, personnelAssigne: { select: { prenom: true, nom: true } } } },
          lignes:    true,
          createdBy: { select: { name: true } },
        },
        orderBy: { date: 'desc' },
        skip:  (page - 1) * limit,
        take:  limit,
      }),
      prisma.facture.count({ where }),
    ])

    return NextResponse.json({ factures, total, page, pages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('GET /api/factures:', error)
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

    const { numero, vehiculeId, date, notes, lignes, pieceJointe, pieceJointeNom, pieceJointeType } = await req.json()

    if (!numero?.trim())  return NextResponse.json({ error: 'Le numéro de facture est obligatoire' }, { status: 400 })
    if (!vehiculeId)      return NextResponse.json({ error: 'Le véhicule est obligatoire' }, { status: 400 })
    if (!lignes || lignes.length === 0) {
      return NextResponse.json({ error: 'Au moins une ligne est requise' }, { status: 400 })
    }

    // Valider les lignes
    for (const l of lignes) {
      if (!l.description?.trim()) return NextResponse.json({ error: 'Chaque ligne doit avoir une description' }, { status: 400 })
      if (!l.montant || parseFloat(l.montant) <= 0) return NextResponse.json({ error: 'Chaque ligne doit avoir un montant positif' }, { status: 400 })
    }

    const total = lignes.reduce((s: number, l: any) => s + parseFloat(l.montant), 0)

    const facture = await prisma.$transaction(async (tx) => {
      const f = await tx.facture.create({
        data: {
          numero:          numero.trim(),
          vehiculeId,
          date:            date ? new Date(date) : new Date(),
          notes:           notes?.trim() || null,
          total,
          pieceJointe:     pieceJointe     || null,
          pieceJointeNom:  pieceJointeNom  || null,
          pieceJointeType: pieceJointeType || null,
          createdById: (session.user as { id: string }).id,
          lignes: {
            create: lignes.map((l: any) => ({
              type:          l.type || 'AUTRE',
              typeCarburant: l.type === 'CARBURANT' && l.typeCarburant ? l.typeCarburant : null,
              description:   l.description.trim(),
              quantite:      l.quantite     ? parseFloat(l.quantite)     : null,
              prixUnitaire:  l.prixUnitaire ? parseFloat(l.prixUnitaire) : null,
              montant:       parseFloat(l.montant),
              notes:         l.notes?.trim() || null,
            })),
          },
        },
        include: {
          vehicule:  { select: { immatriculation: true, marque: true, modele: true } },
          lignes:    true,
          createdBy: { select: { name: true } },
        },
      })

      // Déduire le total de la facture du budget carte essence
      await tx.budgetCarburant.updateMany({
        data: { solde: { decrement: total } },
      })

      return f
    })

    return NextResponse.json(facture, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Ce numéro de facture existe déjà' }, { status: 409 })
    }
    console.error('POST /api/factures:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
