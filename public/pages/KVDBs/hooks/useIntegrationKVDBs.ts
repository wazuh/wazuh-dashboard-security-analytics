/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { DataStore } from "../../../store/DataStore";
import { KVDBTableItem } from "../../Integrations/components/IntegrationKVDBs";

export interface useIntegrationKVDBsParams {
  kvdbIds: string[];
}

export function useIntegrationKVDBs({ kvdbIds }: useIntegrationKVDBsParams) {
  const [items, setItems] = useState<KVDBTableItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    if (kvdbIds.length === 0) {
      setItems([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    DataStore.kvdbs
      .searchKVDBs({
        query: { terms: { "document.id": kvdbIds } },
        size: Math.min(kvdbIds.length, 10000),
        track_total_hits: true,
      })
      .then((response) => {
        if (!cancelled) {
          setItems(
            response.items.map((item) => ({
              id: item.id,
              title: item.document?.title,
              author: item.document?.author,
            })),
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
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
  }, [kvdbIds, reloadTrigger]);

  const refresh = useCallback(() => {
    setReloadTrigger((prev) => prev + 1);
  }, []);

  return { items, loading, refresh };
}
