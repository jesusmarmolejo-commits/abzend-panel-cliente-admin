'use client';

import { useState, useMemo, useRef, useEffect } from 'react';

export default function ReportsTab({ orders, transportOrders }) {
  const [activeTab, setActiveTab] = useState('paqueteria');
  const canvasRef = useRef(null);

  const paqueteriaMetrics = useMemo(() => {
    if (!orders) return { total: 0, active: 0, delivered: 0, cancelled: 0, subtotal: 0, tax: 0, total: 0 };
    const total = orders.length;
    const active = orders.filter(o => ['pending', 'assigned', 'picked_up', 'in_transit'].includes(o.status)).length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const cancelled = orders.filter(o => o.status === 'cancelled').length;
    const subtotal = orders.reduce((acc, o) => acc + (o.subtotal || 0), 0);
    const tax = orders.reduce((acc, o) => acc + (o.tax || 0), 0);
    const totalSum = orders.reduce((acc, o) => acc + (o.total || 0), 0);
    return { total, active, delivered, cancelled, subtotal, tax, total: totalSum };
  }, [orders]);

  const transporteMetrics = useMemo(() => {
    if (!transportOrders) return { total: 0, active: 0, delivered: 0, cancelled: 0, subtotal: 0, tax: 0, total: 0 };
    const total = transportOrders.length;
    const active = transportOrders.filter(o => ['pending', 'confirmed', 'in_transit'].includes(o.status)).length;
    const delivered = transportOrders.filter(o => o.status === 'delivered').length;
    const cancelled = transportOrders.filter(o => o.status === 'cancelled').length;
    const subtotal = transportOrders.reduce((acc, o) => acc + (o.subtotal || 0), 0);
    const tax = transportOrders.reduce((acc, o) => acc + (o.iva || 0), 0);
    const totalSum = transportOrders.reduce((acc, o) => acc + (o.total || 0), 0);
    return { total, active, delivered, cancelled, subtotal, tax, total: totalSum };
  }, [transportOrders]);

  const currentOrders = activeTab === 'paqueteria' ? orders : transportOrders;
  const currentMetrics = activeTab === 'paqueteria' ? paqueteriaMetrics : transporteMetrics;

  const last10 = useMemo(() => {
    if (!currentOrders) return [];
    return [...currentOrders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);
  }, [currentOrders]);

  const chartData = useMemo(() => {
    if (!currentOrders) return [];
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = currentOrders.filter(o => {
        const created = o.created_at ? o.created_at.split('T')[0] : '';
        return created === dateStr;
      }).length;
      days.push({ date: dateStr, count });
    }
    return days;
  }, [currentOrders]);

  useEffect(() => {
    if (!canvasRef.current || chartData.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    const maxCount = Math.max(...chartData.map(d => d.count), 1);
    const barWidth = (width - padding * 2) / chartData.length - 4;

    ctx.clearRect(0, 0, width, height);

    chartData.forEach((d, i) => {
      const x = padding + i * ((width - padding * 2) / chartData.length);
      const barHeight = (d.count / maxCount) * (height - padding * 2);
      const y = height - padding - barHeight;

      ctx.fillStyle = '#4f46e5';
      ctx.fillRect(x, y, barWidth, barHeight);

      ctx.fillStyle = '#333';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.count, x + barWidth / 2, y - 4);

      const dateParts = d.date.split('-');
      const shortDate = `${dateParts[2]}/${dateParts[1]}`;
      ctx.fillText(shortDate, x + barWidth / 2, height - 8);
    });
  }, [chartData]);

  const exportCSV = () => {
    if (!currentOrders || currentOrders.length === 0) return;
    const headers = activeTab === 'paqueteria'
      ? ['Tracking', 'Fecha', 'Origen', 'Destino', 'Status', 'Total']
      : ['Tracking', 'Fecha', 'Ruta', 'Estado', 'Total'];

    const rows = currentOrders.map(o => {
      if (activeTab === 'paqueteria') {
        return [
          o.tracking_code || '',
          formatDate(o.created_at),
          o.origin_address || '',
          o.dest_address || '',
          statusLabel(o.status),
          o.total || 0
        ];
      } else {
        return [
          o.tracking_code || '',
          formatDate(o.created_at),
          o.ruta || '',
          statusLabel(o.status),
          o.total || 0
        ];
      }
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);
  };

  const statusColor = (status) => {
    const colors = {
      pending: '#FAEEDA',
      assigned: '#eef2ff',
      picked_up: '#eef2ff',
      in_transit: '#E6F1FB',
      delivered: '#EAF3DE',
      cancelled: '#FCEBEB',
      confirmed: '#eef2ff'
    };
    return colors[status] || '#f5f5f5';
  };

  const statusTextColor = (status) => {
    const colors = {
      pending: '#854F0B',
      assigned: '#4f46e5',
      picked_up: '#4f46e5',
      in_transit: '#185FA5',
      delivered: '#3B6D11',
      cancelled: '#A32D2D',
      confirmed: '#4f46e5'
    };
    return colors[status] || '#666';
  };

  const statusLabel = (status) => {
    const labels = {
      pending: 'Pendiente',
      assigned: 'Asignado',
      picked_up: 'Recogido',
      in_transit: 'En tránsito',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
      confirmed: 'Confirmado'
    };
    return labels[status] || status;
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('paqueteria')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'paqueteria'
                ? 'bg-[#4f46e5] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📦 Paquetería
          </button>
          <button
            onClick={() => setActiveTab('transporte')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'transporte'
                ? 'bg-[#4f46e5] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🚚 Transporte
          </button>
        </div>
        <button
          onClick={exportCSV}
          className="px-4 py-2 bg-[#185FA5] text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          📊 Exportar CSV
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
        <div className="bg-white rounded-lg shadow p-3 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium">Total</p>
          <p className="text-xl font-bold text-[#4f46e5]">{currentMetrics.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-3 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium">Activas</p>
          <p className="text-xl font-bold text-[#185FA5]">{currentMetrics.active}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-3 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium">Entregadas</p>
          <p className="text-xl font-bold text-green-700">{currentMetrics.delivered}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-3 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium">Canceladas</p>
          <p className="text-xl font-bold text-red-600">{currentMetrics.cancelled}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-3 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium">Subtotal</p>
          <p className="text-sm font-bold text-gray-800 truncate">{formatMoney(currentMetrics.subtotal)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-3 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium">IVA</p>
          <p className="text-sm font-bold text-gray-800 truncate">{formatMoney(currentMetrics.tax)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-3 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium">Total</p>
          <p className="text-sm font-bold text-[#4f46e5] truncate">{formatMoney(currentMetrics.total)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              {activeTab === 'paqueteria' ? (
                <>
                  <th className="p-3 text-left font-semibold text-gray-600">Tracking</th>
                  <th className="p-3 text-left font-semibold text-gray-600">Fecha</th>
                  <th className="p-3 text-left font-semibold text-gray-600">Origen</th>
                  <th className="p-3 text-left font-semibold text-gray-600">Destino</th>
                  <th className="p-3 text-left font-semibold text-gray-600">Status</th>
                  <th className="p-3 text-right font-semibold text-gray-600">Total</th>
                </>
              ) : (
                <>
                  <th className="p-3 text-left font-semibold text-gray-600">Tracking</th>
                  <th className="p-3 text-left font-semibold text-gray-600">Fecha</th>
                  <th className="p-3 text-left font-semibold text-gray-600">Ruta</th>
                  <th className="p-3 text-left font-semibold text-gray-600">Estado</th>
                  <th className="p-3 text-right font-semibold text-gray-600">Total</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {last10.map((o, i) => (
              <tr key={o.id || i} className="border-b hover:bg-gray-50">
                {activeTab === 'paqueteria' ? (
                  <>
                    <td className="p-3 font-mono text-xs">{o.tracking_code || '-'}</td>
                    <td className="p-3 text-xs">{formatDate(o.created_at)}</td>
                    <td className="p-3 text-xs max-w-xs truncate">{o.origin_address || '-'}</td>
                    <td className="p-3 text-xs max-w-xs truncate">{o.dest_address || '-'}</td>
                    <td className="p-3">
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium inline-block"
                        style={{ backgroundColor: statusColor(o.status), color: statusTextColor(o.status) }}
                      >
                        {statusLabel(o.status)}
                      </span>
                    </td>
                    <td className="p-3 text-right text-xs font-medium">{formatMoney(o.total)}</td>
                  </>
                ) : (
                  <>
                    <td className="p-3 font-mono text-xs">{o.tracking_code || '-'}</td>
                    <td className="p-3 text-xs">{formatDate(o.created_at)}</td>
                    <td className="p-3 text-xs max-w-xs truncate">{o.ruta || '-'}</td>
                    <td className="p-3">
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium inline-block"
                        style={{ backgroundColor: statusColor(o.status), color: statusTextColor(o.status) }}
                      >
                        {statusLabel(o.status)}
                      </span>
                    </td>
                    <td className="p-3 text-right text-xs font-medium">{formatMoney(o.total)}</td>
                  </>
                )}
              </tr>
            ))}
            {last10.length === 0 && (
              <tr>
                <td colSpan={activeTab === 'paqueteria' ? 6 : 5} className="p-6 text-center text-gray-400 text-sm">
                  No hay órdenes disponibles
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Órdenes creadas por día (últimos 7 días)</h3>
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          className="w-full h-auto max-w-full border border-gray-100 rounded"
        />
      </div>
    </div>
  );
}
