'use client';

import { createClient } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  Download,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCw,
  Map,
} from 'lucide-react';
import PageWithSidebar from '@/components/dashboard/PageWithSidebar';

const API = process.env.NEXT_PUBLIC_API_URL;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Cache de geocodificación por dirección (persiste entre renders/cargas de la sesión).
// Nota: este módulo importa `Map` (ícono) de lucide-react, así que hay que usar
// `globalThis.Map` explícitamente para el constructor nativo y evitar el shadowing.
const geocodeCache = new globalThis.Map();

// Geocodifica una dirección con Nominatim. Devuelve { lat, lng } (numbers) o nulls.
// El rate-limit (~1 req/seg) se aplica solo después de una llamada real de red, no en cache hits.
const geocodeAddress = async (address) => {
  if (!address) return { lat: null, lng: null };
  if (geocodeCache.has(address)) return geocodeCache.get(address);

  let result = { lat: null, lng: null };
  try {
    // Nominatim no resuelve el literal "CP" (p. ej. "CP 06600"); se quita para
    // la búsqueda dejando solo el número de código postal, que sí desambigua.
    const query = address.replace(/\bCP\s*/gi, '');
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )}&format=json&limit=1&countrycodes=mx`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
    const data = await res.json();
    if (data && data.length > 0) {
      result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {
    result = { lat: null, lng: null };
  }

  geocodeCache.set(address, result);
  await sleep(1100); // respeta el límite de Nominatim (~1 req/seg) tras una llamada real
  return result;
};

export default function CargaMasivaPage() {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [clientId, setClientId] = useState(null);
  // Crear ruta con las guías cargadas
  const [vehicles, setVehicles] = useState([]);
  const [routeVehicle, setRouteVehicle] = useState('');
  const [creatingRoute, setCreatingRoute] = useState(false);
  const [routeMsg, setRouteMsg] = useState(null);

  useEffect(() => {
    const getSession = async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user?.id) {
          const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('auth_id', session.user.id)
            .single();

          if (userData?.id) {
            setClientId(userData.id);
          }
        }
      } catch (err) {
        console.error('Error getting session:', err);
      }
    };
    getSession();
  }, []);

  const generateTrackingCode = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let random = '';
    for (let i = 0; i < 8; i++) {
      random += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `ABZ-${year}${month}${day}-${random}`;
  };

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile && uploadedFile.type === 'text/csv') {
      setFile(uploadedFile);
      setError(null);
      setResults([]);
    } else {
      setError('Por favor selecciona un archivo CSV válido');
      setFile(null);
    }
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter((line) => line.trim());
    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }
    return rows;
  };

  const buildAddress = (street, cp, municipio, estado) => {
    return `${street}, CP ${cp}, ${municipio}, ${estado}`;
  };

  const processOrders = async () => {
    if (!file || !clientId) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      const supabase = createClient();
      const batchResults = [];

      for (const row of rows) {
        const trackingCode = generateTrackingCode();
        const originAddress = buildAddress(
          row.origin_street,
          row.origin_cp,
          row.origin_municipio,
          row.origin_estado
        );
        const destAddress = buildAddress(
          row.dest_street,
          row.dest_cp,
          row.dest_municipio,
          row.dest_estado
        );
        const instructionsFinal = [row.instructions, row.references]
          .filter(Boolean)
          .join(' | ');

        // Geocodifica origen y destino (con cache + rate-limit) para que la
        // optimización de rutas por cercanía pueda ordenar las paradas.
        const originCoords = await geocodeAddress(originAddress);
        const destCoords = await geocodeAddress(destAddress);

        const orderData = {
          tracking_code: trackingCode,
          client_id: clientId,
          sender_name: row.sender_name,
          sender_phone: row.sender_phone,
          origin_address: originAddress,
          origin_lat: originCoords.lat,
          origin_lng: originCoords.lng,
          recipient_name: row.recipient_name,
          recipient_phone: row.recipient_phone,
          dest_address: destAddress,
          dest_lat: destCoords.lat,
          dest_lng: destCoords.lng,
          package_type: row.package_type,
          weight_kg: parseFloat(row.weight_kg) || 0,
          service: row.service,
          instructions: instructionsFinal,
          has_insurance: row.has_insurance === 'true' || row.has_insurance === '1',
          status: 'pending',
          subtotal: 0,
          tax: 0,
          total: 0,
        };

        const { data, error: insertError } = await supabase
          .from('orders')
          .insert([orderData])
          .select()
          .single();

        batchResults.push({
          tracking: trackingCode,
          remitente: row.sender_name,
          destinatario: row.recipient_name,
          destino: destAddress,
          success: !insertError,
          error: insertError?.message || null,
          id: data?.id || null,
          geocoded: destCoords.lat !== null && destCoords.lng !== null,
        });
      }

      setResults(batchResults);
      setRetryCount(0);
    } catch (err) {
      setError(`Error procesando el archivo: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Cargar vehículos del cliente (para crear ruta con las guías)
  useEffect(() => {
    const loadVehicles = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${API}/vehicles`, { headers: { Authorization: `Bearer ${session?.access_token}` } });
        const body = await res.json();
        if (res.ok) setVehicles(body.vehicles || []);
      } catch { /* noop */ }
    };
    loadVehicles();
  }, []);

  // Crear una ruta con las guías creadas exitosamente y optimizarla por cercanía
  const createRouteFromBatch = async () => {
    const guides = results.filter((r) => r.success && r.tracking).map((r) => r.tracking);
    if (!routeVehicle) { setRouteMsg({ type: 'err', text: 'Selecciona un vehículo' }); return; }
    if (guides.length === 0) { setRouteMsg({ type: 'err', text: 'No hay guías para rutear' }); return; }
    setCreatingRoute(true); setRouteMsg(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const headers = { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' };
      const rRes = await fetch(`${API}/routes`, { method: 'POST', headers, body: JSON.stringify({ vehicle_id: routeVehicle }) });
      const rBody = await rRes.json();
      if (!rRes.ok) throw new Error(rBody.error === 'SUBSCRIPTION_INACTIVE' ? 'Tu suscripción no está activa.' : (rBody.error || 'No se pudo crear la ruta'));
      const routeId = rBody.route.id;
      let added = 0;
      for (const g of guides) {
        const iRes = await fetch(`${API}/routes/${routeId}/items`, { method: 'POST', headers, body: JSON.stringify({ guide_code: g }) });
        if (iRes.ok) added++;
      }
      await fetch(`${API}/routes/${routeId}/optimize`, { method: 'POST', headers, body: '{}' });
      setRouteMsg({ type: 'ok', text: `Ruta creada con ${added} paradas. Redirigiendo…` });
      setTimeout(() => router.push('/dashboard/rutas'), 900);
    } catch (e) {
      setRouteMsg({ type: 'err', text: e.message });
    } finally {
      setCreatingRoute(false);
    }
  };

  const handleViewGuides = () => {
    const successIds = results
      .filter((r) => r.success && r.id)
      .map((r) => r.id);
    if (successIds.length > 0) {
      router.push(`/dashboard/guias`);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'sender_name',
      'sender_phone',
      'origin_street',
      'origin_cp',
      'origin_municipio',
      'origin_estado',
      'recipient_name',
      'recipient_phone',
      'dest_street',
      'dest_cp',
      'dest_municipio',
      'dest_estado',
      'package_type',
      'weight_kg',
      'service',
      'instructions',
      'references',
      'has_insurance',
    ];
    const exampleRow = [
      'Juan Lopez',
      '5512345678',
      'Calle Reforma 1',
      '06600',
      'Cuauhtemoc',
      'Ciudad de Mexico',
      'Maria Garcia',
      '5587654321',
      'Av Insurgentes 200',
      '03810',
      'Benito Juarez',
      'Ciudad de Mexico',
      'paquete',
      '2.5',
      'standard',
      'Fragil',
      'Dejar en recepcion',
      'false',
    ];

    let csvContent = '﻿' + headers.join(',') + '\n';
    csvContent += exampleRow.join(',');

    const encodedUri = encodeURIComponent(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', `data:text/csv;charset=utf-8,${encodedUri}`);
    link.setAttribute('download', 'plantilla_carga_masiva.csv');
    link.click();
  };

  const successCount = results.filter((r) => r.success).length;
  const errorCount = results.filter((r) => !r.success).length;

  return (
    <PageWithSidebar>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Carga Masiva</h1>
        <p className="mt-1 text-sm text-gray-500">
          Crea múltiples órdenes de paquetería subiendo un archivo CSV
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900">
              Descargar Plantilla
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Descarga la plantilla de ejemplo para preparar tu archivo
            </p>
            <button
              onClick={handleDownloadTemplate}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Descargar Plantilla
            </button>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <label className="block">
              <span className="mb-3 block text-sm font-medium text-gray-900">
                Seleccionar archivo CSV
              </span>
              <div className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-6 text-center transition hover:border-gray-400 hover:bg-gray-50">
                <Upload className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  {file ? (
                    <>
                      <span className="font-medium">{file.name}</span>
                      <span className="block text-xs text-gray-500 mt-1">
                        Haz clic para cambiar
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-medium">Selecciona un archivo</span>
                      <span className="block text-xs text-gray-500">
                        o arrastra aquí
                      </span>
                    </>
                  )}
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </label>
          </div>

          <button
            onClick={processOrders}
            disabled={!file || loading || !clientId}
            className="w-full rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Procesando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Crear órdenes
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center justify-between">
          <span className="text-sm text-red-700">{error}</span>
          <button
            onClick={processOrders}
            className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 inline-flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Reintentar
          </button>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-12 bg-gray-200 animate-pulse rounded"
            ></div>
          ))}
        </div>
      )}

      {results.length > 0 && !loading && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-900">
                    {successCount} de {results.length} órdenes creadas
                  </span>
                </div>
                {errorCount > 0 && (
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="text-sm font-medium text-red-700">
                      {errorCount} errores
                    </span>
                  </div>
                )}
              </div>
              {successCount > 0 && (
                <button
                  onClick={handleViewGuides}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Ver guías
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {successCount > 0 && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Map className="h-5 w-5 text-indigo-600" />
                <span className="text-sm font-semibold text-indigo-900">Convertir estas guías en una ruta</span>
              </div>
              <p className="mb-3 text-xs text-indigo-700">
                Se creará una ruta con las {successCount} guías creadas y se optimizará el orden de paradas por cercanía.
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-600">Vehículo</label>
                  <select
                    value={routeVehicle}
                    onChange={(e) => setRouteVehicle(e.target.value)}
                    className="min-w-[180px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Selecciona…</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>{v.placa}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={createRouteFromBatch}
                  disabled={creatingRoute || !routeVehicle}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-300"
                >
                  <Map className="h-4 w-4" />
                  {creatingRoute ? 'Creando ruta…' : 'Crear ruta con estas guías'}
                </button>
              </div>
              {vehicles.length === 0 && (
                <p className="mt-2 text-xs text-orange-600">No tienes vehículos activos. Da de alta placas en "Mis vehículos".</p>
              )}
              {routeMsg && (
                <div className={`mt-2 text-sm ${routeMsg.type === 'ok' ? 'text-green-700' : 'text-red-700'}`}>{routeMsg.text}</div>
              )}
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">
                    Tracking
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">
                    Remitente
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">
                    Destinatario
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">
                    Destino
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">
                      {result.tracking}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {result.remitente}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {result.destinatario}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {result.destino}
                    </td>
                    <td className="px-4 py-3">
                      {result.success ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Creada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                          <XCircle className="h-3 w-3" />
                          Error
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
    </PageWithSidebar>
  );
}