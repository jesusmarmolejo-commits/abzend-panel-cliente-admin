'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import PageWithSidebar from '@/components/dashboard/PageWithSidebar';
import NuevaOrdenModal from '@/components/dashboard/NuevaOrdenModal';
import GuiaModal from '@/components/dashboard/GuiaModal';
import GuideDetailModal from '@/components/GuideDetailModal';
import {
  Package,
  Search,
  Download,
  Printer,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  X,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Filter,
  Calendar,
  ArrowUpDown,
  Plus
} from 'lucide-react';

const STATUS_LABEL = {
  pending: 'Pendiente',
  assigned: 'Asignado',
  picked_up: 'Recogido',
  in_transit: 'En transito',
  delivered: 'Entregado',
  cancelled: 'Cancelado'
};

const STATUS_COLOR = {
  pending: 'bg-amber-100 text-amber-800',
  assigned: 'bg-blue-100 text-blue-800',
  picked_up: 'bg-blue-100 text-blue-800',
  in_transit: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

const SHOW_MAP_STATUSES = ['in_transit', 'out_for_delivery'];
const PAGE_SIZE = 10;

export default function PaqueteriaPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterTracking, setFilterTracking] = useState('');
  const [page, setPage] = useState(1);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [reprintTracking, setReprintTracking] = useState('');
  const [reprintLoading, setReprintLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showNuevaOrden, setShowNuevaOrden] = useState(false);
  const [guiaOrder, setGuiaOrder] = useState(null);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [createdTracking, setCreatedTracking] = useState(null);

  const loadData = async () => {
    const supabase = createClient();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', session.user.id)
        .single();

      if (userError || !userData) {
        router.push('/login');
        return;
      }

      setClientId(userData.id);

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*, events:order_events(status,status_code,note,created_at), pod:proof_of_delivery(receiver_name,receiver_type,photo_1,photo_2,photo_3,photo_4,signature,lat,lng,created_at), bultos(id,tipo,cantidad,descripcion)')
        .eq('client_id', userData.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const refreshOrders = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', session.user.id)
      .single();

    if (!userData) return;

    const { data: ordersData } = await supabase
      .from('orders')
      .select('*, events:order_events(status,status_code,note,created_at), pod:proof_of_delivery(receiver_name,receiver_type,photo_1,photo_2,photo_3,photo_4,signature,lat,lng,created_at)')
      .eq('client_id', userData.id)
      .order('created_at', { ascending: false });

    setOrders(ordersData || []);
  };

  // Al crear una guía nos quedamos en la lista (imprimir es opcional).
  const handleOrderSuccess = (tracking_code) => {
    setShowNuevaOrden(false);
    refreshOrders();
    setCreatedTracking(tracking_code);
    setTimeout(() => setCreatedTracking(null), 8000);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (filterStatus && filterStatus !== 'all') {
      result = result.filter(order => order.status === filterStatus);
    }

    if (filterFrom) {
      const fromDate = new Date(filterFrom);
      result = result.filter(order => new Date(order.created_at) >= fromDate);
    }

    if (filterTo) {
      const toDate = new Date(filterTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter(order => new Date(order.created_at) <= toDate);
    }

    if (filterTracking) {
      const cleanTracking = filterTracking.toLowerCase().replace('#', '').trim();
      result = result.filter(order =>
        order.tracking_code?.toLowerCase().includes(cleanTracking)
      );
    }

    return result;
  }, [orders, filterStatus, filterFrom, filterTo, filterTracking]);

  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE);
  const paginatedOrders = filteredOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => {
    return {
      total: orders.length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      active: orders.filter(o => ['pending', 'assigned', 'picked_up', 'in_transit'].includes(o.status)).length,
      pending: orders.filter(o => o.status === 'pending').length
    };
  }, [orders]);

  const exportExcel = (ordersToExport) => {
    const headers = ['Tracking', 'Fecha', 'Origen', 'Destino', 'Servicio', 'Status', 'Subtotal', 'IVA', 'Total'];
    const rows = ordersToExport.map(order => [
      order.tracking_code,
      new Date(order.created_at).toLocaleDateString('es-MX'),
      order.origin_address,
      order.dest_address,
      order.service || '',
      STATUS_LABEL[order.status],
      order.subtotal?.toFixed(2) || '0.00',
      order.tax?.toFixed(2) || '0.00',
      order.total?.toFixed(2) || '0.00'
    ]);

    const csvContent = [headers, ...rows]
      .map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const BOM = '﻿';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ordenes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportPDF = (ordersToExport) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let html = `
      <html>
        <head>
          <title>Órdenes de Paquetería</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; }
            h1 { color: #333; }
            .print-btn { margin: 20px 0; padding: 10px 20px; background: #007bff; color: white; border: none; cursor: pointer; border-radius: 4px; }
            @media print { .print-btn { display: none; } }
          </style>
        </head>
        <body>
          <button class="print-btn" onclick="window.print()">Imprimir</button>
          <h1>Órdenes de Paquetería</h1>
          <p>Fecha: ${new Date().toLocaleDateString('es-MX')}</p>
          <table>
            <thead>
              <tr>
                <th>Tracking</th><th>Fecha</th><th>Origen</th><th>Destino</th>
                <th>Servicio</th><th>Status</th><th>Subtotal</th><th>IVA</th><th>Total</th>
              </tr>
            </thead>
            <tbody>
    `;

    ordersToExport.forEach(order => {
      html += `
        <tr>
          <td>${order.tracking_code}</td>
          <td>${new Date(order.created_at).toLocaleDateString('es-MX')}</td>
          <td>${order.origin_address || ''}</td>
          <td>${order.dest_address || ''}</td>
          <td>${order.service || ''}</td>
          <td>${STATUS_LABEL[order.status]}</td>
          <td>$${order.subtotal?.toFixed(2) || '0.00'}</td>
          <td>$${order.tax?.toFixed(2) || '0.00'}</td>
          <td>$${order.total?.toFixed(2) || '0.00'}</td>
        </tr>
      `;
    });

    html += `</tbody></table></body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handlePrintGuia = (order) => {
    setGuiaOrder(order);
  };

  const handleReprint = async () => {
    if (!reprintTracking.trim()) return;
    setReprintLoading(true);
    try {
      const trackings = reprintTracking.split(',').map(t => t.trim()).filter(Boolean).slice(0, 10);
      const matched = orders.filter(o => trackings.includes(o.tracking_code));
      if (matched.length === 0) {
        alert('No se encontraron órdenes con los trackings ingresados');
        return;
      }
      const ids = matched.map(o => o.id).join(',');
      router.push(`/guia-batch?ids=${ids}`);
      setReprintTracking('');
    } catch (err) {
      console.error('Error reprinting:', err);
      alert('Error al reimprimir las guías');
    } finally {
      setReprintLoading(false);
    }
  };

  const TrackingMap = ({ order }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);

    useEffect(() => {
      if (!mapRef.current || !order || !SHOW_MAP_STATUSES.includes(order.status)) return;

      const initializeMap = (L) => {
        if (!mapRef.current) return;
        if (mapInstanceRef.current) mapInstanceRef.current.remove();

        const map = L.map(mapRef.current).setView([19.4326, -99.1332], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        if (order.dest_lat && order.dest_lng) {
          L.marker([order.dest_lat, order.dest_lng]).addTo(map).bindPopup('Tu domicilio');
        }
        if (order.origin_lat && order.origin_lng) {
          const rLat = order.origin_lat + (Math.random() - 0.5) * 0.02;
          const rLng = order.origin_lng + (Math.random() - 0.5) * 0.02;
          L.marker([rLat, rLng]).addTo(map).bindPopup('Tu paquete');
        }
        if (order.dest_lat && order.dest_lng && order.origin_lat && order.origin_lng) {
          L.polyline([[order.origin_lat, order.origin_lng], [order.dest_lat, order.dest_lng]],
            { color: 'green', weight: 2, dashArray: '5, 5', opacity: 0.7 }).addTo(map);
        }
        mapInstanceRef.current = map;
      };

      if (!window.L) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => initializeMap(window.L);
        document.head.appendChild(script);
      } else {
        initializeMap(window.L);
      }

      return () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
      };
    }, [order]);

    if (!order || !SHOW_MAP_STATUSES.includes(order.status)) return null;

    return (
      <div className="mt-4">
        <div ref={mapRef} className="h-64 rounded-lg border border-gray-200 bg-gray-100" />
      </div>
    );
  };

  const hasFilters = filterStatus !== 'all' || filterFrom || filterTo || filterTracking;

  if (loading) {
    return (
      <PageWithSidebar>
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PageWithSidebar>
    );
  }

  return (
    <>
      <PageWithSidebar>
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-7xl mx-auto">

          {createdTracking && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
              <span className="text-sm text-green-800">
                ✓ Guía <span className="font-mono font-semibold">{createdTracking}</span> creada. Imprimirla es opcional.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const o = orders.find((x) => x.tracking_code === createdTracking);
                    if (o) setGuiaOrder(o);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Printer size={16} /> Imprimir guía
                </button>
                <button onClick={() => setCreatedTracking(null)} className="text-green-700 hover:text-green-900" aria-label="Cerrar">
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Guías</h1>
              <p className="text-gray-500 mt-1">{orders.length} guías en total</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowNuevaOrden(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus size={20} />
                Nueva guía
              </button>
              <button
                onClick={() => exportExcel(filteredOrders)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <FileSpreadsheet size={20} />
                Excel
              </button>
              <button
                onClick={() => exportPDF(filteredOrders)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FileText size={20} />
                PDF
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Órdenes</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Package className="text-blue-600" size={24} />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Activas</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">{stats.active}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Truck className="text-blue-600" size={24} />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Entregadas</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{stats.delivered}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <CheckCircle2 className="text-green-600" size={24} />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pendientes</p>
                  <p className="text-3xl font-bold text-amber-600 mt-1">{stats.pending}</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg">
                  <Clock className="text-amber-600" size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* Reprint Section */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Reimprimir Guías</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={reprintTracking}
                onChange={(e) => setReprintTracking(e.target.value)}
                placeholder="Trackings separados por coma (máx 10)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                onClick={handleReprint}
                disabled={!reprintTracking.trim() || reprintLoading}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {reprintLoading ? <Loader2 className="animate-spin" size={20} /> : <Printer size={20} />}
                Reimprimir
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Filter size={20} className="text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
              {hasFilters && (
                <button
                  onClick={() => { setFilterStatus('all'); setFilterFrom(''); setFilterTo(''); setFilterTracking(''); setPage(1); }}
                  className="ml-auto text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                >
                  <X size={16} /> Limpiar
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="all">Todos</option>
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
                <input type="date" value={filterFrom}
                  onChange={(e) => { setFilterFrom(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
                <input type="date" value={filterTo}
                  onChange={(e) => { setFilterTo(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tracking</label>
                <input type="text" value={filterTracking}
                  onChange={(e) => { setFilterTracking(e.target.value); setPage(1); }}
                  placeholder="Buscar..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-end">
                <span className="text-sm text-gray-600">{filteredOrders.length} resultados</span>
              </div>
            </div>
          </div>

          {/* Orders List */}
          {paginatedOrders.length === 0 ? (
            <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
              <Package className="mx-auto text-gray-300" size={64} />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No hay órdenes</h3>
              <p className="mt-2 text-gray-500">
                {hasFilters ? 'No se encontraron órdenes con los filtros aplicados' : 'Aún no tienes órdenes de paquetería'}
              </p>
              {!hasFilters && (
                <button
                  onClick={() => setShowNuevaOrden(true)}
                  className="mt-4 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium"
                >
                  <Plus size={18} /> Crear primer envío
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:border-indigo-200 transition-colors overflow-hidden">
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <button onClick={() => setSelectedGuide(order.tracking_code)} className="text-blue-600 font-mono text-sm font-semibold hover:underline hover:text-blue-800 transition-colors cursor-pointer bg-transparent border-none p-0 text-left">
                            <h3 className="text-lg font-semibold">{order.tracking_code}</h3>
                          </button>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[order.status]}`}>
                            {STATUS_LABEL[order.status]}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{order.origin_address} → {order.dest_address}</p>
                        <p className="text-sm font-medium text-gray-700">
                          {order.service && order.service.charAt(0).toUpperCase() + order.service.slice(1)} | ${order.total?.toFixed(2) || '0.00'} MXN
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePrintGuia(order); }}
                          className="px-3 py-1 text-sm border border-indigo-600 text-indigo-600 rounded hover:bg-indigo-50 transition-colors"
                        >
                          Imprimir guía
                        </button>
                        <button
                          onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <ChevronDown size={20} className={`transition-transform ${expandedOrder === order.id ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {expandedOrder === order.id && (
                      <div className="mt-6 pt-6 border-t border-gray-100">
                        {order.events && order.events.length > 0 && (
                          <div className="mb-6">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Historial de Eventos</h4>
                            <div className="space-y-3">
                              {[...order.events].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((event, index) => (
                                <div key={index} className="flex items-start gap-3">
                                  <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-indigo-500" />
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">{event.status_code}</span>
                                      <p className="text-sm font-medium text-gray-900">{STATUS_LABEL[event.status] || event.status}</p>
                                    </div>
                                    {event.note && <p className="text-sm text-gray-600 mt-1">{event.note}</p>}
                                    <p className="text-xs text-gray-400 mt-1">
                                      {new Date(event.created_at).toLocaleDateString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {order.pod && order.pod.length > 0 && (
                          <div className="mb-6">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Comprobante de Entrega</h4>
                            {order.pod.map((pod, podIndex) => (
                              <div key={podIndex} className="bg-gray-50 rounded-lg p-4 space-y-3">
                                <div><span className="font-medium text-sm">Recibió:</span> {pod.receiver_name} ({pod.receiver_type})</div>
                                {pod.photo_1 && (
                                  <div>
                                    <p className="text-sm font-medium mb-2">Fotos:</p>
                                    <div className="grid grid-cols-4 gap-2">
                                      {[pod.photo_1, pod.photo_2, pod.photo_3, pod.photo_4].filter(Boolean).map((photo, idx) => (
                                        <a key={idx} href={photo} target="_blank" rel="noopener noreferrer">
                                          <img src={photo} alt={`Foto ${idx + 1}`} className="w-full h-24 object-cover rounded border border-gray-200 hover:opacity-75 transition-opacity cursor-pointer" />
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {pod.signature && (
                                  <div>
                                    <p className="text-sm font-medium mb-2">Firma:</p>
                                    <img src={pod.signature} alt="Firma" className="max-w-xs border border-gray-200 rounded" />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {SHOW_MAP_STATUSES.includes(order.status) && <TrackingMap order={order} />}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} /> Anterior
              </button>
              <span className="text-sm text-gray-600">Página {page} de {totalPages}</span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente <ChevronRight size={16} />
              </button>
            </div>
          )}

          {error && (
            <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 max-w-sm">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          </div>
        </div>
      </PageWithSidebar>

      {showNuevaOrden && (
        <NuevaOrdenModal
          clientId={clientId}
          onClose={() => setShowNuevaOrden(false)}
          onSuccess={handleOrderSuccess}
        />
      )}

      {guiaOrder && (
        <GuiaModal
          order={guiaOrder}
          onClose={() => setGuiaOrder(null)}
        />
      )}

      <GuideDetailModal
        trackingCode={selectedGuide ?? ''}
        isOpen={!!selectedGuide}
        onClose={() => setSelectedGuide(null)}
      />
    </>
  );
}
