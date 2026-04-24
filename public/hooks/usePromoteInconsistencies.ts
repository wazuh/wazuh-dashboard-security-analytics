/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useMemo } from 'react';
import { GetPromoteBySpaceResponse, PromoteChangeGroup } from '../../types';
import { MANDATORY_PROMOTE_ENTITIES, SelectedMap } from './usePromoteSelection';

/**
 * Bidirectional dependency map used to detect risky partial selections.
 * See PromoteIntegration container for the semantic model.
 */
export const PROMOTE_DEPENDENCY_CHAIN: Record<string, readonly string[]> = {
  integrations: ['decoders', 'kvdbs', 'filters', 'rules'],
  decoders: ['integrations'],
  kvdbs: ['integrations'],
  filters: ['integrations', 'decoders'],
  rules: ['integrations', 'decoders', 'kvdbs'],
};

export type IntegrationChildrenMap = Record<
  string,
  { title: string; decoders: string[]; rules: string[]; kvdbs: string[] }
>;

export interface PromoteInconsistency {
  parent: string;
  parentTitle?: string;
  dep: string;
  missingNames: string[];
}

const getName = (
  promoteData: GetPromoteBySpaceResponse['response'],
  entity: string,
  id: string
) => {
  const strippedId = id.replace(/^\w_/, '');
  const available = promoteData.available_promotions?.[entity as PromoteChangeGroup];
  return available?.[id] ?? available?.[strippedId] ?? id;
};

/**
 * Detects items whose promotion would leave broken references in the target
 * space. Uses the integration→children map when available (precise mode) and
 * falls back to the coarse dependency chain for groups without a mapping
 * (e.g. filters).
 */
export function usePromoteInconsistencies(
  promoteData: GetPromoteBySpaceResponse['response'],
  selected: SelectedMap,
  integrationChildren: IntegrationChildrenMap
): PromoteInconsistency[] {
  return useMemo(() => {
    const out: PromoteInconsistency[] = [];

    const integrationsInDiff = new Set(
      (promoteData.promote?.changes?.integrations ?? []).map((i) => i.id)
    );
    const selectedIntegrations = selected.integrations ?? new Set<string>();

    // Forward: each selected integration's children that are in the diff
    // but not selected.
    for (const intId of selectedIntegrations) {
      const children = integrationChildren?.[intId];
      if (!children) continue;
      const childGroups: Array<{ group: 'decoders' | 'rules' | 'kvdbs'; ids: string[] }> = [
        { group: 'decoders', ids: children.decoders },
        { group: 'rules', ids: children.rules },
        { group: 'kvdbs', ids: children.kvdbs },
      ];
      for (const { group, ids } of childGroups) {
        const diffIds = new Set(
          (promoteData.promote?.changes?.[group as PromoteChangeGroup] ?? []).map((i) => i.id)
        );
        const selectedSet = selected[group] ?? new Set<string>();
        const missingInDiff = ids.filter((id) => diffIds.has(id) && !selectedSet.has(id));
        if (missingInDiff.length > 0) {
          out.push({
            parent: 'integrations',
            parentTitle: children.title,
            dep: group,
            missingNames: missingInDiff.map((id) => getName(promoteData, group, id)),
          });
        }
      }
    }

    // Reverse: selected children whose parent integration is in the diff but
    // not selected.
    const childToIntegration: Record<string, Record<string, { id: string; title: string }>> = {
      decoders: {},
      rules: {},
      kvdbs: {},
    };
    for (const [intId, meta] of Object.entries(integrationChildren ?? {})) {
      for (const dId of meta.decoders)
        childToIntegration.decoders[dId] = { id: intId, title: meta.title };
      for (const rId of meta.rules)
        childToIntegration.rules[rId] = { id: intId, title: meta.title };
      for (const kId of meta.kvdbs)
        childToIntegration.kvdbs[kId] = { id: intId, title: meta.title };
    }
    const orphanParents: Record<string, Set<string>> = {};
    for (const group of ['decoders', 'rules', 'kvdbs'] as const) {
      const selectedSet = selected[group] ?? new Set<string>();
      for (const childId of selectedSet) {
        const parent = childToIntegration[group][childId];
        if (!parent) continue;
        if (integrationsInDiff.has(parent.id) && !selectedIntegrations.has(parent.id)) {
          if (!orphanParents[parent.id]) orphanParents[parent.id] = new Set();
          orphanParents[parent.id].add(parent.title);
        }
      }
    }
    for (const [, titles] of Object.entries(orphanParents)) {
      out.push({
        parent: 'decoders/rules/kvdbs',
        parentTitle: 'selected children',
        dep: 'integrations',
        missingNames: Array.from(titles),
      });
    }

    // Coarse fallback for groups with no integration mapping (filters don't
    // live under integration documents).
    for (const parent of Object.keys(PROMOTE_DEPENDENCY_CHAIN)) {
      if (MANDATORY_PROMOTE_ENTITIES.has(parent)) continue;
      if (parent !== 'filters') continue; // precise path handles the rest
      const parentSelected = (selected[parent]?.size ?? 0) > 0;
      if (!parentSelected) continue;
      for (const dep of PROMOTE_DEPENDENCY_CHAIN[parent]) {
        const depItems = promoteData.promote?.changes?.[dep as PromoteChangeGroup] ?? [];
        if (depItems.length === 0) continue;
        const depSelected = selected[dep] ?? new Set<string>();
        const missing = depItems.filter((item) => !depSelected.has(item.id));
        if (missing.length > 0) {
          out.push({
            parent,
            dep,
            missingNames: missing.map((item) => getName(promoteData, dep, item.id)),
          });
        }
      }
    }

    return out;
  }, [selected, promoteData, integrationChildren]);
}
