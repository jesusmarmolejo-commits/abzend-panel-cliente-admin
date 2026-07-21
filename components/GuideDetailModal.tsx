import React, { useState } from 'react';
import { useGuideDetail } from '../hooks/useGuideDetail';
import {
  Truck,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Camera,
  Download,
  X,
  ChevronRight,
} from 'lucide-react';

interface GuideDetailModalProps {
  trackingCode: string;
  isOpen: boolean;
  onClose: () => void;
}

const fmtDate = (d: string | null): string =>
  d ? new Date(d).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '-';

const fmtMoney = (n: number): string =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  assigned: 'bg-blue-100 text-blue-700',
  picked_up: 'bg-blue-100 text-blue-700',
  in_transit: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  failed: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-red-100 text-red-700',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  assigned: 'Asignado',
  picked_up: 'Recogido',
  in_transit: 'En transito',
  delivered: 'Entregado',
  failed: 'Intento fallido',
  cancelled: 'Cancelado',
};

const typeColors: Record<string, string> = {
  PAQUETERIA: 'bg-blue-100 text-blue-700',
  LTL: 'bg-purple-100 text-purple-700',
  FTL: 'bg-teal-100 text-teal-700',
};

const GuideDetailModal: React.FC<GuideDetailModalProps> = ({ trackingCode, isOpen, onClose }) => {
  const { data: guide, loading, error } = useGuideDetail(isOpen ? trackingCode : null);
  const [fullPhoto, setFullPhoto] = useState<string | null>(null);

  if (!isOpen) return null;

  const renderTimeline = () => {
    if (!guide?.events || guide.events.length === 0) return null;
    const sortedEvents = [...guide.events].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Linea de tiempo</h3>
        <div className="space-y-0">
          {sortedEvents.map((event, idx) => {
            const isLatest = idx === 0;
            const circleColor =
              event.status === 'delivered'
                ? 'text-green-500'
                : event.status === 'failed' || event.status === 'cancelled'
                ? 'text-red-500'
                : 'text-blue-500';
            return (
              <div
                key={event.id || idx}
                className={`relative flex items-start gap-3 p-3 rounded-lg border ${
                  isLatest ? 'bg-blue-50 border-blue-200' : 'border-transparent'
                }`}
              >
                <div className="flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${circleColor}`}>
                    {event.status === 'delivered' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : event.status === 'failed' || event.status === 'cancelled' ? (
                      <XCircle className="w-5 h-5" />
                    ) : (
                      <Clock className="w-5 h-5" />
                    )}
                  </div>
                  {idx < sortedEvents.length - 1 && (
                    <div className="w-0.5 h-6 bg-gray-200 mt-1" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500">{fmtDate(event.timestamp)}</p>
                  <p className="text-sm font-medium text-gray-900">
                    {statusLabels[event.status] || event.status}
                  </p>
                  {event.note && (
                    <p className="text-sm text-gray-600 mt-0.5">{event.note}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderProofOfDelivery = () => {
    if (!guide?.proof_of_delivery) return null;
    const pod = guide.proof_of_delivery;
    // Use lat/lng from the most recent event that has coordinates
    const lastEventWithCoords = guide.events
      .slice()
      .reverse()
      .find((e) => e.lat !== null && e.lng !== null);
    const lat = lastEventWithCoords?.lat;
    const lng = lastEventWithCoords?.lng;

    return (
      <div className="mt-6 border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Prueba de Entrega</h3>
        <div className="space-y-4">
          {pod.delivered_at && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">Entregado:</span> {fmtDate(pod.delivered_at)}
            </p>
          )}
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <p className="text-sm font-medium text-gray-700 mb-1">Foto</p>
              {pod.photo_url ? (
                <img
                  src={pod.photo_url}
                  alt="Foto de entrega"
                  className="rounded-lg w-full h-32 object-cover cursor-pointer"
                  onClick={() => setFullPhoto(pod.photo_url!)}
                />
              ) : (
                <div className="bg-gray-100 rounded-lg w-full h-32 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-[200px]">
              <p className="text-sm font-medium text-gray-700 mb-1">Firma</p>
              {pod.signature_url ? (
                <img
                  src={pod.signature_url}
                  alt="Firma"
                  className="border border-gray-200 bg-white rounded w-full h-32 object-contain"
                />
              ) : (
                <div className="border border-gray-200 bg-gray-50 rounded w-full h-32 flex items-center justify-center">
                  <p className="text-sm text-gray-400">Sin firma capturada</p>
                </div>
              )}
            </div>
          </div>
          {pod.delivery_note && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">Nota:</span> {pod.delivery_note}
            </p>
          )}
          {lat !== undefined && lat !== null && lng !== undefined && lng !== null && (
            <a
              href={`https://maps.google.com/?q=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-blue-600 hover:underline"
            >
              <MapPin className="w-4 h-4 mr-1" />
              Ver ubicacion
            </a>
          )}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm print:hidden"
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar PDF
          </button>
        </div>
      </div>
    );
  };

  const renderFTLPricing = () => {
    if (!guide?.ftl) return null;
    const p = guide.ftl;
    return (
      <div className="mt-6 border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Desglose de precios</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Flete base</span>
            <span className="text-gray-900">{fmtMoney(p.tarifa_base)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Maniobra</span>
            <span className="text-gray-900">
              {p.maniobra ? fmtMoney(p.maniobra_monto) : 'No incluye'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Reparto</span>
            <span className="text-gray-900">
              {p.reparto ? fmtMoney(p.reparto_monto) : 'No incluye'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Flete en falso (50%)</span>
            <span className="text-gray-900">
              {p.incluye_flete_falso && p.flete_falso_monto !== null
                ? fmtMoney(p.flete_falso_monto)
                : 'No aplica'}
            </span>
          </div>
          <div className="border-t border-gray-200 pt-2 mt-2">
            <div className="flex justify-between text-lg font-semibold">
              <span className="text-gray-900">Total</span>
              <span className="text-gray-900">{fmtMoney(p.total_estimado)}</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">Precios sin IVA</p>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-64 p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      );
    }

    if (!guide) return null;

    const isFTL = guide.order_type === 'FTL';

    return (
      <div className="guide-detail-printable p-6">
        {/* Print-only header */}
        <div className="hidden print:block mb-4">
          <h1 className="text-xl font-bold text-gray-900">ABZEND - Prueba de Entrega</h1>
          <p className="text-sm text-gray-600">{guide.tracking_code}</p>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-lg font-bold text-gray-900">
              {guide.tracking_code}
            </span>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                typeColors[guide.order_type] ?? 'bg-gray-100 text-gray-700'
              }`}
            >
              {isFTL ? 'FTL - Transporte Terrestre' : guide.order_type}
            </span>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                statusColors[guide.status] ?? 'bg-gray-100 text-gray-700'
              }`}
            >
              {statusLabels[guide.status] || guide.status}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full print:hidden"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Info section */}
        {isFTL ? (
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>{guide.ftl?.ruta ?? '-'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>{guide.ftl?.unidad ?? '-'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>Creado: {fmtDate(guide.created_at)}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-gray-700">
            {(guide.origin || guide.destination) && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="flex items-center gap-1">
                  {guide.origin?.address ?? '-'}
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                  {guide.destination?.address ?? '-'}
                </span>
              </div>
            )}
            <div className="flex flex-wrap gap-4">
              {guide.service_type && <span>Servicio: {guide.service_type}</span>}
              {guide.weight_kg !== null && guide.weight_kg !== undefined && (
                <span>Peso: {guide.weight_kg} kg</span>
              )}
              <span>Creado: {fmtDate(guide.created_at)}</span>
              <span>Entrega estimada: {fmtDate(guide.estimated_delivery)}</span>
              {guide.driver?.name && <span>Conductor: {guide.driver.name}</span>}
            </div>
          </div>
        )}

        {/* Timeline */}
        {renderTimeline()}

        {/* FTL Pricing */}
        {isFTL && renderFTLPricing()}

        {/* Proof of Delivery */}
        {renderProofOfDelivery()}

        {/* Full-screen photo overlay */}
        {fullPhoto && (
          <div
            className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
            onClick={() => setFullPhoto(null)}
          >
            <img
              src={fullPhoto}
              alt="Foto completa"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setFullPhoto(null)}
              className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg"
              aria-label="Cerrar foto"
            >
              <X className="w-6 h-6 text-gray-700" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .guide-detail-printable,
          .guide-detail-printable * { visibility: visible; }
          .guide-detail-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden { display: none !important; }
          .print\\:block  { display: block  !important; }
        }
      `}</style>
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    </>
  );
};

export default GuideDetailModal;
