/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

// Wazuh: URL-state adapter for EuiInMemoryTable-based pages (Detectors, Filters,
// Integrations). These pages already read/write `history.location.search` directly
// (no useUrlFilterParams/react-router hooks — see Integrations.tsx's own
// `history.replace(path + history.location.search)`), so this adapter follows the
// same prop-driven pattern instead of requiring Router context.

export interface InMemoryUrlFilterValues {
  query: string;
  status: string;
}

const buildStatusTokenRegex = (field: string) => new RegExp(`(?:^|\\s)${field}:(\\S+)`, 'i');

// Wazuh: EuiSearchBar's free-text `query.text` embeds structured field clauses
// (e.g. "aws status:enabled" or "aws enabled:true", depending on the page's own
// filter field name) when box.schema is enabled. Split it back into the plain
// free-text part and the status value, so both can be persisted as separate URL
// params (`query`, `status`) like the server-paginated tables. `field` defaults to
// 'status' (Detectors) — Filters/Integrations pass 'enabled' (their existing
// boolean filter field).
export const splitStatusFromQueryText = (
  text: string,
  field: string = 'status'
): InMemoryUrlFilterValues => {
  const regex = buildStatusTokenRegex(field);
  const match = text.match(regex);
  const status = match ? match[1] : '';
  const query = text.replace(regex, '').trim();
  return { query, status };
};

// Wazuh: inverse of splitStatusFromQueryText — recombine query + status into the
// text EuiSearchBar.Query.parse expects, to seed `search.defaultQuery` on mount.
export const buildQueryTextWithStatus = (
  query: string,
  status: string,
  field: string = 'status'
): string => [query, status ? `${field}:${status}` : ''].filter(Boolean).join(' ').trim();

// Wazuh: read query/status directly from a `history.location.search` string,
// without needing react-router hooks/context.
export const readInMemoryUrlFilterValues = (search: string): InMemoryUrlFilterValues => {
  const params = new URLSearchParams(search);
  return {
    query: params.get('query') ?? '',
    status: params.get('status') ?? '',
  };
};

// Wazuh: write query/status into `history`, preserving every other param (e.g.
// `space`) already present, mirroring useUrlFilterParams' single-replace mechanics.
export const writeInMemoryUrlFilterValues = (
  history: { location: { search: string } & Record<string, any>; replace: (arg: any) => void },
  patch: Partial<InMemoryUrlFilterValues>
): void => {
  const params = new URLSearchParams(history.location.search);
  Object.entries(patch).forEach(([key, value]) => {
    if (!value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  });
  history.replace({ ...history.location, search: params.toString() });
};
