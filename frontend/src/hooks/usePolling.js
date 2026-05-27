import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * usePolling — Repeatedly calls fetchFn every intervalMs while mounted.
 * @param {Function} fetchFn - Async function that returns data
 * @param {number} intervalMs - Polling interval in milliseconds
 * @returns {{ data, isLoading, error, refetch }}
 */
export const usePolling = (fetchFn, intervalMs = 3000) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const isMountedRef = useRef(true);

  const execute = useCallback(async () => {
    try {
      const result = await fetchFn();
      if (isMountedRef.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message || 'Polling error');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [fetchFn]);

  useEffect(() => {
    isMountedRef.current = true;

    // Initial fetch
    execute();

    // Set up polling interval
    intervalRef.current = setInterval(execute, intervalMs);

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [execute, intervalMs]);

  return { data, isLoading, error, refetch: execute };
};
