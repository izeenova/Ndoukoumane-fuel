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
    const role = searchParams.get('role') || ''

    const personnel = await prisma.personnel.findMany({
      where: {
        AND: [
          search ? {
            OR: [
              { nom: { contains: search, mode: 'insensitive' } },
              { prenom: { contains: search, mode: 'insensitive' } },
              { matricule: { contains: search, mode: 'insensitive' } },
            ]
          } : {},
          role ? { role: role as 'CHAUFFEUR' | 'MECANO' | 'RESPONSABLE_SERVICE' } : {},
        ]
      },
      include: {
        vehiculeAssigne: { select: { immatriculation: true, marque: true, modele: true } }
      },
      orderBy: { nom: 'asc' },
    })

    return NextResponse.json(personnel)
  } catch (error) {
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
    const { nom, prenom, role, telephone, matricule } = body

    if (!nom || !prenom || !role) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    const personnel = await prisma.personnel.create({
      data: {
        nom: nom.trim(),
        prenom: prenom.trim(),
        role,
        telephone: telephone?.trim() || null,
        matricule: matricule?.trim() || null,
      },
    })

    return NextResponse.json(personnel, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Ce matricule existe déjà' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
