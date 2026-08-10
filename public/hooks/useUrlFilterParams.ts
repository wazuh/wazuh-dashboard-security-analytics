/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

export type FilterParamName = 'query' | 'status' | 'integration' | 'page';

export interface UrlFilterConfig {
  /** Params this table opts into. 'page' should only be included for server-paginated tables. */
  params: FilterParamName[];
  /** Params written 300ms after the last change instead of immediately. Default: ['query']. */
  debouncedParams?: FilterParamName[];
  /** Params whose change resets 'page' back to 1. Default: ['query', 'status', 'integration']. */
  resetPageOn?: FilterParamName[];
}

export interface UrlFilterState {
  values: Record<FilterParamName, string>;
  page: number;
  setParams: (patch: Partial<Record<FilterParamName, string | undefined>>) => void;
  setPage: (page1Based: number) => void;
  clearParam: (name: FilterParamName) => void;
}

const DEBOUNCE_MS = 300;
const DEFAULT_DEBOUNCED_PARAMS: FilterParamName[] = ['query'];
const DEFAULT_RESET_PAGE_ON: FilterParamName[] = ['query', 'status', 'integration'];

const readValues = (search: string, params: FilterParamName[]): Record<FilterParamName, string> => {
  const parsed = new URLSearchParams(search);
  return params.reduce((acc, name) => {
    if (name === 'page') return acc;
    acc[name] = parsed.get(name) ?? '';
    return acc;
  }, {} as Record<FilterParamName, string>);
};

const readPage = (search: string, hasPage: boolean): number => {
  if (!hasPage) return 1;
  const raw = new URLSearchParams(search).get('page');
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
};

// Wazuh: single map-aware URL-state hook. Owns every filter/pagination param for a
// table so every write is one `history.replace` (never racing sibling writers), and
// unlisted params (e.g. `space`) always survive untouched.
export const useUrlFilterParams = (cfg: UrlFilterConfig): UrlFilterState => {
  const location = useLocation();
  const history = useHistory();
  const hasPage = cfg.params.includes('page');
  const debouncedParams = cfg.debouncedParams ?? DEFAULT_DEBOUNCED_PARAMS;
  const resetPageOn = cfg.resetPageOn ?? DEFAULT_RESET_PAGE_ON;

  const [values, setValues] = useState<Record<FilterParamName, string>>(() =>
    readValues(location.search, cfg.params)
  );
  const [page, setPageState] = useState<number>(() => readPage(location.search, hasPage));
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return history.listen((loc) => {
      setValues(readValues(loc.search, cfg.params));
      setPageState(readPage(loc.search, hasPage));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const writeToUrl = useCallback(
    (patch: Partial<Record<FilterParamName, string | undefined>>, resetPage: boolean) => {
      const params = new URLSearchParams(location.search);
      Object.entries(patch).forEach(([key, value]) => {
        if (key === 'page') return;
        if (value === undefined || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      if (resetPage && hasPage) {
        params.delete('page');
      }
      history.replace({ ...location, search: params.toString() });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [location, hasPage]
  );

  const setParams = useCallback(
    (patch: Partial<Record<FilterParamName, string | undefined>>) => {
      const patchedNames = Object.keys(patch) as FilterParamName[];
      const shouldResetPage = patchedNames.some((name) => resetPageOn.includes(name));

      setValues((prev) => {
        const next = { ...prev };
        patchedNames.forEach((name) => {
          if (name === 'page') return;
          next[name] = patch[name] ?? '';
        });
        return next;
      });
      if (shouldResetPage && hasPage) {
        setPageState(1);
      }

      const isDebounced = patchedNames.every((name) => debouncedParams.includes(name));

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }

      if (isDebounced) {
        debounceTimer.current = setTimeout(() => {
          writeToUrl(patch, shouldResetPage);
        }, DEBOUNCE_MS);
      } else {
        writeToUrl(patch, shouldResetPage);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [writeToUrl, resetPageOn, debouncedParams, hasPage]
  );

  const setPage = useCallback(
    (page1Based: number) => {
      if (!hasPage) {
        // eslint-disable-next-line no-console
        console.warn('useUrlFilterParams: setPage called but "page" is not an opted-in param');
        return;
      }
      const safePage = Number.isFinite(page1Based) && page1Based >= 1 ? page1Based : 1;
      setPageState(safePage);
      const params = new URLSearchParams(location.search);
      params.set('page', String(safePage));
      history.replace({ ...location, search: params.toString() });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [location, hasPage]
  );

  const clearParam = useCallback(
    (name: FilterParamName) => {
      setParams({ [name]: undefined });
    },
    [setParams]
  );

  return useMemo(
    () => ({ values, page, setParams, setPage, clearParam }),
    [values, page, setParams, setPage, clearParam]
  );
};
