'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import PageWithSidebar from '@/components/dashboard/PageWithSidebar'
import { Upload, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL

async function authHeaders() {
  const sb = createClient()
  const { data: { session } } = await sb.auth.getSession()
  return { Authorization: `Bearer ${session?.access_token}` }
}

// Parser CSV mínimo (una columna de guías o CSV con encabezado). Sin dependencias.
function parseGuides(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return []
  const first = lines[0].split(',').map((c) => c.trim().toLowerCase())
  const guideKeys = ['guia', 'guía', 'tracking', 'guide', 'guide_code', 'codigo', 'código', 'tracking_code']
  let colIdx = 0
  let startRow = 0
  const headerIdx = first.findIndex((c) => guideKeys.includes(c))
  if (headerIdx >= 0) { colIdx = headerIdx; startRow = 1 }   // hay encabezado
  const out = []
  for (let i = startRow; i < lines.length; i++) {
    const cells = lines[i].split(',')
    const val = (cells[colIdx] || cells[0] || '').trim().replace(/^"|"$/g, '')
    if (val) out.push(val)
  }
  return [...new Set(out)]   // dedup
}

export default function UbicacionesPage() {
  const [routes, setRoutes] = useState([])
  const [routeId, setRouteId] = useState('')
  const [guides, setGuides] = useState([])
  const [fileName, setFileName] = useState('')
  const [results, setResults] = useState(null)   // [{ code, ok, msg }]
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)

  const load = async () => {
    try {
      const headers = await authHeaders()
      const res = await fetch(`${API}/routes`, { headers })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Error al cargar rutas')
      // Solo rutas editables (no completadas/canceladas)
      setRoutes((body.routes || []).filter((r) => ['CREADA', 'EN_RUTA'].includes(r.status)))
    } catch (e) { setError(e.message) }
  }
  useEffect(() => { load() }, [])

  const onFile = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFileName(f.name); setResults(null)
    const text = await f.text()
    setGuides(parseGuides(text))
  }

  const run = async () => {
    if (!routeId) { setError('Selecciona una ruta destino'); return }
    if (guides.length === 0) { setError('El CSV no tiene guías'); return }
    setRunning(true); setError(null); setResults(null)
    const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' }
    const out = []
    for (const code of guides) {
      try {
        const res = await fetch(`${API}/routes/${routeId}/items`, {
          method: 'POST', headers, body: JSON.stringify({ guide_code: code }),
        })
        const body = await res.json()
        if (res.ok) out.push({ code, ok: true, msg: 'Agregada' })
        else {
          const map = { OWNERSHIP_MISMATCH: 'De otro cliente', SUBSCRIPTION_INACTIVE: 'Suscripción inactiva' }
          out.push({ code, ok: false, msg: map[body.error] || body.error || 'Error' })
        }
      } catch (e) { out.push({ code, ok: false, msg: e.message }) }
      setResults([...out])
    }
    setRunning(false)
  }

  const okCount = results?.filter((r) => r.ok).length || 0

  return (
    <PageWithSidebar>
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-1">
          <Upload className="w-6 h-6 text-indigo-600" /> Ubicaciones (CSV)
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          Carga masiva de paradas a una ruta desde un CSV. Cada fila = un número de guía/tracking de una orden existente.
        </p>

        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <AlertCircle className="w-5 h-5 flex-shrink-0" /><span className="text-sm">{error}</span>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 space-y-4">
          {/* Ruta destino */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ruta destino</label>
            <select value={routeId} onChange={(e) => setRouteId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Selecciona una ruta…</option>
              {routes.map((r) => <option key={r.id} value={r.id}>{r.route_code} · {r.placa || 'sin vehículo'} · {r.date}</option>)}
            </select>
            {routes.length === 0 && <p className="text-xs text-orange-600 mt-1">No hay rutas editables. Crea una en "Rutas" primero.</p>}
          </div>

          {/* Archivo */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Archivo CSV</label>
            <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-4 py-3 cursor-pointer hover:border-indigo-400">
              <FileText className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-600">{fileName || 'Selecciona un archivo .csv'}</span>
              <input type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
            </label>
            <p className="text-[11px] text-gray-400 mt-1">
              Formato: una columna con encabezado "guia" (o "tracking"), o una guía por línea.
            </p>
            {guides.length > 0 && (
              <p className="text-xs text-gray-600 mt-2">{guides.length} guía(s) detectada(s): <span className="font-mono">{guides.slice(0, 5).join(', ')}{guides.length > 5 ? '…' : ''}</span></p>
            )}
          </div>

          <button onClick={run} disabled={running || !routeId || guides.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300">
            <Upload className="w-4 h-4" /> {running ? 'Cargando…' : `Cargar ${guides.length || ''} paradas`}
          </button>
        </div>

        {/* Resultados */}
        {results && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700">
              Resultado: {okCount}/{results.length} agregadas
            </div>
            <ul className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {results.map((r, i) => (
                <li key={i} className="flex items-center gap-2 px-5 py-2 text-sm">
                  {r.ok ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                  <span className="font-mono text-gray-900">{r.code}</span>
                  <span className={`ml-auto text-xs ${r.ok ? 'text-green-600' : 'text-red-600'}`}>{r.msg}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </PageWithSidebar>
  )
}
