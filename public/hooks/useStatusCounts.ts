/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useCallback, useEffect, useState } from 'react';

export type EntityStatusValue = 'enabled' | 'disabled';

export const asEntityStatus = (value?: string): EntityStatusValue | undefined =>
  value === 'enabled' || value === 'disabled' ? value : undefined;

export interface StatusCounts {
  enabled: number;
  disabled: number;
}

export interface UseStatusCountsOptions {
  /** Skip fetching, e.g. while the tab that shows the table is hidden. */
  enabled?: boolean;
  /** Any change refetches, e.g. the integration page's own reload counter. */
  reloadTrigger?: unknown;
}

// Wazuh: the enabled/disabled split of a server-paginated table. It counts the whole
// table in its scope (space, integration), never the current search or filters, so
// `countByStatus` must not depend on them. Memoize it: a new function refetches.
export function useStatusCounts(
  countByStatus: (status: EntityStatusValue) => Promise<number>,
  { enabled = true, reloadTrigger }: UseStatusCountsOptions = {}
) {
  const [counts, setCounts] = useState<StatusCounts | undefined>(undefined);
  // Starts loading when enabled, so the first paint shows the spinner, not nothing.
  const [loading, setLoading] = useState(enabled);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([countByStatus('enabled'), countByStatus('disabled')])
      .then(([enabledCount, disabledCount]) => {
        if (!cancelled) {
          setCounts({ enabled: enabledCount, disabled: disabledCount });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCounts(undefined);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [countByStatus, enabled, reloadTrigger, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return { counts, loading, reload };
}

// Wazuh: the same split for an in-memory table, from every loaded item.
export const countStatuses = <T>(items: T[], isEnabled: (item: T) => boolean): StatusCounts =>
  items.reduce(
    (acc, item) => {
      if (isEnabled(item)) {
        acc.enabled += 1;
      } else {
        acc.disabled += 1;
      }
      return acc;
    },
    { enabled: 0, disabled: 0 }
  );
