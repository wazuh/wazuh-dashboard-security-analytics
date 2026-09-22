/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { EuiSearchBar } from '@elastic/eui';
import { startCase } from 'lodash';
import {
  FieldValueOptionType,
  FieldValueSelectionFilterConfigType,
} from '@elastic/eui/src/components/search_bar/filters/field_value_selection_filter';
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

// Wazuh: read every selected value for a field out of a parsed EuiSearchBar Query.
// It needs no list of the field's possible values, so a stale one (a renamed or
// deleted integration) round-trips too.
//
// EUI stores a field clause in two shapes: the filter popover's addOrFieldValue
// produces an ARRAY value, printed as `integration:(auditd)`; a hand-typed
// `level:high` produces a SCALAR value. Both are read here, so the typed and the
// clicked form mean the same thing.
export const getOrSelectedValues = (query: Query, field: string): string[] => {
  const clauses = (query as any).ast?.getFieldClauses?.(field);
  if (!Array.isArray(clauses)) {
    return [];
  }

  return (
    clauses
      // Wazuh: a negated `-status:enabled` excludes the value, so it is not a selection.
      .filter((clause: any) => clause.match === undefined || clause.match === 'must')
      .flatMap((clause: any) => (Array.isArray(clause.value) ? clause.value : [clause.value]))
      .filter((value: unknown) => value !== undefined && value !== null)
      .map(String)
  );
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

// Wazuh: overrides letting non-Rules/Decoders/KVDBs consumers (e.g. Detectors)
// reuse this helper for their own Integration filter without inheriting the
// Enabled/Disabled Status semantics — see StatusIntegrationFilterOverrides.
export interface StatusIntegrationFilterOverrides {
  /** Field the Integration filter targets. Default: 'integration' (used by Rules/Decoders/KVDBs/Detectors). */
  integrationField?: string;
  /** Status filter options. Default: Enabled/Disabled. */
  statusOptions?: FieldValueOptionType[];
  /**
   * Ready-made Integration options; supersedes `integrationOptions` entirely.
   * Needed for consumers (e.g. Detectors' `getLogTypeFilterOptionsFlat()`) whose
   * options are not the `{ value, label }` IntegrationOption shape.
   */
  integrationFilterOptions?: FieldValueOptionType[];
}

// Wazuh: the Status/Integration `field_value_selection` EuiSearchBar filter config,
// shared by Rules/Decoders/KVDBs — identical across all three except the
// Integration options themselves. `overrides` lets other consumers (e.g.
// Detectors) reuse the Integration half with a different field name/options
// without pulling in the Enabled/Disabled Status semantics.
export const buildStatusIntegrationFilters = (
  integrationOptions: IntegrationOption[],
  integrationOptionsLoading: boolean,
  overrides: StatusIntegrationFilterOverrides = {}
): FieldValueSelectionFilterConfigType[] => {
  const {
    integrationField = 'integration',
    statusOptions = [
      { value: 'enabled', name: 'Enabled' },
      { value: 'disabled', name: 'Disabled' },
    ],
    integrationFilterOptions,
  } = overrides;

  return [
    {
      type: 'field_value_selection',
      field: 'status',
      name: 'Status',
      compressed: true,
      multiSelect: 'or',
      // Wazuh: EUI's default 'eq' operator matches by substring, not equality —
      // 'exact' avoids one option's value silently matching another's.
      operator: 'exact',
      options: statusOptions,
    },
    {
      type: 'field_value_selection',
      field: integrationField,
      name: 'Integration',
      compressed: true,
      multiSelect: 'or',
      operator: 'exact',
      loading: integrationOptionsLoading,
      // Wazuh: user-friendly display name (e.g. `cisco-meraki` -> `Cisco Meraki`),
      options:
        integrationFilterOptions ??
        integrationOptions
          .map((option) => ({
            value: option.value,
            name: startCase(option.label),
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
    },
  ] as FieldValueSelectionFilterConfigType[];
};

// Wazuh: strict schema so unrecognized field names (e.g. `pepo:pepe`) raise a
// parse error instead of being silently dropped. Only status/integration are
// declared — the only fields Rules/Decoders/KVDBs actually filter by. A field
// that exists on the document (e.g. `author`, `document.id`) but isn't wired
// to a real filter deliberately errors the same as a made-up one: declaring
// it "valid but inert" just hides the same silent-drop bug this schema fixes.
// No `validate()`: unrecognized values (e.g. `status:pepo`) stay a
// server-side no-match.
export const ENTITY_SEARCH_SCHEMA = {
  strict: true,
  fields: {
    status: { type: 'string' },
    integration: { type: 'string' },
  },
};

// Wazuh: true when a clause for one of these fields has a scalar value, the shape a
// typed `field:value` produces; the popover writes arrays (see getOrSelectedValues).
// Callers debounce typed clauses like free text and apply popover clauses at once.
export const hasTypedFieldClause = (query: Query, fields: string[]): boolean =>
  fields.some((field) =>
    ((query as any).ast?.getFieldClauses?.(field) ?? []).some(
      (clause: any) => !Array.isArray(clause.value)
    )
  );

export type EntitySearchErrorClass =
  | { kind: 'unknown_field'; fields: string[] }
  | { kind: 'syntax' };

// Wazuh: EuiSearchBar reports every parse failure as the same SyntaxError with no
// error code. Re-parsing the text without a schema separates the two classes: the
// text still fails to parse (grammar error), or it parses and names fields the strict
// schema does not declare (field rejection). No dependence on EUI's message wording.
export const classifyEntitySearchError = (
  queryText: string,
  schema: { fields: Record<string, unknown> }
): EntitySearchErrorClass => {
  let query: Query;
  try {
    query = EuiSearchBar.Query.parse(queryText ?? '');
  } catch {
    return { kind: 'syntax' };
  }
  const fields: string[] = (query as any).ast?.getFieldNames?.() ?? [];
  const unknown = fields.filter((field) => !(field in schema.fields));
  return unknown.length ? { kind: 'unknown_field', fields: unknown } : { kind: 'syntax' };
};

// Wazuh: the selectors a rejected search points at, named as they read in the
// toolbar. Kept next to the schema: a list that declares a third field (see
// RULES_SEARCH_SCHEMA) names its third selector here too.
export const ENTITY_FILTER_SELECTORS_LABEL = 'Status and Integration';

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
