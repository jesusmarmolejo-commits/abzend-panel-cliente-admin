'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function NewOrderPage() {
  const router = useRouter()
  const supabase = createClient()
  const [currentStep, setCurrentStep] = useState(1)
  const [authLoading, setAuthLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    origin_address: '',
    origin_city: '',
    origin_state: '',
    origin_zip: '',
    dest_address: '',
    dest_city: '',
    dest_state: '',
    dest_zip: '',
    package_weight: '',
    package_length: '',
    package_width: '',
    package_height: '',
    package_contents: '',
    package_value: '',
    service_type: 'terrestre'
  })
  const [clientId, setClientId] = useState(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error: authError } = await supabase.auth.getSession()
        if (authError || !session) {
          router.push('/login')
          return
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', session.user.id)
          .single()

        if (userError || !userData) {
          router.push('/login')
          return
        }

        setClientId(userData.id)
      } catch (err) {
        router.push('/login')
      } finally {
        setAuthLoading(false)
      }
    }
    checkAuth()
  }, [router])

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateStep1 = () => {
    const { origin_address, origin_city, origin_state, origin_zip, dest_address, dest_city, dest_state, dest_zip } = formData
    if (!origin_address || !origin_city || !origin_state || !origin_zip || !dest_address || !dest_city || !dest_state || !dest_zip) {
      setError('Todos los campos de direcciones son requeridos')
      return false
    }
    return true
  }

  const validateStep2 = () => {
    const { package_weight, package_length, package_width, package_height, package_contents, package_value } = formData
    if (!package_weight || !package_length || !package_width || !package_height || !package_contents || !package_value) {
      setError('Todos los campos del paquete son requeridos')
      return false
    }
    if (isNaN(package_weight) || isNaN(package_length) || isNaN(package_width) || isNaN(package_height) || isNaN(package_value)) {
      setError('Los valores numéricos deben ser válidos')
      return false
    }
    if (Number(package_weight) <= 0 || Number(package_length) <= 0 || Number(package_width) <= 0 || Number(package_height) <= 0 || Number(package_value) <= 0) {
      setError('Los valores deben ser mayores a cero')
      return false
    }
    return true
  }

  const validateStep3 = () => {
    if (!formData.service_type) {
      setError('Debe seleccionar un tipo de servicio')
      return false
    }
    return true
  }

  const calculatePricing = () => {
    const baseRates = { terrestre: 50, express: 100, premium: 150 }
    const weight = Number(formData.package_weight)
    const baseRate = baseRates[formData.service_type]
    const weightSurcharge = weight > 5 ? (weight - 5) * 5 : 0
    const sameCityState = formData.origin_city === formData.dest_city && formData.origin_state === formData.dest_state
    const distanceSurcharge = sameCityState ? 5 : 10
    const subtotal = baseRate + weightSurcharge + distanceSurcharge
    const iva = subtotal * 0.16
    const total = subtotal + iva
    return { baseRate, weightSurcharge, distanceSurcharge, subtotal, iva, total }
  }

  const handleNext = () => {
    setError('')
    if (currentStep === 1 && !validateStep1()) return
    if (currentStep === 2 && !validateStep2()) return
    if (currentStep === 3 && !validateStep3()) return
    setCurrentStep(prev => Math.min(prev + 1, 4))
  }

  const handlePrev = () => {
    setError('')
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const pricing = calculatePricing()
      const { error: insertError } = await supabase
        .from('orders')
        .insert({
          client_id: clientId,
          origin_address: formData.origin_address,
          origin_city: formData.origin_city,
          origin_state: formData.origin_state,
          origin_zip: formData.origin_zip,
          dest_address: formData.dest_address,
          dest_city: formData.dest_city,
          dest_state: formData.dest_state,
          dest_zip: formData.dest_zip,
          package_weight: Number(formData.package_weight),
          package_length: Number(formData.package_length),
          package_width: Number(formData.package_width),
          package_height: Number(formData.package_height),
          package_contents: formData.package_contents,
          package_value: Number(formData.package_value),
          service_type: formData.service_type,
          subtotal: pricing.subtotal,
          total: pricing.total,
          status: 'pending'
        })
      if (insertError) throw insertError
      setShowSuccess(true)
      setTimeout(() => {
        router.push('/dashboard/paqueteria')
      }, 2000)
    } catch (err) {
      setError('Error al crear la orden: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-green-100 border border-green-400 text-green-700 px-8 py-6 rounded-lg shadow-lg">
          <div className="flex items-center space-x-3">
            <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xl font-semibold">Orden creada exitosamente</span>
          </div>
          <p className="mt-2 text-sm">Redirigiendo al dashboard...</p>
        </div>
      </div>
    )
  }

  const pricing = currentStep === 4 ? calculatePricing() : null

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <div className="flex justify-between items-center">
              {[1, 2, 3, 4].map(step => (
                <div key={step} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                    currentStep >= step ? 'bg-blue-600' : 'bg-gray-300'
                  }`}>
                    {step}
                  </div>
                  {step < 4 && (
                    <div className={`h-1 w-16 sm:w-32 ${
                      currentStep > step ? 'bg-blue-600' : 'bg-gray-300'
                    }`}></div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-600">
              <span>Origen/Destino</span>
              <span>Paquete</span>
              <span>Servicio</span>
              <span>Revisar</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Dirección de Origen</h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Dirección</label>
                  <input
                    type="text"
                    value={formData.origin_address}
                    onChange={(e) => updateFormData('origin_address', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-blue-500"
                    placeholder="Calle y número"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ciudad</label>
                  <input
                    type="text"
                    value={formData.origin_city}
                    onChange={(e) => updateFormData('origin_city', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-blue-500"
                    placeholder="Ciudad de origen"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Estado</label>
                  <input
                    type="text"
                    value={formData.origin_state}
                    onChange={(e) => updateFormData('origin_state', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-blue-500"
                    placeholder="Estado de origen"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Código Postal</label>
                  <input
                    type="text"
                    value={formData.origin_zip}
                    onChange={(e) => updateFormData('origin_zip', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-blue-500"
                    placeholder="Código postal"
                  />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mt-8">Dirección de Destino</h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Dirección</label>
                  <input
                    type="text"
                    value={formData.dest_address}
                    onChange={(e) => updateFormData('dest_address', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-blue-500"
                    placeholder="Calle y número"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ciudad</label>
                  <input
                    type="text"
                    value={formData.dest_city}
                    onChange={(e) => updateFormData('dest_city', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-blue-500"
                    placeholder="Ciudad de destino"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Estado</label>
                  <input
                    type="text"
                    value={formData.dest_state}
                    onChange={(e) => updateFormData('dest_state', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-blue-500"
                    placeholder="Estado de destino"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Código Postal</label>
                  <input
                    type="text"
                    value={formData.dest_zip}
                    onChange={(e) => updateFormData('dest_zip', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-blue-500"
                    placeholder="Código postal"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Detalles del Paquete</h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.package_weight}
                    onChange={(e) => updateFormData('package_weight', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Valor ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.package_value}
                    onChange={(e) => updateFormData('package_value', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Largo (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.package_length}
                    onChange={(e) => updateFormData('package_length', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ancho (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.package_width}
                    onChange={(e) => updateFormData('package_width', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Altura (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.package_height}
                    onChange={(e) => updateFormData('package_height', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Contenido</label>
                  <textarea
                    value={formData.package_contents}
                    onChange={(e) => updateFormData('package_contents', e.target.value)}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-blue-500"
                    placeholder="Describe el contenido del paquete"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Tipo de Servicio</h2>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { value: 'terrestre', label: 'Terrestre', desc: 'Envío estándar por tierra', price: '$50.00' },
                  { value: 'express', label: 'Express', desc: 'Envío prioritario', price: '$100.00' },
                  { value: 'premium', label: 'Premium', desc: 'Envío premium con seguimiento', price: '$150.00' }
                ].map(service => (
                  <div
                    key={service.value}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      formData.service_type === service.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => updateFormData('service_type', service.value)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{service.label}</h3>
                        <p className="text-sm text-gray-600">{service.desc}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">{service.price}</p>
                        <p className="text-xs text-gray-500">Base</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Revisar Orden</h2>
              
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Dirección de Origen</h3>
                  <p className="text-gray-700">{formData.origin_address}</p>
                  <p className="text-gray-700">{formData.origin_city}, {formData.origin_state} {formData.origin_zip}</p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Dirección de Destino</h3>
                  <p className="text-gray-700">{formData.dest_address}</p>
                  <p className="text-gray-700">{formData.dest_city}, {formData.dest_state} {formData.dest_zip}</p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Detalles del Paquete</h3>
                  <p className="text-gray-700">Peso: {formData.package_weight} kg</p>
                  <p className="text-gray-700">Dimensiones: {formData.package_length} x {formData.package_width} x {formData.package_height} cm</p>
                  <p className="text-gray-700">Contenido: {formData.package_contents}</p>
                  <p className="text-gray-700">Valor: ${formData.package_value}</p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Servicio Seleccionado</h3>
                  <p className="text-gray-700 capitalize">{formData.service_type}</p>
                </div>
                
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Resumen de Precios</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tarifa base</span>
                      <span className="text-gray-900">${pricing.baseRate.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Recargo por peso</span>
                      <span className="text-gray-900">${pricing.weightSurcharge.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Recargo por distancia</span>
                      <span className="text-gray-900">${pricing.distanceSurcharge.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="text-gray-900 font-semibold">${pricing.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">IVA (16%)</span>
                      <span className="text-gray-900">${pricing.iva.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-lg font-bold text-gray-900">Total</span>
                      <span className="text-lg font-bold text-blue-600">${pricing.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-between">
            {currentStep > 1 ? (
              <button
                onClick={handlePrev}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300 transition-colors"
              >
                Anterior
              </button>
            ) : (
              <div></div>
            )}
            
            {currentStep < 4 ? (
              <button
                onClick={handleNext}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Siguiente
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creando orden...' : 'Confirmar Orden'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}