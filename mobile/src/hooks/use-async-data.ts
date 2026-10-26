/**
 * `useAsyncData` — the data-loading hook used by every list screen.
 *
 * It owns the three states a screen has to handle — loading, error and
 * loaded — plus a `reload` for the pull-to-refresh gesture. The fetch is
 * cancelled when the screen unmounts, so a slow answer never lands on a
 * screen the visitor has already left.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncDataState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  /** Re-run the fetch. */
  reload: () => void;
  /** Replace the data locally, e.g. after a mutation. */
  setData: (updater: T | ((current: T | null) => T | null)) => void;
}

export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = [],
): AsyncDataState<T> {
  const [data, setDataState] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Guards against a late answer overwriting a newer one. */
  const requestId = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    const id = requestId.current + 1;
    requestId.current = id;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      if (!mounted.current || requestId.current !== id) return;
      setDataState(result);
    } catch (caught) {
      if (!mounted.current || requestId.current !== id) return;
      setError(
        caught instanceof Error ? caught.message : 'Không tải được dữ liệu. Vui lòng thử lại.',
      );
    } finally {
      if (mounted.current && requestId.current === id) {
        setIsLoading(false);
      }
    }
    // The fetcher is intentionally re-created by the caller; `deps` is the
    // real dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void load();
  }, [load]);

  const setData = useCallback((updater: T | ((current: T | null) => T | null)) => {
    setDataState((current) =>
      typeof updater === 'function' ? (updater as (c: T | null) => T | null)(current) : updater,
    );
  }, []);

  return { data, isLoading, error, reload: load, setData };
}
