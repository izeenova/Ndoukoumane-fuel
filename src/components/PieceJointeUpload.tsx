'use client'

import { useState, useRef, useCallback } from 'react'

export interface PieceJointeResult {
  url: string
  nom: string
  type: string
}

interface Props {
  value: PieceJointeResult | null
  onChange: (pj: PieceJointeResult | null) => void
  required?: boolean
}

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/heic,application/pdf'
const MAX_SIZE = 15 * 1024 * 1024 // 15 Mo

function isImage(type: string) {
  return type.startsWith('image/')
}

export function PieceJointeUpload({ value, onChange, required }: Props) {
  const [uploading, setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [dragOver, setDragOver]     = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = useCallback(async (file: File) => {
    setUploadError('')

    // Validation taille
    if (file.size > MAX_SIZE) {
      setUploadError(`Fichier trop lourd. Maximum 15 Mo (actuel : ${(file.size / 1024 / 1024).toFixed(1)} Mo)`)
      return
    }
    // Validation type
    const allowedTypes = ACCEPTED.split(',')
    if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.heic')) {
      setUploadError('Format non accepté. Veuillez utiliser JPG, PNG, WEBP, HEIC ou PDF.')
      return
    }

    setUploading(true)
    try {
      const res = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        body: file,
        headers: { 'content-type': file.type },
      })
      const data = await res.json()
      if (!res.ok) {
        setUploadError(data.error || 'Erreur lors de l\'upload')
      } else {
        onChange({ url: data.url, nom: data.nom, type: data.type })
      }
    } catch {
      setUploadError('Erreur réseau. Réessayez.')
    } finally {
      setUploading(false)
    }
  }, [onChange])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) upload(file)
    e.target.value = '' // reset pour pouvoir re-sélectionner le même fichier
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) upload(file)
  }

  const handleRemove = () => {
    onChange(null)
    setUploadError('')
  }

  // ── Vue : fichier uploadé ──
  if (value) {
    const isImg = isImage(value.type)
    return (
      <div className="relative bg-[#0F172A] rounded-xl border border-green-500/40 overflow-hidden">
        {isImg ? (
          <div className="relative">
            {/* Thumbnail */}
            <img
              src={value.url}
              alt={value.nom}
              className="w-full max-h-64 object-contain bg-slate-900"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>
        ) : (
          /* PDF */
          <div className="flex items-center gap-4 p-4">
            <div className="w-12 h-14 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0 border border-red-500/30">
              <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{value.nom}</p>
              <p className="text-slate-500 text-xs mt-0.5">PDF — Facture physique</p>
            </div>
          </div>
        )}

        {/* Barre d'actions */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-green-500/10 border-t border-green-500/20">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-green-400 text-xs font-medium">Pièce jointe prête</span>
            <span className="text-slate-500 text-xs truncate max-w-[160px]">{value.nom}</span>
          </div>
          <div className="flex gap-2">
            <a href={value.url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Voir</a>
            <button type="button" onClick={handleRemove}
              className="text-xs text-slate-500 hover:text-red-400 transition-colors">Changer</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Vue : zone de dépôt ──
  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-purple-500 bg-purple-500/10'
            : uploadError
            ? 'border-red-500/50 bg-red-500/5 hover:border-red-500/70'
            : 'border-slate-600 bg-[#0F172A] hover:border-purple-500/60 hover:bg-purple-500/5'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          onChange={handleFileChange}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <p className="text-purple-400 text-sm font-medium">Upload en cours...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${uploadError ? 'bg-red-500/20' : 'bg-slate-800'}`}>
              <svg className={`w-6 h-6 ${uploadError ? 'text-red-400' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div>
              <p className="text-slate-300 text-sm font-medium">
                Glisser la facture ici ou <span className="text-purple-400">cliquer pour sélectionner</span>
              </p>
              <p className="text-slate-500 text-xs mt-1">
                📷 Photo (JPG, PNG, HEIC) ou 📄 PDF · Max 15 Mo
              </p>
            </div>
            {required && (
              <span className="inline-flex items-center gap-1 bg-orange-500/10 text-orange-400 text-xs px-2.5 py-1 rounded-full border border-orange-500/20">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Obligatoire avant validation
              </span>
            )}
          </div>
        )}
      </div>
      {uploadError && (
        <p className="text-red-400 text-xs mt-2 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          {uploadError}
        </p>
      )}
    </div>
  )
}
