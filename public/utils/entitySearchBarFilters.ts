/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { EuiSearchBar } from '@elastic/eui';
import { FieldValueSelectionFilterConfigType } from '@elastic/eui/src/components/search_bar/filters/field_value_selection_filter';
import { IntegrationOption } from '../components/IntegrationComboBox/useIntegrationSelector';

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
const buildQueryFromValues = (
  text: string,
  fieldValues: Array<{ field: string; values: unknown[] }>
): Query => {
  let query = EuiSearchBar.Query.parse(text ?? '');
  fieldValues.forEach(({ field, values }) => {
    values.forEach((value) => {
      query = query.addOrFieldValue(field, value, true, 'eq');
    });
  });
  return query;
};

// Wazuh: the Status filter's clause values are 'enabled'/'disabled', not the
// bareword tokens 'true'/'false' — EUI's query grammar auto-casts unquoted
// true/false to real booleans on re-parse, which desyncs the filter popover's
// own checkbox/badge state from the query. These convert only at the URL
// boundary, where 'enabled=true,false' reads clearer than 'enabled=enabled,disabled'.
export const encodeEnabledValues = (values: string[]): string =>
  encodeMultiValue(values.map((v) => (v === 'enabled' ? 'true' : 'false')));

export const decodeEnabledValues = (param: string): string[] =>
  decodeMultiValue(param).map((v) => (v === 'true' ? 'enabled' : 'disabled'));

// Wazuh: rebuild the Status/Integration portion of the EuiSearchBar's Query from
// urlFilters.values — shared by Rules/Decoders/KVDBs, whose only difference is the
// free-text placeholder shown in the box.
export const buildStatusIntegrationQueryFromUrl = (values: {
  query: string;
  enabled: string;
  integration: string;
}): Query =>
  buildQueryFromValues(values.query, [
    { field: 'status', values: decodeEnabledValues(values.enabled) },
    { field: 'integration', values: decodeMultiValue(values.integration) },
  ]);

// Wazuh: the Status/Integration `field_value_selection` EuiSearchBar filter config,
// shared by Rules/Decoders/KVDBs — identical across all three except the
// Integration options themselves.
export const buildStatusIntegrationFilters = (
  integrationOptions: IntegrationOption[],
  integrationOptionsLoading: boolean
): FieldValueSelectionFilterConfigType[] =>
  [
    {
      type: 'field_value_selection',
      field: 'status',
      name: 'Status',
      compressed: true,
      multiSelect: 'or',
      options: [
        { value: 'enabled', name: 'Enabled' },
        { value: 'disabled', name: 'Disabled' },
      ],
    },
    {
      type: 'field_value_selection',
      field: 'integration',
      name: 'Integration',
      compressed: true,
      multiSelect: 'or',
      loading: integrationOptionsLoading,
      options: integrationOptions.map((option) => ({
        value: option.value,
        name: option.label,
      })),
    },
  ] as FieldValueSelectionFilterConfigType[];

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
