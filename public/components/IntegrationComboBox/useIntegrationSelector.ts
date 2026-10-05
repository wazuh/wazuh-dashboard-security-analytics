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
  /**
   * Exclude integrations with no document.<relatedField> — e.g. 'decoders' on the
   * Decoders page — since filtering by one would always resolve to zero results.
   * Omit for form contexts (creating/editing a resource), which need every
   * integration regardless of what it's currently related to.
   */
  relatedField?: 'decoders' | 'rules' | 'kvdbs';
}

export function useIntegrationSelector({
  notifications,
  enabled = true,
  space,
  relatedField,
}: UseIntegrationSelectorParams) {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<IntegrationOption[]>([]);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setLoading(true);

    DataStore.integrations
      .listIntegrationOptions(space ?? 'draft', relatedField)
      .then((result) => {
        if (!cancelled) {
          setOptions(
            result.map((item) => ({
              value: item.title,
              label: item.title,
              id: item.id,
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
  }, [notifications, enabled, space, relatedField, refreshCount]);

  const refresh = useCallback(() => setRefreshCount((c) => c + 1), []);

  return { loading, options, refresh };
}
