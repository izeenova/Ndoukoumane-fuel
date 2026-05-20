import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// GET — lister tous les utilisateurs (admin uniquement)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if ((session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, actif: true, modules: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('GET /api/admin/utilisateurs:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST — créer un utilisateur (admin uniquement)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if ((session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { name, email, password, role, modules } = await req.json()

    if (!name?.trim())     return NextResponse.json({ error: 'Le nom est obligatoire' }, { status: 400 })
    if (!email?.trim())    return NextResponse.json({ error: 'L\'email est obligatoire' }, { status: 400 })
    if (!password?.trim()) return NextResponse.json({ error: 'Le mot de passe est obligatoire' }, { status: 400 })
    if (password.length < 6) return NextResponse.json({ error: 'Le mot de passe doit faire au moins 6 caractères' }, { status: 400 })

    const hashed = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name:    name.trim(),
        email:   email.trim().toLowerCase(),
        password: hashed,
        role:    role || 'CARBURANT',
        modules: modules || [],
        actif:   true,
      },
      select: { id: true, name: true, email: true, role: true, actif: true, modules: true, createdAt: true },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 })
    }
    console.error('POST /api/admin/utilisateurs:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
