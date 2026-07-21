import { useState, useEffect, useCallback } from 'react';
import { createClient } from '../lib/supabase';

export type OrderType = 'PAQUETERIA' | 'LTL' | 'FTL';

export interface OrderEvent {
  id: string;
  timestamp: string;
  status: string;
  status_code: string | null;
  note: string | null;
  lat: number | null;
  lng: number | null;
}

export interface ProofOfDelivery {
  delivered_at: string | null;
  photo_url: string | null;
  signature_url: string | null;
  delivery_note: string | null;
}

export interface FTLDetail {
  ruta: string;
  unidad: string;
  tarifa_base: number;
  maniobra: boolean;
  reparto: boolean;
  incluye_flete_falso: boolean;
  maniobra_monto: number;
  reparto_monto: number;
  flete_falso_monto: number | null;
  total_estimado: number;
}

export interface GuideDetailData {
  order_type: OrderType;
  tracking_code: string;
  status: string;
  created_at: string;
  service_type: string | null;
  origin: { address: string } | null;
  destination: { address: string } | null;
  weight_kg: number | null;
  estimated_delivery: string | null;
  driver: { name: string } | null;
  ftl: FTLDetail | null;
  events: OrderEvent[];
  proof_of_delivery: ProofOfDelivery | null;
}

export function useGuideDetail(trackingCode: string | null) {
  const [data, setData] = useState<GuideDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!trackingCode || trackingCode.trim() === '') {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        setError('Authentication required. Please sign in.');
        setLoading(false);
        return;
      }

      const backendUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!backendUrl) {
        setError('Backend URL is not configured.');
        setLoading(false);
        return;
      }

      const url = `${backendUrl}/orders/${encodeURIComponent(trackingCode)}/detail`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Session expired. Please sign in again.');
        } else if (response.status === 403) {
          setError('You do not have permission to view this order.');
        } else if (response.status === 404) {
          setError('Order not found. Please check the tracking code.');
        } else {
          setError(`Failed to fetch order details. Status: ${response.status}`);
        }
        setLoading(false);
        return;
      }

      const result: GuideDetailData = await response.json();
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [trackingCode]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { data, loading, error, refetch: fetchDetail };
}
