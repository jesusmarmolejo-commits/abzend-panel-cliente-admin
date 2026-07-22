'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

function GuiaCard({ order, isLast }) {
  const tracking = order.tracking_code || '';
  const servicio = (order.service || 'standard').toUpperCase();
  const fecha = order.created_at
    ? new Date(order.created_at).toLocaleDateString('es-MX')
    : '—';
  const total = Number(order.total || 0).toFixed(2);

  return (
    <div
      className="guia-card"
      style={{
        fontFamily: 'Arial, sans-serif',
        padding: 24,
        color: '#111',
        maxWidth: 672,
        margin: '0 auto 24px',
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        pageBreakAfter: isLast ? 'auto' : 'always',
      }}
    >
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #4f46e5', paddingBottom: 12, marginBottom: 20 }}>
        <div style={{ fontSize: 24, fontWeight: 900, color: '#4f46e5', letterSpacing: 2 }}>ABZEND</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#888' }}>No. de Guía</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{tracking}</div>
        </div>
        <div style={{ background: '#4f46e5', color: '#fff', padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
          {servicio}
        </div>
      </div>

      {/* Remitente / Destinatario */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, color: '#4f46e5', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>Remitente</div>
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
            <div><strong>{order.sender_name || '—'}</strong></div>
            <div>{order.sender_phone || '—'}</div>
            <div>{order.origin_address || '—'}</div>
          </div>
        </div>
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, color: '#4f46e5', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>Destinatario</div>
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
            <div><strong>{order.recipient_name || '—'}</strong></div>
            <div>{order.recipient_phone || '—'}</div>
            <div>{order.dest_address || '—'}</div>
          </div>
        </div>
      </div>

      {/* Detalles del paquete */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'TIPO', value: order.package_type || '—' },
          { label: 'PESO', value: `${order.weight_kg || '—'} kg` },
          { label: 'TOTAL', value: `$${total}` },
          { label: 'FECHA', value: fecha },
        ].map(({ label, value }) => (
          <div key={label} style={{ border: '1px solid #ddd', borderRadius: 6, padding: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* QR */}
      <div style={{ textAlign: 'center', border: '2px dashed #4f46e5', borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(tracking)}`}
          width="120"
          height="120"
          alt="QR"
        />
        <div style={{ fontSize: 11, color: '#555', marginTop: 8 }}>Escanea para rastrear · {tracking}</div>
      </div>

      {/* Instrucciones */}
      {order.instructions && (
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#4f46e5', textTransform: 'uppercase', marginBottom: 6, fontWeight: 700 }}>Instrucciones especiales</div>
          <div style={{ fontSize: 13 }}>{order.instructions}</div>
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: '1px solid #eee', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888' }}>
        <span>ABZEND Logística</span>
        <span>Generado: {new Date().toLocaleString('es-MX')}</span>
        <span>Seguro: {order.has_insurance ? 'Sí' : 'No'}</span>
      </div>
    </div>
  );
}

function InfoScreen({ title, message, isError }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">{title}</h1>
        {message && <p className={`mb-6 ${isError ? 'text-red-600' : 'text-gray-600'}`}>{message}</p>}
        <Link href="/dashboard/guias" className="text-indigo-600 hover:text-indigo-800 underline">
          Volver a guías
        </Link>
      </div>
    </div>
  );
}

function GuiaBatchContent() {
  const searchParams = useSearchParams();
  const idsParam = searchParams.get('ids') || '';
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notAuth, setNotAuth] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setNotAuth(true);
          return;
        }

        const idList = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
        if (idList.length === 0) {
          setOrders([]);
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('orders')
          .select('*')
          .in('id', idList);

        if (fetchError) {
          setError(fetchError.message);
        } else {
          setOrders(data || []);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [idsParam]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-600">Cargando guías…</div>
      </div>
    );
  }

  if (notAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Sesión requerida</h1>
          <p className="text-gray-600 mb-6">Inicia sesión para ver las guías.</p>
          <Link href="/login" className="text-indigo-600 hover:text-indigo-800 underline">
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return <InfoScreen title="Error" message={error} isError />;
  }

  if (orders.length === 0) {
    return <InfoScreen title="No se encontraron guías" message="No hay guías con los IDs proporcionados." />;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="print:hidden mb-4 flex items-center justify-center gap-3">
        <Link
          href="/dashboard/guias"
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg bg-white hover:bg-gray-50 transition-colors"
        >
          ← Volver a guías
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          🖨️ Imprimir todas ({orders.length})
        </button>
      </div>

      <div id="guia-batch-print-content">
        {orders.map((order, index) => (
          <GuiaCard key={order.id} order={order} isLast={index === orders.length - 1} />
        ))}
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #guia-batch-print-content,
          #guia-batch-print-content * {
            visibility: visible !important;
          }
          #guia-batch-print-content {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
          }
          #guia-batch-print-content .guia-card {
            box-shadow: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function GuiaBatchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando…</div>}>
      <GuiaBatchContent />
    </Suspense>
  );
}
