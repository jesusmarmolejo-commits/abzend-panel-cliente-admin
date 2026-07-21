'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import PageWithSidebar from '@/components/dashboard/PageWithSidebar'
import { Car, Plus, Trash2, RefreshCw, AlertCircle } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL

export default function VehiculosPage() {
  const [data, setData] = useState(null)      // { vehicles, active_count, vehicle_limit, subscription_status }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [placa, setPlaca] = useState('')
  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState(null)
  const [msg, setMsg] = useState(null)

  const authHeaders = async () => {
    const sb = createClient()
    const { data: { session } } = await sb.auth.getSession()
    return { 'Authorization': `Bearer ${session?.access_token}` }
  }

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const headers = await authHeaders()
      const res = await fetch(`${API}/vehicles`, { headers })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Error al cargar vehículos')
      setData(body)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const atLimit = data && data.active_count >= data.vehicle_limit

  const addVehicle = async (e) => {
    e.preventDefault()
    const p = placa.trim().toUpperCase()
    if (!p) return
    setAdding(true)
    setMsg(null)
    try {
      const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' }
      const res = await fetch(`${API}/vehicles`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ placa: p }),
      })
      const body = await res.json()
      if (!res.ok) {
        if (body.error === 'VEHICLE_LIMIT_REACHED') {
          throw new Error('Límite alcanzado, contacta a tu ejecutivo ABZEND.')
        }
        if (body.error === 'PLACA_ALREADY_ACTIVE') {
          throw new Error('Esa placa ya está activa en tu cuenta.')
        }
        if (body.error === 'SUBSCRIPTION_INACTIVE') {
          throw new Error('Tu suscripción no está activa. Contacta a tu ejecutivo ABZEND.')
        }
        throw new Error(body.error || 'No se pudo agregar el vehículo')
      }
      setPlaca('')
      setMsg({ type: 'ok', text: `Vehículo ${p} agregado` })
      await load()
    } catch (e) {
      setMsg({ type: 'err', text: e.message })
    } finally {
      setAdding(false)
    }
  }

  const removeVehicle = async (id, plc) => {
    if (!confirm(`¿Dar de baja la placa ${plc}? Liberará un cupo de tu tope.`)) return
    setRemovingId(id)
    setMsg(null)
    try {
      const headers = await authHeaders()
      const res = await fetch(`${API}/vehicles/${id}`, { method: 'DELETE', headers })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'No se pudo dar de baja')
      setMsg({ type: 'ok', text: `Vehículo ${plc} dado de baja` })
      await load()
    } catch (e) {
      setMsg({ type: 'err', text: e.message })
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <PageWithSidebar>
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Car className="w-6 h-6 text-indigo-600" /> Mis vehículos
          </h1>
          <button
            onClick={load}
            className="p-2 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100"
            aria-label="Recargar"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        <p className="text-gray-500 text-sm mb-6">
          Placas dadas de alta en tu suscripción. Cada vehículo tiene rutas ilimitadas al mes.
        </p>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        ) : (
          <>
            {/* Contador de uso */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
              <div className="flex items-end justify-between mb-2">
                <span className="text-sm text-gray-500">Vehículos usados</span>
                <span className="text-sm font-medium text-gray-900">
                  {data.active_count} de {data.vehicle_limit}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${atLimit ? 'bg-red-500' : 'bg-indigo-600'}`}
                  style={{ width: `${data.vehicle_limit > 0 ? Math.min(100, (data.active_count / data.vehicle_limit) * 100) : 0}%` }}
                />
              </div>
              {data.subscription_status && data.subscription_status !== 'active' && (
                <p className="text-xs text-orange-600 mt-2">
                  Suscripción {data.subscription_status}. Contacta a tu ejecutivo ABZEND.
                </p>
              )}
            </div>

            {/* Alta de placa */}
            <form onSubmit={addVehicle} className="flex gap-2 mb-3">
              <input
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                placeholder="Placa (ej. ABC-123-D)"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={atLimit || adding}
                maxLength={16}
              />
              <button
                type="submit"
                disabled={atLimit || adding || !placa.trim()}
                title={atLimit ? 'Límite alcanzado, contacta a tu ejecutivo ABZEND' : undefined}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" /> Agregar vehículo
              </button>
            </form>

            {atLimit && (
              <p className="text-xs text-gray-500 mb-4">
                Límite alcanzado, contacta a tu ejecutivo ABZEND para ampliar tu tope.
              </p>
            )}

            {msg && (
              <div className={`text-sm rounded-lg p-3 mb-4 ${msg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {msg.text}
              </div>
            )}

            {/* Lista de placas */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {data.vehicles.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  Aún no has agregado vehículos.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {data.vehicles.map((v) => (
                    <li key={v.id} className="flex items-center justify-between px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600">
                          <Car className="w-5 h-5" />
                        </span>
                        <span className="font-mono font-semibold text-gray-900">{v.placa}</span>
                      </div>
                      <button
                        onClick={() => removeVehicle(v.id, v.placa)}
                        disabled={removingId === v.id}
                        className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" /> Dar de baja
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </PageWithSidebar>
  )
}
