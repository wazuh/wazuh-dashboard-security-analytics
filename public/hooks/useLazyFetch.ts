/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useCallback, useEffect, useState } from 'react';

export function useLazyFetch<T>(
  fetchFn: (() => Promise<T | undefined>) | null,
  notFoundMessage: string
): { data: T | undefined; loading: boolean; error: string | undefined } {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(fetchFn !== null);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (fetchFn === null) {
      setLoading(false);
      setData(undefined);
      setError(undefined);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    setData(undefined);
    fetchFn()
      .then((result) => {
        if (cancelled) return;
        if (result == null) setError(notFoundMessage);
        else setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? 'Failed to load.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchFn, notFoundMessage]);

  return { data, loading, error };
}
