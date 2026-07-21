'use client';

import { useState, useCallback } from 'react';

export default function TrackingTab({ supabase }) {
  const [trackingCode, setTrackingCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [trackingData, setTrackingData] = useState(null);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).replace(',', ' at');
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_transit: 'bg-blue-100 text-blue-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      exception: 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleSearch = useCallback(async (e) => {
    e.preventDefault();
    if (!trackingCode.trim()) return;

    setLoading(true);
    setError(null);
    setTrackingData(null);

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), 10000)
    );

    try {
      const { data, error: rpcError } = await Promise.race([
        supabase.rpc('get_tracking', { p_tracking_code: trackingCode.trim() }),
        timeoutPromise
      ]);

      if (rpcError) throw rpcError;
      if (!data) throw new Error('Tracking not found');

      setTrackingData(data);
    } catch (err) {
      if (err.message === 'Request timeout') {
        setError('Request timed out. Please try again.');
      } else if (err.message === 'Tracking not found') {
        setError('No tracking information found for this code.');
      } else {
        setError(err.message || 'An error occurred while fetching tracking data.');
      }
    } finally {
      setLoading(false);
    }
  }, [trackingCode, supabase]);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={trackingCode}
            onChange={(e) => setTrackingCode(e.target.value)}
            placeholder="Enter tracking code"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent text-base"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !trackingCode.trim()}
            className="px-6 py-3 bg-[#4f46e5] text-white font-medium rounded-lg hover:bg-[#0a5a45] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Searching...
              </span>
            ) : (
              'Track'
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {loading && !trackingData && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4f46e5]"></div>
        </div>
      )}

      {trackingData && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Tracking Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-500">Origin</label>
                <p className="text-gray-900">{trackingData.origen_address || 'N/A'}</p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-500">Destination</label>
                <p className="text-gray-900">{trackingData.dest_address || 'N/A'}</p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-500">Recipient</label>
                <p className="text-gray-900">{trackingData.recipient_name || 'N/A'}</p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-500">Status</label>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(trackingData.status)}`}>
                  {trackingData.status || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {trackingData.order_events && trackingData.order_events.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>

              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                <div className="space-y-6">
                  {trackingData.order_events
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .map((event, index) => (
                      <div key={index} className="relative pl-10">
                        <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-[#185FA5] border-2 border-white shadow"></div>

                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(event.status_code)}`}>
                              {event.status_code}
                            </span>
                            <span className="text-sm text-gray-500">
                              {formatDate(event.created_at)}
                            </span>
                          </div>

                          {event.note && (
                            <p className="text-gray-700 text-sm mt-1">{event.note}</p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
