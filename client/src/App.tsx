import { useState, useEffect } from 'react';

interface HealthData {
  status: string;
  database: string;
  message?: string;
}

export default function App() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  async function checkHealth() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/health');
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || `Health check failed with HTTP ${res.status}`);
      }
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reach API server');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#161311] text-[#F3EBDD]">
      <div className="w-full max-w-md p-8 rounded-md bg-[#25201C] border border-[#3A332C] shadow-lg">
        <div className="flex items-center justify-between border-b border-[#3A332C] pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#F3EBDD]">
              Wayfarer<span className="text-[#D9694A]">.</span>
            </h1>
            <p className="text-xs text-[#8F8374] mt-1">Honest ratings, fair bookings</p>
          </div>
          <span className="text-xs font-semibold px-2 py-1 rounded bg-[#302A25] text-[#9BAE7F] uppercase tracking-wider">
            Slice 0
          </span>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm py-2 px-3 rounded bg-[#1D1916] border border-[#3A332C]">
            <span className="text-[#C9BDAA]">API Status:</span>
            {loading ? (
              <span className="text-[#8F8374] animate-pulse">Checking...</span>
            ) : error ? (
              <span className="text-[#E5707E] font-medium">Offline</span>
            ) : (
              <span className="text-[#9BAE7F] font-semibold">API: {data?.status}</span>
            )}
          </div>

          <div className="flex items-center justify-between text-sm py-2 px-3 rounded bg-[#1D1916] border border-[#3A332C]">
            <span className="text-[#C9BDAA]">PostgreSQL 18:</span>
            {loading ? (
              <span className="text-[#8F8374] animate-pulse">Connecting...</span>
            ) : error ? (
              <span className="text-[#E5707E] font-medium">Disconnected</span>
            ) : (
              <span className="text-[#9BAE7F] font-semibold">DB: {data?.database}</span>
            )}
          </div>

          {error && (
            <div className="p-3 rounded bg-[#2a1719] border border-[#E5707E] text-[#E5707E] text-xs">
              <p className="font-semibold mb-1">Health check error:</p>
              <p className="font-mono break-all">{error}</p>
            </div>
          )}

          {!loading && !error && data && (
            <div className="p-3 rounded bg-[#1f241a] border border-[#9BAE7F] text-[#9BAE7F] text-xs">
              Project foundation healthy. Walking skeleton ready for Slice 1.
            </div>
          )}

          <button
            onClick={checkHealth}
            disabled={loading}
            className="w-full mt-4 py-2 px-4 rounded bg-[#D9694A] hover:bg-[#E27B5E] text-[#161311] font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Refreshing...' : 'Re-check Health'}
          </button>
        </div>
      </div>
    </main>
  );
}

