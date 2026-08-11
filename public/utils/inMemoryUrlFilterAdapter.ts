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

// Wazuh: a multiSelect 'or' field_value_selection filter with 2+ values renders as
// "field:(a or b)" (with spaces inside the parens), not "field:a" — the token must
// match the whole parenthesized group, not stop at the first whitespace.
const buildStatusTokenRegex = (field: string) =>
  new RegExp(`(?:^|\\s)${field}:(\\([^)]*\\)|\\S+)`, 'i');

// Wazuh: normalize a matched token ("(enabled or disabled)" or "enabled") into the
// same comma-joined shape the server-paginated tables persist for multi-select
// values (see encodeMultiValue in entitySearchBarFilters.ts).
const parseStatusToken = (token: string): string => {
  const inner = token.startsWith('(') && token.endsWith(')') ? token.slice(1, -1) : token;
  return inner
    .split(/\s+or\s+/i)
    .map((value) => value.trim())
    .filter(Boolean)
    .join(',');
};

// Wazuh: EuiSearchBar's free-text `query.text` embeds structured field clauses
// (e.g. "aws status:enabled" or "aws status:(enabled or disabled)") when
// box.schema is enabled. Split it back into the plain free-text part and the
// status value, so both can be persisted as separate URL params (`query`,
// `status`) like the server-paginated tables.
export const splitStatusFromQueryText = (
  text: string,
  field: string = 'status'
): InMemoryUrlFilterValues => {
  const regex = buildStatusTokenRegex(field);
  const match = text.match(regex);
  const status = match ? parseStatusToken(match[1]) : '';
  const query = text.replace(regex, '').trim();
  return { query, status };
};

// Wazuh: inverse of splitStatusFromQueryText — recombine query + status into the
// text EuiSearchBar.Query.parse expects, to seed `search.defaultQuery` on mount.
// `status` may be a single value or a comma-joined list (multiSelect 'or').
export const buildQueryTextWithStatus = (
  query: string,
  status: string,
  field: string = 'status'
): string => {
  const values = status
    ? status
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    : [];
  const token =
    values.length > 1
      ? `${field}:(${values.join(' or ')})`
      : values.length === 1
      ? `${field}:${values[0]}`
      : '';
  return [query, token].filter(Boolean).join(' ').trim();
};

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
