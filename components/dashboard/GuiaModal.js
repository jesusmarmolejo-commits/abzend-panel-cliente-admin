'use client';

import { useState } from 'react';
import GuiaLabel, { bultosTotal } from './GuiaLabel';

export default function GuiaModal({ order, onClose }) {
  const bultos = order?.bultos || [];
  const totalBultos = bultosTotal(bultos);
  const [copies, setCopies] = useState(totalBultos > 0 ? totalBultos : 1);

  if (!order) return null;

  const nCopies = Math.max(1, parseInt(copies, 10) || 1);

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
            box-sizing: border-box !important;
          }
        }
      `}</style>

      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-auto">

          {/* Header de la modal — no se imprime */}
          <div className="flex flex-wrap justify-between items-center gap-3 px-6 py-4 border-b border-gray-100 print:hidden">
            <h2 className="text-base font-bold text-gray-900">Guía de Envío</h2>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-600">
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

          {/* Contenido imprimible — se repite segun "Etiquetas a imprimir" */}
          <div id="guia-print-content" style={{ fontFamily: 'Arial, sans-serif' }}>
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
        </div>
      </div>
    </>
  );
}
