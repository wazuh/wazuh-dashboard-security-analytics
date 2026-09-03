/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { NotificationsStart } from 'opensearch-dashboards/public';
import { DataStore } from '../../../store/DataStore';
import { Integration, IntegrationItem } from '../../../../types';
import { errorNotificationToast } from '../../../utils/helpers';

/**
 * Owns the integration document the whole details page derives from, so
 * a Refresh can invalidate it at its source instead of re-running one tab's
 * query against a stale id list
 */
export interface UseIntegrationDetailsResult {
  integration?: IntegrationItem;
  reloadTrigger: number;
  loading: boolean;
  notFound: boolean;
  refresh: () => Promise<void>;
  setIntegration: (integration: IntegrationItem) => void;
}

interface IntegrationState {
  integration?: IntegrationItem;
  reloadTrigger: number;
}

const withCounts = (details: Integration): IntegrationItem => ({
  ...details,
  detectionRulesCount: details.document?.rules?.length ?? 0,
  decodersCount: details.document.decoders?.length ?? 0,
  kvdbsCount: details.document.kvdbs?.length ?? 0,
});

export function useIntegrationDetails(
  integrationId: string,
  space: string | undefined,
  notifications?: NotificationsStart
): UseIntegrationDetailsResult {
  const isMountedRef = useRef(true);
  const [state, setState] = useState<IntegrationState>({
    integration: undefined,
    reloadTrigger: 0,
  });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // `hasIntegrationRef` mirrors the loaded document without making `load` depend
  // on it — a refresh must be able to tell "nothing was ever loaded" (first
  // load: surface not-found) from "a reload failed" (keep what is on screen).
  const hasIntegrationRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const details = await DataStore.integrations.getIntegration(integrationId, space);

      if (!isMountedRef.current) {
        return;
      }

      if (!details) {
        // A reload that comes back empty must never blank a working page: the
        // store cannot tell a failed request from a deleted integration, so the
        // safe reading is "could not refresh".
        if (hasIntegrationRef.current) {
          errorNotificationToast(notifications ?? null, 'refresh', 'integration');
          return;
        }
        setNotFound(true);
        return;
      }

      hasIntegrationRef.current = true;
      setNotFound(false);
      setState((previous) => ({
        integration: withCounts(details),
        reloadTrigger: previous.reloadTrigger + 1,
      }));
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [integrationId, space, notifications]);

  useEffect(() => {
    load();
  }, [load]);

  // A local write (edit, enable/disable) replaces the document, so it bumps the
  // trigger too — the tabs must re-query against whatever the new document says.
  const setIntegration = useCallback((integration: IntegrationItem) => {
    hasIntegrationRef.current = true;
    setState((previous) => ({ integration, reloadTrigger: previous.reloadTrigger + 1 }));
  }, []);

  return {
    integration: state.integration,
    reloadTrigger: state.reloadTrigger,
    loading,
    notFound,
    refresh: load,
    setIntegration,
  };
}
