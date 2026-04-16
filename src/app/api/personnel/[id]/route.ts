import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if ((session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await req.json()
    const { nom, prenom, role, telephone, matricule, actif } = body

    const personnel = await prisma.personnel.update({
      where: { id: params.id },
      data: {
        nom: nom?.trim(),
        prenom: prenom?.trim(),
        role,
        telephone: telephone?.trim() || null,
        matricule: matricule?.trim() || null,
        actif: actif ?? true,
      },
    })

    return NextResponse.json(personnel)
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Ce matricule existe déjà' }, { status: 409 })
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

    await prisma.personnel.update({
      where: { id: params.id },
      data: { actif: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
