'use client'

// ─────────────────────────────────────────────────────────────
// RouteStopGuides — multi-guía por parada (route_item).
// Reusable dentro de un builder de ruta. Recibe `stopId` (= route_items.id)
// y gestiona la lista de guías asociadas a esa parada vía el backend:
//   GET    /route-stops/:stopId/guides
//   POST   /route-stops/:stopId/guides   { order_type, guide_code }
//   DELETE /route-stops/:stopId/guides/:guideLinkId
//
// NOTA DE INTEGRACIÓN: hoy no existe un builder de ruta en el panel donde
// montar este componente; queda listo para insertarse por parada cuando
// ese builder se construya.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, Trash2, Package } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL

const TYPE_LABEL = { paqueteria: 'Paquetería', ltl: 'LTL', ftl: 'FTL' }
const TYPE_COLOR = {
  paqueteria: 'bg-blue-100 text-blue-700',
  ltl: 'bg-purple-100 text-purple-700',
  ftl: 'bg-teal-100 text-teal-700',
}

export default function RouteStopGuides({ stopId }) {
  const [guides, setGuides] = useState([])
  const [loading, setLoading] = useState(true)
  const [guideCode, setGuideCode] = useState('')
  const [orderType, setOrderType] = useState('paqueteria')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const authHeaders = async () => {
    const sb = createClient()
    const { data: { session } } = await sb.auth.getSession()
    return { 'Authorization': `Bearer ${session?.access_token}` }
  }

  const load = async () => {
    setLoading(true)
    try {
      const headers = await authHeaders()
      const res = await fetch(`${API}/route-stops/${stopId}/guides`, { headers })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Error al cargar guías')
      setGuides(body.guides || [])
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (stopId) load() }, [stopId])

  const ERR_LABEL = {
    OWNERSHIP_MISMATCH: 'Esa guía pertenece a otro cliente.',
    GUIDE_ALREADY_IN_STOP: 'La guía ya está en esta parada.',
    GUIDE_ALREADY_ROUTED: 'La guía ya está asignada a otra ruta activa.',
    ORDER_TYPE_MISMATCH: 'El tipo de orden no coincide con la guía.',
    SUBSCRIPTION_INACTIVE: 'Tu suscripción no está activa. Contacta a tu ejecutivo ABZEND.',
  }

  const add = async (e) => {
    e.preventDefault()
    const code = guideCode.trim()
    if (!code) return
    setBusy(true)
    setErr(null)
    try {
      const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' }
      const res = await fetch(`${API}/route-stops/${stopId}/guides`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ order_type: orderType, guide_code: code }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(ERR_LABEL[body.error] || body.error || 'No se pudo agregar la guía')
      setGuideCode('')
      await load()
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (guideLinkId) => {
    setBusy(true)
    setErr(null)
    try {
      const headers = await authHeaders()
      const res = await fetch(`${API}/route-stops/${stopId}/guides/${guideLinkId}`, { method: 'DELETE', headers })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'No se pudo quitar la guía')
      await load()
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <form onSubmit={add} className="flex gap-2 mb-3">
        <select
          value={orderType}
          onChange={(e) => setOrderType(e.target.value)}
          className="border border-gray-300 rounded-lg px-2 py-2 text-sm"
        >
          <option value="paqueteria">Paquetería</option>
          <option value="ltl">LTL</option>
          <option value="ftl">FTL</option>
        </select>
        <input
          value={guideCode}
          onChange={(e) => setGuideCode(e.target.value)}
          placeholder="Número de guía"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={busy || !guideCode.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300"
        >
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </form>

      {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{err}</div>}

      {loading ? (
        <div className="text-sm text-gray-400 py-2">Cargando…</div>
      ) : guides.length === 0 ? (
        <div className="text-sm text-gray-400 py-2">Sin guías en esta parada.</div>
      ) : (
        <ul className="space-y-1.5">
          {guides.map((g) => (
            <li key={g.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="font-mono text-sm text-gray-900 truncate">{g.guide_code}</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${TYPE_COLOR[g.order_type] || 'bg-gray-100 text-gray-700'}`}>
                  {TYPE_LABEL[g.order_type] || g.order_type}
                </span>
                {g.pod_id && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-700">Entregada</span>
                )}
              </div>
              <button
                onClick={() => remove(g.id)}
                disabled={busy}
                className="text-red-500 hover:text-red-700 disabled:opacity-50"
                aria-label="Quitar guía"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
