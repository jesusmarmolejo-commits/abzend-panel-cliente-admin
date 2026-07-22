'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import PageWithSidebar from '@/components/dashboard/PageWithSidebar'
import { Users, UserPlus, RefreshCw, AlertCircle, User } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL

const STATUS_LABEL = { online: 'En línea', offline: 'Desconectado', busy: 'Ocupado' }
const STATUS_COLOR = {
  online: 'bg-green-100 text-green-700',
  offline: 'bg-gray-100 text-gray-600',
  busy: 'bg-amber-100 text-amber-700',
}

const EMPTY_FORM = { email: '', full_name: '', phone: '', license_plate: '', password: '' }

export default function ConductoresPage() {
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState(null)

  const authHeaders = async () => {
    const sb = createClient()
    const { data: { session } } = await sb.auth.getSession()
    return { Authorization: `Bearer ${session?.access_token}` }
  }

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const headers = await authHeaders()
      const res = await fetch(`${API}/client/drivers`, { headers })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Error al cargar conductores')
      setDrivers(body.drivers || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const createDriver = async (e) => {
    e.preventDefault()
    if (!form.email.trim() || !form.full_name.trim() || !form.password) return
    setCreating(true)
    setMsg(null)
    try {
      const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' }
      const res = await fetch(`${API}/client/drivers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          full_name: form.full_name.trim(),
          phone: form.phone.trim() || null,
          license_plate: form.license_plate.trim() || null,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'No se pudo crear el repartidor')
      setForm(EMPTY_FORM)
      setMsg({ type: 'ok', text: `Repartidor ${body.driver?.name || form.full_name} creado y agregado a tu flota` })
      await load()
    } catch (e2) {
      setMsg({ type: 'err', text: e2.message })
    } finally {
      setCreating(false)
    }
  }

  return (
    <PageWithSidebar>
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" /> Conductores
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
          Repartidores de tu flota. Crea sus cuentas aquí y asígnalos a tus rutas.
        </p>

        {/* Crear repartidor */}
        <form onSubmit={createDriver} className="bg-white border border-gray-200 rounded-xl p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-semibold text-gray-900">Crear repartidor</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={form.full_name} onChange={setField('full_name')}
              placeholder="Nombre completo *"
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={creating}
            />
            <input
              type="email" value={form.email} onChange={setField('email')}
              placeholder="Correo *"
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={creating}
            />
            <input
              type="tel" value={form.phone} onChange={setField('phone')}
              placeholder="Teléfono"
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={creating}
            />
            <input
              value={form.license_plate} onChange={setField('license_plate')}
              placeholder="Placa (opcional)"
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={creating}
            />
            <input
              type="password" value={form.password} onChange={setField('password')}
              placeholder="Contraseña inicial *"
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:col-span-2"
              disabled={creating}
              autoComplete="new-password"
            />
          </div>
          <div className="flex justify-end mt-3">
            <button
              type="submit"
              disabled={creating || !form.email.trim() || !form.full_name.trim() || !form.password}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <UserPlus className="w-4 h-4" /> {creating ? 'Creando…' : 'Crear repartidor'}
            </button>
          </div>
        </form>

        {msg && (
          <div className={`text-sm rounded-lg p-3 mb-4 ${msg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {msg.text}
          </div>
        )}

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
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {drivers.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                Aún no tienes conductores en tu flota.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {drivers.map((d) => (
                  <li key={d.id} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex-shrink-0">
                        <User className="w-5 h-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{d.name || d.email || d.id}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {d.email || ''}{d.license_plate ? ` · ${d.license_plate}` : ''}
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[d.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABEL[d.status] || d.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </PageWithSidebar>
  )
}
