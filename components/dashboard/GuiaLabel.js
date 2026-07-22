'use client';

// Etiqueta imprimible de una guía, compartida por GuiaModal, /guia y /guia-batch.
// Recibe la orden y sus bultos; muestra el desglose de bultos y su total.

const BULTO_LABEL = {
  paquete: 'Paquete',
  totem: 'Totem',
  pallet: 'Pallet',
  tarima: 'Tarima',
  sobre: 'Sobre',
  otro: 'Otro',
};

export function bultosTotal(bultos) {
  return (bultos || []).reduce((n, b) => n + (parseInt(b.cantidad, 10) || 0), 0);
}

export default function GuiaLabel({ order, bultos = [], copyLabel, isLast = true }) {
  if (!order) return null;

  const tracking = order.tracking_code || '';
  const servicio = (order.service || 'standard').toUpperCase();
  const fecha = order.created_at
    ? new Date(order.created_at).toLocaleDateString('es-MX')
    : '—';
  const total = bultosTotal(bultos);

  return (
    <div style={{ padding: 24, color: '#111', pageBreakAfter: isLast ? 'auto' : 'always' }}>
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

      {/* Detalles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'TIPO', value: order.package_type || '—' },
          { label: 'BULTOS', value: total || '—' },
          { label: 'PESO', value: `${order.weight_kg || '—'} kg` },
          { label: 'FECHA', value: fecha },
        ].map(({ label, value }) => (
          <div key={label} style={{ border: '1px solid #ddd', borderRadius: 6, padding: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Detalle de bultos */}
      {bultos.length > 0 && (
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#4f46e5', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>
            Bultos ({total})
          </div>
          {bultos.map((b, i) => (
            <div key={b.id || i} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: i < bultos.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
              <span><strong>{b.cantidad || 1}×</strong> {BULTO_LABEL[b.tipo] || b.tipo}</span>
              <span style={{ color: '#666' }}>{b.descripcion || ''}</span>
            </div>
          ))}
        </div>
      )}

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
        <span>{copyLabel || `Generado: ${new Date().toLocaleString('es-MX')}`}</span>
        <span>Seguro: {order.has_insurance ? 'Sí' : 'No'}</span>
      </div>
    </div>
  );
}
