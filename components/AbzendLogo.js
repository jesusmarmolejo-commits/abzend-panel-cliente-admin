'use client'
import Image from 'next/image'
import { useState } from 'react'

/**
 * AbzendLogo — muestra el logo desde public/logo.png
 * Si el archivo no existe, cae en el texto "ABZEND".
 *
 * PARA ACTUALIZAR EL LOGO:
 *   1. Copia tu JPG o PNG a:  abzend-panel-cliente/public/logo.png
 *   2. Reconstruye / redeploya — aparece automáticamente.
 *   Tamaño recomendado: 300 × 80 px, fondo transparente (PNG o WebP).
 */
export default function AbzendLogo({ height = 28, className = '', fallback = 'ABZEND' }) {
  const [error, setError] = useState(false)

  if (error) {
    return (
      <span className={`font-bold text-indigo-600 tracking-wide ${className}`}>
        {fallback}
      </span>
    )
  }

  return (
    <Image
      src="/logo.svg"
      alt="ABZEND"
      height={height}
      width={height * 4}
      style={{ height, width: 'auto', objectFit: 'contain' }}
      className={className}
      onError={() => setError(true)}
      unoptimized
      priority
    />
  )
}
