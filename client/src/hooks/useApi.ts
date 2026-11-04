import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiError } from '../services/api.js';

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | Error | null;
  reload: () => void;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = []
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | Error | null>(null);

  // Track the current request ID to prevent race conditions on fast dependency changes
  const requestIdRef = useRef(0);

  const execute = useCallback(() => {
    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    fetcher()
      .then(result => {
        // Only update state if this is still the latest active request
        if (currentRequestId === requestIdRef.current) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(err => {
        if (currentRequestId === requestIdRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      });
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    execute();
  }, [execute]);

  return {
    data,
    loading,
    error,
    reload: execute
  };
}
