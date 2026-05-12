import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { put } from '@vercel/blob'

// POST — uploader une pièce jointe (photo ou PDF de facture physique)
// Body  : le fichier binaire en streaming
// Query : ?filename=nom_du_fichier.jpg
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const filename = searchParams.get('filename')
    if (!filename) return NextResponse.json({ error: 'Nom de fichier manquant' }, { status: 400 })

    // Vérifier le type de fichier
    const ext = filename.toLowerCase().split('.').pop() || ''
    const allowedExt = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'pdf']
    if (!allowedExt.includes(ext)) {
      return NextResponse.json({ error: 'Type de fichier non autorisé. Accepté : JPG, PNG, WEBP, HEIC, PDF' }, { status: 400 })
    }

    if (!req.body) return NextResponse.json({ error: 'Corps de la requête vide' }, { status: 400 })

    // Upload vers Vercel Blob
    const blob = await put(`factures/${Date.now()}-${filename}`, req.body, {
      access: 'public',
      contentType: req.headers.get('content-type') || 'application/octet-stream',
    })

    return NextResponse.json({
      url:  blob.url,
      nom:  filename,
      type: req.headers.get('content-type') || 'application/octet-stream',
    })
  } catch (error: any) {
    console.error('POST /api/upload:', error)
    // Si le token Blob n'est pas configuré
    if (error.message?.includes('BLOB_READ_WRITE_TOKEN') || error.message?.includes('token')) {
      return NextResponse.json({
        error: 'Stockage non configuré. Veuillez contacter l\'administrateur.',
        detail: 'BLOB_READ_WRITE_TOKEN manquant',
      }, { status: 503 })
    }
    return NextResponse.json({ error: 'Erreur lors de l\'upload' }, { status: 500 })
  }
}
