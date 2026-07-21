'use client'

import { useState, useMemo } from 'react'

export default function InvoicingTab({ orders, clientData, supabase }) {
  const [filterStatus, setFilterStatus] = useState('todas')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const pendingOrders = useMemo(() => {
    if (!orders) return []
    return orders.filter(o => ['pending', 'assigned', 'picked_up', 'in_transit'].includes(o.status))
  }, [orders])

  const unpaidOrders = useMemo(() => {
    if (!orders) return []
    return orders.filter(o => o.payment_status === 'pending')
  }, [orders])

  const saldoActual = useMemo(() => {
    return unpaidOrders.reduce((acc, o) => acc + Number(o.total || 0), 0)
  }, [unpaidOrders])

  const creditoDisponible = useMemo(() => {
    const limite = Number(clientData?.limite_credito || 0)
    return limite - saldoActual
  }, [clientData, saldoActual])

  const facturasSimuladas = useMemo(() => {
    const facturas = []
    if (!orders) return facturas

    const paidOrders = orders.filter(o => o.payment_status === 'paid')
    paidOrders.forEach((order, index) => {
      const subtotal = Number(order.total || 0) / 1.20
      const retencion = subtotal * 0.04
      const iva = subtotal * 0.16
      facturas.push({
        folio: `FAC-${new Date(order.created_at).getFullYear()}-${String(index + 1).padStart(5, '0')}`,
        fecha_emision: order.delivered_at || order.created_at,
        periodo_inicio: order.created_at,
        periodo_fin: order.delivered_at || new Date().toISOString(),
        subtotal: subtotal.toFixed(2),
        retencion: retencion.toFixed(2),
        iva: iva.toFixed(2),
        total: order.total,
        estado: 'pagada',
        tracking: order.tracking_code
      })
    })
    return facturas
  }, [orders])

  const filteredFacturas = useMemo(() => {
    let filtered = facturasSimuladas
    if (filterStatus !== 'todas') {
      filtered = filtered.filter(f => f.estado === filterStatus)
    }
    if (dateFrom) {
      filtered = filtered.filter(f => new Date(f.fecha_emision) >= new Date(dateFrom))
    }
    if (dateTo) {
      filtered = filtered.filter(f => new Date(f.fecha_emision) <= new Date(dateTo))
    }
    return filtered
  }, [facturasSimuladas, filterStatus, dateFrom, dateTo])

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  }

  const formatMoney = (amount) => {
    const num = Number(amount || 0)
    return `$${num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const canGenerateInvoice = pendingOrders.length > 0 && clientData?.rfc && clientData?.metodo_pago && clientData?.forma_pago

  const handleGenerateInvoice = () => {
    if (!canGenerateInvoice) {
      alert('No se puede generar factura. Verifica que haya órdenes pendientes y que los datos del cliente estén completos.')
      return
    }
    alert(`Factura generada para ${pendingOrders.length} orden(es). Próximamente se enviará por correo.`)
  }

  const handleDownloadPDF = (folio) => {
    alert(`Descargando ${folio}...`)
  }

  return (
    <div className="space-y-8 p-4 max-w-6xl mx-auto">
      {/* Resumen de crédito */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4" style={{ borderLeftColor: '#4f46e5' }}>
          <p className="text-sm text-gray-500 mb-1">Cliente</p>
          <p className="text-lg font-semibold text-gray-900 truncate">{clientData?.razon_social || '—'}</p>
          <p className="text-xs text-gray-500 mt-1">RFC: {clientData?.rfc || '—'}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4" style={{ borderLeftColor: '#185FA5' }}>
          <p className="text-sm text-gray-500 mb-1">Límite de crédito</p>
          <p className="text-lg font-semibold text-gray-900">{formatMoney(clientData?.limite_credito || 0)}</p>
          <p className="text-xs text-gray-500 mt-1">Días de crédito: {clientData?.dias_credito || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4" style={{ borderLeftColor: creditoDisponible >= 0 ? '#4f46e5' : '#dc2626' }}>
          <p className="text-sm text-gray-500 mb-1">Crédito disponible</p>
          <p className="text-lg font-semibold" style={{ color: creditoDisponible >= 0 ? '#4f46e5' : '#dc2626' }}>
            {formatMoney(creditoDisponible)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Saldo actual: {formatMoney(saldoActual)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-lg shadow">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
        >
          <option value="todas">Todas las facturas</option>
          <option value="pagada">Pagadas</option>
          <option value="pendiente">Pendientes</option>
        </select>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 whitespace-nowrap">Desde:</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 whitespace-nowrap">Hasta:</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
          />
        </div>
      </div>

      {/* Tabla de facturas */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Historial de Facturas</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Folio</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Fecha emisión</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600 hidden sm:table-cell">Período</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600 hidden md:table-cell">Subtotal</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600 hidden md:table-cell">Retención</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600 hidden lg:table-cell">IVA</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Total</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600">Estado</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600 hidden sm:table-cell">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredFacturas.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                  No hay facturas generadas
                </td>
              </tr>
            ) : (
              filteredFacturas.map((factura, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-900">{factura.folio}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(factura.fecha_emision)}</td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell text-xs">
                    {formatDate(factura.periodo_inicio)} a {formatDate(factura.periodo_fin)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-right hidden md:table-cell">{formatMoney(factura.subtotal)}</td>
                  <td className="px-4 py-3 text-gray-600 text-right hidden md:table-cell">{formatMoney(factura.retencion)}</td>
                  <td className="px-4 py-3 text-gray-600 text-right hidden lg:table-cell">{formatMoney(factura.iva)}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 text-right">{formatMoney(factura.total)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      Pagada
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    <button
                      onClick={() => handleDownloadPDF(factura.folio)}
                      className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-100"
                      style={{ color: '#4f46e5' }}
                    >
                      Descargar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Órdenes sin facturar */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Órdenes pendientes por facturar</h3>
          <button
            onClick={handleGenerateInvoice}
            disabled={!canGenerateInvoice}
            className="px-4 py-2 rounded-md text-white text-sm font-medium transition-opacity"
            style={{
              backgroundColor: '#4f46e5',
              opacity: canGenerateInvoice ? 1 : 0.5,
              cursor: canGenerateInvoice ? 'pointer' : 'not-allowed'
            }}
          >
            Generar Factura
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Tracking</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Fecha</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Monto</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {pendingOrders.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  No hay órdenes pendientes por facturar
                </td>
              </tr>
            ) : (
              pendingOrders.map((order, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-900">{order.tracking_code || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(order.created_at)}</td>
                  <td className="px-4 py-3 text-gray-600 text-right">{formatMoney(order.total)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      {order.status || 'Pendiente'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
