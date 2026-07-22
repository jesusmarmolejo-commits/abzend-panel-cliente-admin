'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import GuiaLabel, { bultosTotal } from '@/components/dashboard/GuiaLabel';

function GuiaContent() {
  const searchParams = useSearchParams();
  const tracking = searchParams.get('tracking');

  // Orden reconstruida desde los query params (fallback si no hay sesión/DB).
  const paramOrder = tracking
    ? {
        tracking_code: tracking,
        sender_name: searchParams.get('remitente') || '',
        sender_phone: searchParams.get('remitente_tel') || '',
        origin_address: searchParams.get('origen') || '',
        recipient_name: searchParams.get('destinatario') || '',
        recipient_phone: searchParams.get('destinatario_tel') || '',
        dest_address: searchParams.get('destino') || '',
        package_type: searchParams.get('tipo') || '',
        weight_kg: searchParams.get('peso') || '0',
        total: searchParams.get('total') || '0',
        service: searchParams.get('servicio') || 'standard',
        created_at: searchParams.get('fecha') || new Date().toISOString(),
        has_insurance: searchParams.get('seguro') === '1',
        instructions: searchParams.get('instrucciones') || '',
      }
    : null;

  const [order, setOrder] = useState(paramOrder);
  const [bultos, setBultos] = useState([]);
  const [copies, setCopies] = useState(1);

  // Trae la orden real (con bultos) por tracking; si no hay sesión, se queda con paramOrder.
  useEffect(() => {
    if (!tracking) return;
    const run = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('orders')
          .select('*, bultos(id,tipo,cantidad,descripcion)')
          .eq('tracking_code', tracking)
          .maybeSingle();
        if (data) {
          setOrder(data);
          const b = data.bultos || [];
          setBultos(b);
          setCopies(bultosTotal(b) > 0 ? bultosTotal(b) : 1);
        }
      } catch {
        /* sin sesión / no encontrada: se usa paramOrder */
      }
    };
    run();
  }, [tracking]);

  if (!tracking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Guía no encontrada</h1>
          <p className="text-gray-600 mb-6">No se proporcionó un número de guía válido.</p>
          <Link href="/dashboard/guias" className="text-indigo-600 hover:text-indigo-800 underline">
            Volver a guías
          </Link>
        </div>
      </div>
    );
  }

  const nCopies = Math.max(1, parseInt(copies, 10) || 1);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="print:hidden mb-4 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/dashboard/guias"
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg bg-white hover:bg-gray-50 transition-colors"
        >
          ← Volver a guías
        </Link>
        <label className="flex items-center gap-2 text-sm text-gray-600 bg-white px-3 py-2 rounded-lg border border-gray-300">
          Etiquetas a imprimir
          <input
            type="number"
            min="1"
            value={copies}
            onChange={(e) => setCopies(e.target.value)}
            className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          🖨️ Imprimir
        </button>
      </div>

      <div id="guia-print-content" style={{ fontFamily: 'Arial, sans-serif', maxWidth: 672, margin: '0 auto', background: '#fff', borderRadius: 16 }}>
        {Array.from({ length: nCopies }).map((_, i) => (
          <GuiaLabel
            key={i}
            order={order}
            bultos={bultos}
            copyLabel={`Etiqueta ${i + 1} de ${nCopies}`}
            isLast={i === nCopies - 1}
          />
        ))}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #guia-print-content, #guia-print-content * { visibility: visible !important; }
          #guia-print-content {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            max-width: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function GuiaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando…</div>}>
      <GuiaContent />
    </Suspense>
  );
}
