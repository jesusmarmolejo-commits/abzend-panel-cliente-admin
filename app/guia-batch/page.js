'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import GuiaLabel from '@/components/dashboard/GuiaLabel';

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
          .select('*, bultos(id,tipo,cantidad,descripcion)')
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

      <div id="guia-batch-print-content" style={{ fontFamily: 'Arial, sans-serif', maxWidth: 672, margin: '0 auto' }}>
        {orders.map((order, index) => (
          <div key={order.id} className="bg-white rounded-2xl shadow mb-4">
            <GuiaLabel
              order={order}
              bultos={order.bultos || []}
              isLast={index === orders.length - 1}
            />
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #guia-batch-print-content, #guia-batch-print-content * { visibility: visible !important; }
          #guia-batch-print-content {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
          }
          #guia-batch-print-content > div {
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
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
