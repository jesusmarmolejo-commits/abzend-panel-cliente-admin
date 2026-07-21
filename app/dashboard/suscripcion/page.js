'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import PageWithSidebar from '@/components/dashboard/PageWithSidebar'
import { CreditCard, RefreshCw, AlertCircle, Car } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL

const STATUS_LABEL = { active: 'Activa', past_due: 'Pago pendiente', suspended: 'Suspendida' }
const STATUS_COLOR = {
  active: 'bg-green-100 text-green-700',
  past_due: 'bg-orange-100 text-orange-700',
  suspended: 'bg-red-100 text-red-700',
}
const MODEL_LABEL = { subscription: 'Suscripción', contract: 'Contrato' }

export default function SuscripcionPage() {
  const [data, setData] = useState(null)   // { vehicles, active_count, vehicle_limit, subscription_status, billing_model }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const sb = createClient()
      const { data: { session } } = await sb.auth.getSession()
      const res = await fetch(`${API}/vehicles`, { headers: { Authorization: `Bearer ${session?.access_token}` } })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Error al cargar la suscripción')
      setData(body)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const atLimit = data && data.active_count >= data.vehicle_limit

  return (
    <PageWithSidebar>
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-indigo-600" /> Suscripción
          </h1>
          <button onClick={load} className="p-2 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100" aria-label="Recargar">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        <p className="text-gray-500 text-sm mb-6">Tu plan y tope de vehículos. El tope lo ajusta tu ejecutivo ABZEND.</p>

        {loading ? (
          <div className="h-40 rounded-xl bg-gray-100 animate-pulse" />
        ) : error ? (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        ) : (
          <>
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Modelo</div>
                  <div className="text-sm font-semibold text-gray-900">{MODEL_LABEL[data.billing_model] || data.billing_model}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Estado</div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[data.subscription_status] || 'bg-gray-100 text-gray-700'}`}>
                    {STATUS_LABEL[data.subscription_status] || data.subscription_status}
                  </span>
                </div>
              </div>
              <div className="flex items-end justify-between mb-2">
                <span className="text-sm text-gray-600">Vehículos usados</span>
                <span className="text-sm font-semibold text-gray-900">{data.active_count} de {data.vehicle_limit}</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${atLimit ? 'bg-red-500' : 'bg-indigo-600'}`}
                  style={{ width: `${data.vehicle_limit > 0 ? Math.min(100, (data.active_count / data.vehicle_limit) * 100) : 0}%` }} />
              </div>
              {atLimit && (
                <p className="text-xs text-gray-500 mt-2">Tope alcanzado. Para ampliarlo, contacta a tu ejecutivo ABZEND.</p>
              )}
              {data.subscription_status && data.subscription_status !== 'active' && (
                <p className="text-xs text-orange-600 mt-2">Tu suscripción no está activa. Contacta a tu ejecutivo ABZEND.</p>
              )}
            </div>

            {/* Placas activas */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700">
                Placas activas ({data.vehicles.length})
              </div>
              {data.vehicles.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">Aún no hay vehículos.</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {data.vehicles.map((v) => (
                    <li key={v.id} className="flex items-center gap-3 px-5 py-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600">
                        <Car className="w-4 h-4" />
                      </span>
                      <span className="font-mono font-semibold text-gray-900">{v.placa}</span>
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
