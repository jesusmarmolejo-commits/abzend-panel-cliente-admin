'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Car, Map, Upload, CreditCard, ArrowRight, RefreshCw, AlertCircle, Package } from 'lucide-react'
import PageWithSidebar from '@/components/dashboard/PageWithSidebar'

const API = process.env.NEXT_PUBLIC_API_URL

const STATUS_LABEL = { active: 'Activa', past_due: 'Pago pendiente', suspended: 'Suspendida' }
const STATUS_COLOR = {
  active: 'bg-green-100 text-green-700',
  past_due: 'bg-orange-100 text-orange-700',
  suspended: 'bg-red-100 text-red-700',
}

export default function AdminHomePage() {
  const [sub, setSub] = useState(null)   // { active_count, vehicle_limit, subscription_status, billing_model }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const sb = createClient()
      const { data: { session } } = await sb.auth.getSession()
      const res = await fetch(`${API}/vehicles`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Error al cargar la suscripción')
      setSub(body)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const tiles = [
    { href: '/dashboard/guias', icon: Package, label: 'Guías', desc: 'Crea y rastrea tus envíos' },
    { href: '/dashboard/suscripcion', icon: CreditCard, label: 'Suscripción', desc: 'Tu plan y tope de vehículos' },
    { href: '/dashboard/vehiculos', icon: Car, label: 'Mis vehículos', desc: 'Alta y baja de placas' },
    { href: '/dashboard/rutas', icon: Map, label: 'Rutas', desc: 'Crea y optimiza rutas' },
    { href: '/dashboard/ubicaciones', icon: Upload, label: 'Ubicaciones', desc: 'Carga un CSV de paradas' },
  ]

  return (
    <PageWithSidebar>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-gray-900">Administración</h1>
          <button onClick={load} className="p-2 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100" aria-label="Recargar">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        <p className="text-gray-500 text-sm mb-6">Gestiona tu suscripción, flota y rutas.</p>

        {/* Resumen de suscripción */}
        {loading ? (
          <div className="h-28 rounded-xl bg-gray-100 animate-pulse mb-6" />
        ) : error ? (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">Suscripción</span>
              {sub.subscription_status && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[sub.subscription_status] || 'bg-gray-100 text-gray-700'}`}>
                  {STATUS_LABEL[sub.subscription_status] || sub.subscription_status}
                </span>
              )}
            </div>
            <div className="flex items-end justify-between mb-2">
              <span className="text-sm text-gray-600">Vehículos usados</span>
              <span className="text-sm font-semibold text-gray-900">{sub.active_count} de {sub.vehicle_limit}</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-indigo-600"
                style={{ width: `${sub.vehicle_limit > 0 ? Math.min(100, (sub.active_count / sub.vehicle_limit) * 100) : 0}%` }} />
            </div>
          </div>
        )}

        {/* Accesos rápidos */}
        <div className="grid sm:grid-cols-2 gap-4">
          {tiles.map((t) => (
            <Link key={t.href} href={t.href}
              className="group bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-sm transition">
              <div className="flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600">
                  <t.icon className="w-5 h-5" />
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">{t.label}</span>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500" />
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{t.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </PageWithSidebar>
  )
}
