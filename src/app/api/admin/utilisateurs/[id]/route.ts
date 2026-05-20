import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// PATCH — modifier un utilisateur
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if ((session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { name, role, actif, modules, password } = await req.json()

    const data: any = {}
    if (name    !== undefined) data.name    = name.trim()
    if (role    !== undefined) data.role    = role
    if (actif   !== undefined) data.actif   = actif
    if (modules !== undefined) data.modules = modules
    if (password) {
      if (password.length < 6) return NextResponse.json({ error: 'Mot de passe trop court (min 6 caractères)' }, { status: 400 })
      data.password = await bcrypt.hash(password, 10)
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, name: true, email: true, role: true, actif: true, modules: true, createdAt: true },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('PATCH /api/admin/utilisateurs/[id]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE — désactiver un utilisateur (soft delete)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const currentUser = session.user as { id: string; role: string }
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
    if (currentUser.id === params.id) {
      return NextResponse.json({ error: 'Vous ne pouvez pas supprimer votre propre compte' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: params.id },
      data: { actif: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/admin/utilisateurs/[id]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
