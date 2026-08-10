/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useCallback, useEffect, useState } from 'react';
import { NotificationsStart } from 'opensearch-dashboards/public';
import { DataStore } from '../../store/DataStore';
import { errorNotificationToast } from '../../utils/helpers';

export interface IntegrationOption {
  value: string;
  label: string;
  id: string;
}

interface UseIntegrationSelectorParams {
  notifications: NotificationsStart;
  enabled?: boolean;
  /** Space to scope the integration list to (e.g. 'draft', 'standard', a custom space). */
  space?: string;
}

export function useIntegrationSelector({
  notifications,
  enabled = true,
  space,
}: UseIntegrationSelectorParams) {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<IntegrationOption[]>([]);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setLoading(true);

    // Wazuh: scope the list to the currently selected space — this previously
    // always called the "draft" integrations endpoint regardless of `space`, so
    // switching spaces kept showing the draft space's integrations verbatim.
    DataStore.integrations
      .listIntegrationOptions(space ?? 'draft')
      .then((result) => {
        if (!cancelled) {
          setOptions(
            result.map((option: any) => ({
              value: String(option?.document?.metadata?.title ?? ''),
              label: String(option?.document?.metadata?.title ?? ''),
              id: String(option?.id ?? ''),
            }))
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          errorNotificationToast(
            notifications,
            'retrieve',
            'integration types',
            'There was an error retrieving the integration types.'
          );
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
  }, [notifications, enabled, space, refreshCount]);

  const refresh = useCallback(() => setRefreshCount((c) => c + 1), []);

  return { loading, options, refresh };
}
