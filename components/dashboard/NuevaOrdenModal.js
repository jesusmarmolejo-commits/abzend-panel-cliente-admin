'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { MapPin, AlertCircle, X } from 'lucide-react';

const AddressInput = ({ label, value, onChange, onSelect, placeholder }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimer = useRef(null);

  const searchAddress = async (query) => {
    if (!query || query.length < 4) {
      setSuggestions([]);
      return;
    }
    setIsSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=mx&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
      const data = await res.json();
      setSuggestions(
        data.map((r) => ({
          label: r.display_name,
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        }))
      );
    } catch {
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    onChange(val);
    setIsOpen(true);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      searchAddress(val);
    }, 500);
  };

  const handleSelect = (suggestion) => {
    onSelect(suggestion);
    setIsOpen(false);
    setSuggestions([]);
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => value && suggestions.length > 0 && setIsOpen(true)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
      />
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
          {suggestions.map((sug, i) => (
            <button
              key={i}
              onClick={() => handleSelect(sug)}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm border-b border-gray-100 last:border-b-0"
            >
              {sug.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default function NuevaOrdenModal({ clientId, onClose, onSuccess }) {
  const [form, setForm] = useState({
    sender_name: '',
    sender_phone: '',
    origin_address: '',
    origin_lat: null,
    origin_lng: null,
    recipient_name: '',
    recipient_phone: '',
    dest_address: '',
    dest_lat: null,
    dest_lng: null,
    package_type: 'general',
    weight_kg: '',
    service: 'standard',
    instructions: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pickingFor, setPickingFor] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  const prices = { standard: 95, express: 180, same_day: 280 };
  const subtotal = prices[form.service] || 95;
  const tax = Math.round(subtotal * 0.16 * 100) / 100;
  const total = subtotal + tax;

  const reverseGeocode = async (lat, lng) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
      const data = await res.json();
      return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  };

  // Cargar Leaflet
  useEffect(() => {
    if (mapLoaded) return;

    const leafletCss = document.getElementById('leaflet-css');
    if (!leafletCss) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      if (mapRef.current === null && document.getElementById('nueva-orden-map')) {
        const L = window.L;
        const map = L.map('nueva-orden-map').setView([19.4326, -99.1332], 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(map);
        mapRef.current = map;
        setMapLoaded(true);
      }
    };
    document.body.appendChild(script);
  }, [mapLoaded]);

  // Click en mapa
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    const handleMapClick = async (e) => {
      if (pickingFor === null) return;
      const { lat, lng } = e.latlng;
      const address = await reverseGeocode(lat, lng);

      if (pickingFor === 'origin') {
        setForm((prev) => ({
          ...prev,
          origin_address: address,
          origin_lat: lat,
          origin_lng: lng,
        }));
      } else if (pickingFor === 'dest') {
        setForm((prev) => ({
          ...prev,
          dest_address: address,
          dest_lat: lat,
          dest_lng: lng,
        }));
      }
      setPickingFor(null);
    };

    mapRef.current.on('click', handleMapClick);
    return () => mapRef.current?.off('click', handleMapClick);
  }, [mapLoaded, pickingFor]);

  // Cursor crosshair cuando pickingFor está activo
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const container = mapRef.current.getContainer();
    container.style.cursor = pickingFor ? 'crosshair' : '';
  }, [pickingFor, mapLoaded]);

  // Actualizar marcadores
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    const L = window.L;
    markersRef.current.forEach((marker) => mapRef.current.removeLayer(marker));
    markersRef.current = [];

    if (form.origin_lat && form.origin_lng) {
      const greenIcon = L.divIcon({
        html: '<div style="background:#4f46e5;color:#fff;padding:4px 8px;border-radius:20px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3)">📦 Origen</div>',
        className: '',
        iconAnchor: [30, 12],
      });
      const marker = L.marker([form.origin_lat, form.origin_lng], { icon: greenIcon })
        .bindPopup('📦 Origen')
        .addTo(mapRef.current);
      markersRef.current.push(marker);
    }

    if (form.dest_lat && form.dest_lng) {
      const blueIcon = L.divIcon({
        html: '<div style="background:#185FA5;color:#fff;padding:4px 8px;border-radius:20px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3)">🏠 Destino</div>',
        className: '',
        iconAnchor: [35, 12],
      });
      const marker = L.marker([form.dest_lat, form.dest_lng], { icon: blueIcon })
        .bindPopup('🏠 Destino')
        .addTo(mapRef.current);
      markersRef.current.push(marker);
    }

    if (form.origin_lat && form.origin_lng && form.dest_lat && form.dest_lng) {
      const polyline = L.polyline(
        [
          [form.origin_lat, form.origin_lng],
          [form.dest_lat, form.dest_lng],
        ],
        {
          color: '#4f46e5',
          weight: 3,
          dashArray: '8 6',
          opacity: 0.7,
        }
      ).addTo(mapRef.current);
      markersRef.current.push(polyline);
      mapRef.current.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    } else if (form.origin_lat && form.origin_lng) {
      mapRef.current.setView([form.origin_lat, form.origin_lng], 14);
    } else if (form.dest_lat && form.dest_lng) {
      mapRef.current.setView([form.dest_lat, form.dest_lng], 14);
    }
  }, [
    form.origin_lat,
    form.origin_lng,
    form.dest_lat,
    form.dest_lng,
    mapLoaded,
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.sender_name || !form.origin_address || !form.recipient_name || !form.dest_address) {
      setError('Por favor completa los campos obligatorios (Remitente, Origen, Destinatario, Destino)');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const trackingCode = `ABZ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random()
        .toString(36)
        .substr(2, 8)
        .toUpperCase()}`;

      const { data, error: insertError } = await supabase
        .from('orders')
        .insert([
          {
            tracking_code: trackingCode,
            client_id: clientId,
            sender_name: form.sender_name,
            sender_phone: form.sender_phone,
            origin_address: form.origin_address,
            origin_lat: form.origin_lat,
            origin_lng: form.origin_lng,
            recipient_name: form.recipient_name,
            recipient_phone: form.recipient_phone,
            dest_address: form.dest_address,
            dest_lat: form.dest_lat,
            dest_lng: form.dest_lng,
            package_type: form.package_type,
            weight_kg: parseFloat(form.weight_kg) || 1,
            service: form.service,
            instructions: form.instructions,
            subtotal,
            tax,
            total,
            status: 'pending',
            payment_status: 'pending',
          },
        ])
        .select()
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      onSuccess(trackingCode, data);
    } catch (err) {
      setError(err.message || 'Error al crear la orden');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-auto">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Nueva Orden de Paquetería</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-[1fr_380px] gap-6 p-6">
          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-800 border border-red-200 rounded-lg p-3 text-sm flex gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                {error}
              </div>
            )}

            <div className="space-y-4 border-b pb-6">
              <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">Remitente</h3>
              <input
                type="text"
                placeholder="Nombre completo"
                value={form.sender_name}
                onChange={(e) => setForm({ ...form, sender_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
              <input
                type="tel"
                placeholder="Teléfono (opcional)"
                value={form.sender_phone}
                onChange={(e) => setForm({ ...form, sender_phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
              <div>
                <AddressInput
                  label="Dirección de Origen"
                  value={form.origin_address}
                  onChange={(val) => setForm({ ...form, origin_address: val })}
                  onSelect={(sug) =>
                    setForm({
                      ...form,
                      origin_address: sug.label,
                      origin_lat: sug.lat,
                      origin_lng: sug.lng,
                    })
                  }
                  placeholder="Calle, número, ciudad, estado..."
                />
              </div>
              <button
                onClick={() => setPickingFor(pickingFor === 'origin' ? null : 'origin')}
                className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition ${
                  pickingFor === 'origin'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <MapPin className="inline h-4 w-4 mr-2" />
                {pickingFor === 'origin' ? 'Seleccionar en mapa...' : 'Seleccionar en mapa'}
              </button>
            </div>

            <div className="space-y-4 border-b pb-6">
              <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Destinatario</h3>
              <input
                type="text"
                placeholder="Nombre completo"
                value={form.recipient_name}
                onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
              <input
                type="tel"
                placeholder="Teléfono (opcional)"
                value={form.recipient_phone}
                onChange={(e) => setForm({ ...form, recipient_phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
              <div>
                <AddressInput
                  label="Dirección de Destino"
                  value={form.dest_address}
                  onChange={(val) => setForm({ ...form, dest_address: val })}
                  onSelect={(sug) =>
                    setForm({
                      ...form,
                      dest_address: sug.label,
                      dest_lat: sug.lat,
                      dest_lng: sug.lng,
                    })
                  }
                  placeholder="Calle, número, ciudad, estado..."
                />
              </div>
              <button
                onClick={() => setPickingFor(pickingFor === 'dest' ? null : 'dest')}
                className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition ${
                  pickingFor === 'dest'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <MapPin className="inline h-4 w-4 mr-2" />
                {pickingFor === 'dest' ? 'Seleccionar en mapa...' : 'Seleccionar en mapa'}
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Paquete</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                  <select
                    value={form.package_type}
                    onChange={(e) => setForm({ ...form, package_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  >
                    <option value="general">Paquetería general</option>
                    <option value="document">Documento / sobre</option>
                    <option value="fragile">Frágil</option>
                    <option value="perishable">Perecedero</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="2.5"
                    value={form.weight_kg}
                    onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Servicio</label>
                <select
                  value={form.service}
                  onChange={(e) => setForm({ ...form, service: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                >
                  <option value="standard">Estándar ($95)</option>
                  <option value="express">Express ($180)</option>
                  <option value="same_day">Same Day ($280)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Instrucciones especiales</label>
                <textarea
                  placeholder="Ej: Frágil, Dejar en recepción, etc."
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium text-gray-900">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">IVA (16%):</span>
                <span className="font-medium text-gray-900">${tax.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-300 pt-2 flex justify-between">
                <span className="font-semibold text-gray-900">Total:</span>
                <span className="font-bold text-lg text-indigo-600">${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creando...' : 'Crear Orden'}
              </button>
            </div>
          </div>

          <div className="sticky top-6 h-[480px]">
            <div id="nueva-orden-map" className="w-full h-full rounded-xl border border-gray-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
