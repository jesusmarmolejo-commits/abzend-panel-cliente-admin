'use client';

export default function GuiaModal({ order, onClose }) {
  if (!order) return null;

  const tracking = order.tracking_code || '';
  const servicio = (order.service || 'standard').toUpperCase();
  const fecha = order.created_at
    ? new Date(order.created_at).toLocaleDateString('es-MX')
    : '—';
  const total = Number(order.total || 0).toFixed(2);

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #guia-print-content, #guia-print-content * { visibility: visible !important; }
          #guia-print-content {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            background: white !important;
            padding: 24px !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>

      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-auto">

          {/* Header de la modal — no se imprime */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 print:hidden">
            <h2 className="text-base font-bold text-gray-900">Guía de Envío</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                ← Regresar
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                🖨️ Imprimir
              </button>
            </div>
          </div>

          {/* Contenido de la guía — SÍ se imprime */}
          <div id="guia-print-content" style={{ fontFamily: 'Arial, sans-serif', padding: 24, color: '#111' }}>

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
              <span>ABZEND Logistica</span>
              <span>Generado: {new Date().toLocaleString('es-MX')}</span>
              <span>Seguro: {order.has_insurance ? 'Sí' : 'No'}</span>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
