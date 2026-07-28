/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useCallback, useRef } from 'react';

export interface ReconcileDeletedItemsArgs<T> {
  items: T[];
  total: number;
  pendingIds: ReadonlySet<string>;
  getId: (item: T) => string;
}

export interface ReconcileDeletedItemsResult<T> {
  items: T[];
  total: number;
  /** Only the pending ids still present in `items` — the rest have been released. */
  pendingIds: Set<string>;
}

/**
 * Pure state transition used to reconcile client-side "pending delete" ids
 * against a fresh fetch result. Filters out items whose id is still pending
 * (server hasn't caught up yet) and releases ids that are no longer present
 * in the fetch (server has caught up — self-heal).
 */
export function reconcileDeletedItems<T>({
  items,
  total,
  pendingIds,
  getId,
}: ReconcileDeletedItemsArgs<T>): ReconcileDeletedItemsResult<T> {
  if (pendingIds.size === 0) {
    return { items, total, pendingIds: new Set() };
  }

  const kept: T[] = [];
  const stillPresent = new Set<string>();

  for (const item of items) {
    const id = getId(item);
    if (pendingIds.has(id)) {
      stillPresent.add(id);
      continue;
    }
    kept.push(item);
  }

  const removed = items.length - kept.length;
  return { items: kept, total: Math.max(0, total - removed), pendingIds: stillPresent };
}

export interface UseDeleteReconciliationResult<T> {
  /** Wire directly to useDeleteItems' onDeleted. Referentially stable. */
  markDeleted: (ids: string[]) => void;
  /** Apply to a fetch result before committing it to state. Referentially stable. */
  reconcile: (items: T[], total: number) => { items: T[]; total: number };
}

export function useDeleteReconciliation<T>(
  getId: (item: T) => string
): UseDeleteReconciliationResult<T> {
  const pendingIdsRef = useRef<Set<string>>(new Set());
  const getIdRef = useRef(getId);
  getIdRef.current = getId;

  const markDeleted = useCallback((ids: string[]) => {
    ids.forEach((id) => pendingIdsRef.current.add(id));
  }, []);

  const reconcile = useCallback((items: T[], total: number) => {
    const result = reconcileDeletedItems({
      items,
      total,
      pendingIds: pendingIdsRef.current,
      getId: getIdRef.current,
    });
    pendingIdsRef.current = result.pendingIds;
    return { items: result.items, total: result.total };
  }, []);

  return { markDeleted, reconcile };
}
