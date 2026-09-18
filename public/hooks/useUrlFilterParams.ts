/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { History } from 'history';

export type FilterParamName = 'query' | 'enabled' | 'integration' | 'level' | 'page';

export interface UrlFilterConfig {
  /** Params this table opts into. 'page' should only be included for server-paginated tables. */
  params: FilterParamName[];
  /** Params written 300ms after the last change instead of immediately. Default: ['query']. */
  debouncedParams?: FilterParamName[];
  /** Params whose change resets 'page' back to 1. Default: ['query', 'enabled', 'integration']. */
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
const DEFAULT_RESET_PAGE_ON: FilterParamName[] = ['query', 'enabled', 'integration'];

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

// Wazuh: single map-aware URL-state hook — every write is one `history.replace`
// (never racing sibling writers), unlisted params (e.g. `space`) survive untouched.
// `historyOverride` (a container's own `history` prop) bypasses `useHistory()`/
// `useLocation()`, which resolve incorrectly under this suite's global useContext mock.
export const useUrlFilterParams = (
  cfg: UrlFilterConfig,
  historyOverride?: History
): UrlFilterState => {
  const routerLocation = useLocation();
  const routerHistory = useHistory();
  const history = historyOverride ?? routerHistory;
  const location = historyOverride ? historyOverride.location : routerLocation;
  const hasPage = cfg.params.includes('page');
  const debouncedParams = cfg.debouncedParams ?? DEFAULT_DEBOUNCED_PARAMS;
  const resetPageOn = cfg.resetPageOn ?? DEFAULT_RESET_PAGE_ON;

  const [values, setValues] = useState<Record<FilterParamName, string>>(() =>
    readValues(location.search, cfg.params)
  );
  const [page, setPageState] = useState<number>(() => readPage(location.search, hasPage));
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Wazuh: latest managed values, for writeToUrl. On OSD's ScopedHistory,
  // `history.location.search` can still return the search from BEFORE an earlier
  // `replace()` hundreds of ms later, so a deferred write built from it dropped the
  // param that earlier write had added (a filter applied at once, then the debounced
  // `query` write erased it from the URL). Managed params come from here; only the
  // params this hook does not own (space, dataSourceId) are taken from the snapshot.
  const valuesRef = useRef(values);
  valuesRef.current = values;

  useEffect(() => {
    return history.listen((loc) => {
      setValues(readValues(loc.search, cfg.params));
      setPageState(readPage(loc.search, hasPage));
    });
  }, []);

  const writeToUrl = useCallback(
    (patch: Partial<Record<FilterParamName, string | undefined>>, resetPage: boolean) => {
      // Wazuh: read from `history.location` (live/mutable) rather than the `location`
      // captured at render time — another `history.replace` can land synchronously in
      // the same tick (e.g. a space-selector write right before `setPage`), and a
      // stale `location` snapshot would silently clobber it back out.
      const current = history.location;
      const params = new URLSearchParams(current.search);
      Object.entries(valuesRef.current).forEach(([name, latest]) => {
        if (latest) {
          params.set(name, latest);
        } else {
          params.delete(name);
        }
      });
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
      history.replace({ ...current, search: params.toString() });
    },
    [history, hasPage]
  );

  const setParams = useCallback(
    (patch: Partial<Record<FilterParamName, string | undefined>>) => {
      const patchedNames = Object.keys(patch) as FilterParamName[];
      const shouldResetPage = patchedNames.some((name) => resetPageOn.includes(name));

      // Wazuh: update the ref here, not only on render. Two writes can land in one
      // tick (a debounced free-text write and a filter write scheduled together): the
      // second is immediate and cancels the first's deferred URL write, so its
      // writeToUrl must already see the first's values or that param stays stale in
      // the URL.
      const next = { ...valuesRef.current };
      patchedNames.forEach((name) => {
        if (name === 'page') return;
        next[name] = patch[name] ?? '';
      });
      valuesRef.current = next;
      setValues(next);
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
      // Wazuh: read from `history.location` — see the comment in `writeToUrl`.
      const current = history.location;
      const params = new URLSearchParams(current.search);
      params.set('page', String(safePage));
      history.replace({ ...current, search: params.toString() });
    },
    [history, hasPage]
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
