/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useMemo, useState } from 'react';
import { PROMOTE_ENTITIES_ORDER } from '../utils/constants';
import { GetPromoteBySpaceResponse, PromoteChangeGroup, PromoteChanges } from '../../types';

export type SelectedMap = Record<string, Set<string>>;

/**
 * Entities that are promoted unconditionally (no checkbox in the UI). Policy
 * represents the space itself and always travels with the selected changes.
 */
export const MANDATORY_PROMOTE_ENTITIES: ReadonlySet<string> = new Set(['policy']);

/**
 * Manages the set of items the user has chosen to promote. Encapsulates all
 * toggle logic (per-item, per-group, global select/deselect) and derives the
 * PromoteChanges payload to send to the backend.
 */
export function usePromoteSelection(promoteData: GetPromoteBySpaceResponse['response']) {
  const [selected, setSelected] = useState<SelectedMap>(() => {
    const init: SelectedMap = {};
    PROMOTE_ENTITIES_ORDER.forEach((entity) => {
      const items = promoteData.promote?.changes?.[entity as PromoteChangeGroup] ?? [];
      init[entity] = new Set(items.map((item) => item.id));
    });
    return init;
  });

  const toggleItem = (entity: PromoteChangeGroup, id: string) => {
    if (MANDATORY_PROMOTE_ENTITIES.has(entity)) return;
    setSelected((prev) => {
      const nextSet = new Set(prev[entity] ?? []);
      if (nextSet.has(id)) {
        nextSet.delete(id);
      } else {
        nextSet.add(id);
      }
      return { ...prev, [entity]: nextSet };
    });
  };

  const toggleAll = (entity: PromoteChangeGroup) => {
    if (MANDATORY_PROMOTE_ENTITIES.has(entity)) return;
    setSelected((prev) => {
      const items = promoteData.promote?.changes?.[entity as PromoteChangeGroup] ?? [];
      const prevSet = prev[entity] ?? new Set<string>();
      const allSelected = items.length > 0 && items.every((item) => prevSet.has(item.id));
      const nextSet = allSelected ? new Set<string>() : new Set(items.map((item) => item.id));
      return { ...prev, [entity]: nextSet };
    });
  };

  const selectAllGlobal = () => {
    setSelected((prev) => {
      const next: SelectedMap = { ...prev };
      PROMOTE_ENTITIES_ORDER.forEach((entity) => {
        if (MANDATORY_PROMOTE_ENTITIES.has(entity)) return;
        const items = promoteData.promote?.changes?.[entity as PromoteChangeGroup] ?? [];
        next[entity] = new Set(items.map((item) => item.id));
      });
      return next;
    });
  };

  const deselectAllGlobal = () => {
    setSelected((prev) => {
      const next: SelectedMap = { ...prev };
      PROMOTE_ENTITIES_ORDER.forEach((entity) => {
        if (MANDATORY_PROMOTE_ENTITIES.has(entity)) return;
        next[entity] = new Set<string>();
      });
      return next;
    });
  };

  const selectedChanges = useMemo(() => {
    const out = {} as PromoteChanges;
    PROMOTE_ENTITIES_ORDER.forEach((entity) => {
      const items = promoteData.promote?.changes?.[entity as PromoteChangeGroup] ?? [];
      const sel = selected[entity] ?? new Set<string>();
      (out as any)[entity] = items.filter((item) => sel.has(item.id));
    });
    return out;
  }, [selected, promoteData]);

  const selectedPromoteData = useMemo(
    () => ({
      ...promoteData,
      promote: { ...promoteData.promote, changes: selectedChanges },
    }),
    [promoteData, selectedChanges]
  );

  const hasPromotions = Object.values(promoteData.promote.changes).some(
    (items) => items.length > 0
  );

  // Policy alone doesn't enable the Promote button — the user must have
  // selected at least one item from a non-mandatory group.
  const hasSelected = PROMOTE_ENTITIES_ORDER.some(
    (entity) =>
      !MANDATORY_PROMOTE_ENTITIES.has(entity) && ((selectedChanges as any)[entity]?.length ?? 0) > 0
  );

  return {
    selected,
    toggleItem,
    toggleAll,
    selectAllGlobal,
    deselectAllGlobal,
    selectedChanges,
    selectedPromoteData,
    hasPromotions,
    hasSelected,
  };
}
