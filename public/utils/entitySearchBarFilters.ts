/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { EuiSearchBar } from '@elastic/eui';

type Query = ReturnType<typeof EuiSearchBar.Query.parse>;

// Wazuh: shared helpers for entity pages (Rules/Decoders/KVDBs) whose Status and
// Integration filters are `field_value_selection` (multiSelect: 'or') EuiSearchBar
// filters — the same pattern Detectors already uses — persisted as a comma-joined
// list in a single URL param via useUrlFilterParams.

export const encodeMultiValue = (values: string[]): string => values.join(',');

export const decodeMultiValue = (param: string): string[] =>
  param
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

// Wazuh: read every currently-selected value for a multiSelect 'or' field out of a
// parsed EuiSearchBar Query — does not require knowing the field's possible values
// up front, so a stale value (e.g. a renamed/deleted integration) round-trips too.
export const getOrSelectedValues = (query: Query, field: string): string[] => {
  const clause = (query as any).ast?.getOrFieldClause?.(field);
  return clause && Array.isArray(clause.value) ? clause.value.map(String) : [];
};

// Wazuh: build a Query carrying the given free text plus OR clauses for each
// field/values pair — used to hydrate the EuiSearchBar's displayed query from the
// URL-owned state (mount, or a same-route CTA navigation).
export const buildQueryFromValues = (
  text: string,
  fieldValues: Array<{ field: string; values: string[] }>
): Query => {
  let query = EuiSearchBar.Query.parse(text ?? '');
  fieldValues.forEach(({ field, values }) => {
    values.forEach((value) => {
      query = query.addOrFieldValue(field, value, true, 'eq');
    });
  });
  return query;
};

// Wazuh: `Query.text` re-prints the WHOLE ast — including `field:(value)` filter
// clauses — back into query syntax, it is NOT just what the user typed in the free
// text box. Use this instead wherever "the typed search text" (as opposed to the
// full display query) is actually what's needed, e.g. the debounced text sent to
// the server and persisted as the `query` URL param.
export const getFreeText = (query: Query): string =>
  (query as any).ast
    .getTermClauses()
    .map((clause: any) => clause.value)
    .join(' ');
