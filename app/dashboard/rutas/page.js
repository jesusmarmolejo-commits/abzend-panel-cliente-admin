'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import PageWithSidebar from '@/components/dashboard/PageWithSidebar'
import { Map, Plus, RefreshCw, AlertCircle, Wand2, Trash2, ChevronLeft, Play, CheckCircle, Users, X } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL

const ROUTE_STATUS_LABEL = { CREADA: 'Creada', EN_RUTA: 'En ruta', COMPLETADA: 'Completada', CANCELADA: 'Cancelada' }
const ROUTE_STATUS_COLOR = {
  CREADA: 'bg-gray-100 text-gray-700',
  EN_RUTA: 'bg-blue-100 text-blue-700',
  COMPLETADA: 'bg-green-100 text-green-700',
  CANCELADA: 'bg-red-100 text-red-700',
}

async function authHeaders() {
  const sb = createClient()
  const { data: { session } } = await sb.auth.getSession()
  return { Authorization: `Bearer ${session?.access_token}` }
}

// fetch con timeout para que una petición colgada (cold start de Render) no
// deje el skeleton de carga para siempre.
async function fetchWithTimeout(url, opts = {}, timeoutMs = 12000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

// CSV de ejemplo (mismo formato que Carga masiva) descargable desde el builder.
const SAMPLE_CSV = `sender_name,sender_phone,origin_street,origin_cp,origin_municipio,origin_estado,recipient_name,recipient_phone,dest_street,dest_cp,dest_municipio,dest_estado,package_type,weight_kg,service,instructions,references,has_insurance
ABZEND Almacen,5555550100,Av Central 100,09030,Iztapalapa,Ciudad de Mexico,Maria Garcia,5551110001,Av Paseo de la Reforma 222,06600,Cuauhtemoc,Ciudad de Mexico,paquete,2.5,standard,Entregar en recepcion,Torre corporativa,false
ABZEND Almacen,5555550100,Av Central 100,09030,Iztapalapa,Ciudad de Mexico,Juan Perez,5551110002,Av Insurgentes Sur 1602,03940,Benito Juarez,Ciudad de Mexico,paquete,1.2,express,Horario oficina,Planta baja,false
ABZEND Almacen,5555550100,Av Central 100,09030,Iztapalapa,Ciudad de Mexico,Luis Hernandez,5551110003,Calzada de Tlalpan 3000,04650,Coyoacan,Ciudad de Mexico,paquete,3.0,standard,Preguntar por almacen,Junto a farmacia,true
ABZEND Almacen,5555550100,Av Central 100,09030,Iztapalapa,Ciudad de Mexico,Ana Lopez,5551110004,Av Universidad 1000,04510,Coyoacan,Ciudad de Mexico,paquete,0.8,standard,Dejar con vigilancia,Edificio azul,false
ABZEND Almacen,5555550100,Av Central 100,09030,Iztapalapa,Ciudad de Mexico,Carlos Ruiz,5551110005,Blvd Manuel Avila Camacho 2000,53950,Naucalpan,Estado de Mexico,paquete,5.0,standard,Llamar antes de llegar,Zona industrial,false
`

function downloadSampleCSV() {
  const blob = new Blob(['﻿' + SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'guias_muestra_ruta.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function RutasBuilderPage() {
  const [routes, setRoutes] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [msg, setMsg] = useState(null)

  // Nueva ruta
  const [showNew, setShowNew] = useState(false)
  const [newVehicle, setNewVehicle] = useState('')
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [creating, setCreating] = useState(false)

  // Detalle de ruta abierta
  const [detail, setDetail] = useState(null)     // { route, stops, stops_total, stops_closed }
  const [guideCode, setGuideCode] = useState('')
  const [busy, setBusy] = useState(false)

  // Flota (conductores del cliente) para asignar a la ruta
  const [drivers, setDrivers] = useState([])
  const [assignDriverId, setAssignDriverId] = useState('')

  // Input para agregar guías a una parada (agrupar), por id de parada
  const [stopGuideInputs, setStopGuideInputs] = useState({})
  const setStopGuideInput = (stopId, val) => setStopGuideInputs((m) => ({ ...m, [stopId]: val }))

  const load = async (attempt = 0) => {
    if (attempt === 0) { setLoading(true); setError(null) }
    try {
      const headers = await authHeaders()
      const [rRes, vRes, dRes] = await Promise.all([
        fetchWithTimeout(`${API}/routes`, { headers }),
        fetchWithTimeout(`${API}/vehicles`, { headers }),
        fetchWithTimeout(`${API}/client/drivers`, { headers }),
      ])
      const rBody = await rRes.json(); const vBody = await vRes.json()
      if (!rRes.ok) throw new Error(rBody.error || 'Error al cargar rutas')
      if (!vRes.ok) throw new Error(vBody.error || 'Error al cargar vehículos')
      setRoutes(rBody.routes || [])
      setVehicles(vBody.vehicles || [])
      // Los conductores no son críticos para la lista de rutas: no rompas si fallan.
      try { const dBody = await dRes.json(); if (dRes.ok) setDrivers(dBody.drivers || []) } catch { /* noop */ }
      setLoading(false)
    } catch (e) {
      // Reintenta ante fallo/timeout transitorio (p. ej. cold start), sin apagar el skeleton.
      if (attempt < 2) { setTimeout(() => load(attempt + 1), 1200); return }
      setError(e.name === 'AbortError' ? 'El servidor tardó en responder. Toca Recargar.' : e.message)
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const createRoute = async () => {
    if (!newVehicle) { setMsg({ type: 'err', text: 'Selecciona un vehículo' }); return }
    setCreating(true); setMsg(null)
    try {
      const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' }
      const res = await fetch(`${API}/routes`, {
        method: 'POST', headers,
        body: JSON.stringify({ vehicle_id: newVehicle, date: newDate }),
      })
      const body = await res.json()
      if (!res.ok) {
        if (body.error === 'SUBSCRIPTION_INACTIVE') throw new Error('Tu suscripción no está activa.')
        throw new Error(body.error || 'No se pudo crear la ruta')
      }
      setShowNew(false); setNewVehicle('')
      setMsg({ type: 'ok', text: 'Ruta creada' })
      await load()
    } catch (e) { setMsg({ type: 'err', text: e.message }) } finally { setCreating(false) }
  }

  const openRoute = async (id) => {
    setBusy(true); setError(null)
    try {
      const headers = await authHeaders()
      const res = await fetch(`${API}/routes/${id}`, { headers })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Error al abrir la ruta')
      setDetail(body)
      setAssignDriverId(body.route?.driver_id || '')
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  const assignDriver = async () => {
    if (!detail) return
    setBusy(true); setMsg(null)
    try {
      const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' }
      const res = await fetch(`${API}/routes/${detail.route.id}/driver`, {
        method: 'PATCH', headers, body: JSON.stringify({ driver_id: assignDriverId || null }),
      })
      const body = await res.json()
      if (!res.ok) {
        const map = { REPARTIDOR_CON_RUTA_ACTIVA: 'Ese repartidor ya tiene otra ruta activa.' }
        throw new Error(map[body.error] || body.error || 'No se pudo asignar el repartidor')
      }
      setMsg({ type: 'ok', text: assignDriverId ? 'Repartidor asignado' : 'Repartidor desasignado' })
      await openRoute(detail.route.id); await load()
    } catch (e) { setMsg({ type: 'err', text: e.message }) } finally { setBusy(false) }
  }

  const addStop = async (e) => {
    e.preventDefault()
    const code = guideCode.trim()
    if (!code || !detail) return
    setBusy(true); setMsg(null)
    try {
      const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' }
      const res = await fetch(`${API}/routes/${detail.route.id}/items`, {
        method: 'POST', headers, body: JSON.stringify({ guide_code: code }),
      })
      const body = await res.json()
      if (!res.ok) {
        const map = { OWNERSHIP_MISMATCH: 'Esa guía es de otro cliente.', SUBSCRIPTION_INACTIVE: 'Tu suscripción no está activa.' }
        throw new Error(map[body.error] || body.error || 'No se pudo agregar la parada')
      }
      setGuideCode('')
      await openRoute(detail.route.id)
    } catch (e2) { setMsg({ type: 'err', text: e2.message }) } finally { setBusy(false) }
  }

  const removeStop = async (itemId) => {
    setBusy(true)
    try {
      const headers = await authHeaders()
      await fetch(`${API}/routes/${detail.route.id}/items/${itemId}`, { method: 'DELETE', headers })
      await openRoute(detail.route.id)
    } catch (e) { setMsg({ type: 'err', text: e.message }) } finally { setBusy(false) }
  }

  // Agrupar: agrega una guía a una parada existente (route_item_guides)
  const addGuideToStop = async (stopId) => {
    const code = (stopGuideInputs[stopId] || '').trim()
    if (!code) return
    setBusy(true); setMsg(null)
    try {
      const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' }
      const res = await fetch(`${API}/route-stops/${stopId}/guides`, {
        method: 'POST', headers, body: JSON.stringify({ guide_code: code }),
      })
      const body = await res.json()
      if (!res.ok) {
        const map = {
          OWNERSHIP_MISMATCH: 'Esa guía es de otro cliente.',
          GUIDE_ALREADY_IN_STOP: 'Esa guía ya está en esta parada.',
          GUIDE_ALREADY_ROUTED: 'Esa guía ya está en otra ruta activa.',
        }
        throw new Error(map[body.error] || body.error || 'No se pudo agregar la guía')
      }
      setStopGuideInput(stopId, '')
      await openRoute(detail.route.id)
    } catch (e) { setMsg({ type: 'err', text: e.message }) } finally { setBusy(false) }
  }

  const removeStopGuide = async (stopId, guideLinkId) => {
    setBusy(true); setMsg(null)
    try {
      const headers = await authHeaders()
      await fetch(`${API}/route-stops/${stopId}/guides/${guideLinkId}`, { method: 'DELETE', headers })
      await openRoute(detail.route.id)
    } catch (e) { setMsg({ type: 'err', text: e.message }) } finally { setBusy(false) }
  }

  const optimize = async () => {
    setBusy(true); setMsg(null)
    try {
      const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' }
      const res = await fetch(`${API}/routes/${detail.route.id}/optimize`, { method: 'POST', headers, body: '{}' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error === 'NO_GEOCODED_STOPS' ? 'Ninguna parada tiene coordenadas para optimizar.' : (body.error || 'No se pudo optimizar'))
      setMsg({ type: 'ok', text: `Optimizada: ${body.optimized} paradas, ${body.total_km} km` })
      await openRoute(detail.route.id)
    } catch (e) { setMsg({ type: 'err', text: e.message }) } finally { setBusy(false) }
  }

  const changeStatus = async (status) => {
    setBusy(true); setMsg(null)
    try {
      const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' }
      const res = await fetch(`${API}/routes/${detail.route.id}/status`, { method: 'PATCH', headers, body: JSON.stringify({ status }) })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'No se pudo cambiar el estado')
      await openRoute(detail.route.id); await load()
    } catch (e) { setMsg({ type: 'err', text: e.message }) } finally { setBusy(false) }
  }

  // ── Vista de detalle ──
  if (detail) {
    const r = detail.route
    return (
      <PageWithSidebar>
        <div className="max-w-2xl mx-auto p-6">
          <button onClick={() => { setDetail(null); setMsg(null) }} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4">
            <ChevronLeft className="w-4 h-4" /> Volver a rutas
          </button>

          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-gray-900 font-mono">{r.route_code}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROUTE_STATUS_COLOR[r.status] || 'bg-gray-100 text-gray-700'}`}>
              {ROUTE_STATUS_LABEL[r.status] || r.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            {r.date} · {detail.stops_closed}/{detail.stops_total} paradas cerradas
          </p>

          {/* Acciones de ruta */}
          <div className="flex gap-2 mb-4">
            <button onClick={optimize} disabled={busy || detail.stops_total === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300">
              <Wand2 className="w-4 h-4" /> Optimizar por cercanía
            </button>
            {r.status === 'CREADA' && (
              <button onClick={() => changeStatus('EN_RUTA')} disabled={busy}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                <Play className="w-4 h-4" /> Iniciar
              </button>
            )}
            {r.status === 'EN_RUTA' && (
              <button onClick={() => changeStatus('COMPLETADA')} disabled={busy}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50">
                <CheckCircle className="w-4 h-4" /> Completar
              </button>
            )}
          </div>

          {/* Asignar repartidor de la flota */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-semibold text-gray-900">Repartidor</span>
            </div>
            {drivers.length === 0 ? (
              <p className="text-xs text-gray-500">
                No tienes conductores en tu flota. Agrégalos en{' '}
                <Link href="/dashboard/conductores" className="text-indigo-600 hover:underline">Conductores</Link>.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <select value={assignDriverId} onChange={(e) => setAssignDriverId(e.target.value)}
                  className="min-w-[200px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Sin asignar</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {(d.name || d.email || d.id)}{d.license_plate ? ` · ${d.license_plate}` : ''}
                    </option>
                  ))}
                </select>
                <button onClick={assignDriver} disabled={busy || assignDriverId === (r.driver_id || '')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300">
                  {assignDriverId ? 'Asignar' : 'Quitar'}
                </button>
              </div>
            )}
          </div>

          {msg && (
            <div className={`text-sm rounded-lg p-3 mb-4 ${msg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {msg.text}
            </div>
          )}

          {/* Agregar parada por guía */}
          <form onSubmit={addStop} className="flex gap-2 mb-4">
            <input value={guideCode} onChange={(e) => setGuideCode(e.target.value)}
              placeholder="Número de guía / tracking"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <button type="submit" disabled={busy || !guideCode.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-gray-900 hover:bg-black disabled:bg-gray-300">
              <Plus className="w-4 h-4" /> Agregar parada
            </button>
          </form>

          {/* Lista de paradas ordenadas */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {detail.stops.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                Sin paradas. Agrega guías o carga un CSV de ubicaciones.
                <div className="mt-2">
                  <button onClick={downloadSampleCSV} className="text-indigo-600 hover:underline text-xs font-medium">
                    ⬇ Descargar CSV de ejemplo
                  </button>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {detail.stops.map((s, i) => (
                  <li key={s.id} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex-shrink-0">
                        {s.stop_order || i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-mono font-semibold text-gray-900 truncate">{s.tracking_code || s.order_id || s.transport_order_id}</div>
                        {(s.recipient || s.address) && (
                          <div className="text-xs text-gray-700 truncate">
                            {s.recipient ? `${s.recipient} · ` : ''}{s.address || ''}
                          </div>
                        )}
                        <div className="text-[11px] text-gray-400">
                          {s.item_type}{s.distance_km != null ? ` · ${s.distance_km} km` : ''}{s.lat == null ? ' · sin coords' : ''}
                          {s.bultos_total != null ? ` · ${s.bultos_total} bultos` : ''}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${s.stop_status === 'completada' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {s.stop_status}
                      </span>
                      <button onClick={() => removeStop(s.id)} disabled={busy} className="text-red-500 hover:text-red-700 disabled:opacity-50" aria-label="Quitar parada">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Guías agrupadas en la parada, con sus bultos */}
                    {s.guides && s.guides.length > 1 && (
                      <ul className="mt-2 ml-10 space-y-1">
                        {s.guides.map((g) => (
                          <li key={g.order_id} className="flex items-center gap-2 text-xs text-gray-600">
                            <span className="font-mono truncate">{g.tracking_code || g.order_id}</span>
                            {g.recipient && <span className="truncate text-gray-400">· {g.recipient}</span>}
                            <span className="ml-auto rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 whitespace-nowrap">{g.bultos_total} bultos</span>
                            {g.guide_link_id && (
                              <button onClick={() => removeStopGuide(s.id, g.guide_link_id)} disabled={busy} className="text-red-400 hover:text-red-600 disabled:opacity-50" aria-label="Quitar guía">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Agregar guía a esta parada (agrupar) */}
                    <div className="mt-2 ml-10 flex gap-2">
                      <input
                        value={stopGuideInputs[s.id] || ''}
                        onChange={(e) => setStopGuideInput(s.id, e.target.value)}
                        placeholder="Agregar guía a esta parada (tracking)"
                        className="flex-1 border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        onClick={() => addGuideToStop(s.id)}
                        disabled={busy || !(stopGuideInputs[s.id] || '').trim()}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-white bg-gray-900 hover:bg-black disabled:bg-gray-300"
                      >
                        <Plus className="w-3.5 h-3.5" /> Agregar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </PageWithSidebar>
    )
  }

  // ── Vista de lista ──
  return (
    <PageWithSidebar>
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Map className="w-6 h-6 text-indigo-600" /> Rutas
          </h1>
          <div className="flex gap-2">
            <button onClick={() => load()} className="p-2 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100" aria-label="Recargar">
              <RefreshCw className="w-5 h-5" />
            </button>
            <button onClick={() => setShowNew(!showNew)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4" /> Nueva ruta
            </button>
          </div>
        </div>
        <p className="text-gray-500 text-sm mb-6">Crea rutas, asigna un vehículo y optimiza el orden de paradas por cercanía.</p>

        {msg && !showNew && (
          <div className={`text-sm rounded-lg p-3 mb-4 ${msg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {msg.text}
          </div>
        )}

        {showNew && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
            <div className="text-sm font-semibold text-gray-700 mb-3">Nueva ruta</div>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Vehículo</label>
                <select value={newVehicle} onChange={(e) => setNewVehicle(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[180px]">
                  <option value="">Selecciona…</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.placa}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Fecha</label>
                <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <button onClick={createRoute} disabled={creating || !newVehicle}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300">
                {creating ? 'Creando…' : 'Crear ruta'}
              </button>
            </div>
            {vehicles.length === 0 && (
              <p className="text-xs text-orange-600 mt-2">No tienes vehículos activos. Da de alta placas en "Mis vehículos" primero.</p>
            )}
            {msg && (
              <div className={`text-sm rounded-lg p-2 mt-3 ${msg.type === 'ok' ? 'text-green-700' : 'text-red-700'}`}>{msg.text}</div>
            )}
          </div>
        )}

        {loading ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}</div>
        ) : error ? (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
            <AlertCircle className="w-5 h-5 flex-shrink-0" /><span className="text-sm">{error}</span>
          </div>
        ) : routes.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
            Aún no tienes rutas. Crea la primera con "Nueva ruta".
          </div>
        ) : (
          <ul className="space-y-2">
            {routes.map((r) => (
              <li key={r.id}>
                <button onClick={() => openRoute(r.id)}
                  className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition flex items-center justify-between">
                  <div>
                    <div className="font-mono font-semibold text-gray-900">{r.route_code}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {r.placa || 'sin vehículo'} · {r.date} · {r.stops_closed}/{r.stops_total} paradas
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROUTE_STATUS_COLOR[r.status] || 'bg-gray-100 text-gray-700'}`}>
                    {ROUTE_STATUS_LABEL[r.status] || r.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageWithSidebar>
  )
}
