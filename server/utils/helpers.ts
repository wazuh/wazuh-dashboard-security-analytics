/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Props, schema } from '@osd/config-schema';
import YAML from 'yaml';
import { CONTENT_INDICES } from './constants';
import type { ServerErrorKind } from '../../types/services/ServerResponse';

export function createQueryValidationSchema(fieldSchemaObj?: Props) {
  return schema.object({
    ...fieldSchemaObj,
    dataSourceId: schema.maybe(schema.string()),
  });
}

export const escapeWildcard = (value: string): string => value.replace(/[*?]/g, '\\$&');

// Wazuh: OR an id-based terms clause into an existing search query (used to fold in
// ids matched via a join, e.g. rules/decoders found through an integration name search).
export const mergeIdsClause = (query: any, field: string, ids: string[]): any => {
  if (!ids.length) {
    return query;
  }

  const idsClause = { terms: { [field]: ids } };

  if (!query || query.match_all) {
    return { bool: { should: [idsClause], minimum_should_match: 1 } };
  }

  if (query.bool) {
    const should = query.bool.should ? [...query.bool.should, idsClause] : [idsClause];
    return { ...query, bool: { ...query.bool, should, minimum_should_match: 1 } };
  }

  return { bool: { should: [query, idsClause], minimum_should_match: 1 } };
};

// Wazuh: resolve an integration-name match (wildcard search-by-text or exact
// multiSelect) to the ids of one related entity type (document.rules/decoders/
// kvdbs), shared by WazuhRuleService and DecodersService. `must` is the caller's
// already-built match+space bool clauses; `relatedField` picks which array to
// collect ids from.
export const resolveIdsByIntegrationMatch = async (
  client: any,
  must: any[],
  relatedField: 'rules' | 'decoders' | 'kvdbs',
  errorContext: string
): Promise<string[]> => {
  try {
    const response = await client('search', {
      index: CONTENT_INDICES.INTEGRATIONS,
      body: {
        size: 10000,
        query: { bool: { must } },
        _source: [`document.${relatedField}`],
      },
    });

    const ids = new Set<string>();
    (response?.hits?.hits || []).forEach((hit: any) => {
      (hit._source?.document?.[relatedField] || []).forEach((id: string) => ids.add(id));
    });
    return Array.from(ids);
  } catch (error: any) {
    console.warn(`Ruleset Management - ${errorContext}:`, extractErrorMessage(error));
    return [];
  }
};

export type EntityStatus = 'enabled' | 'disabled';

// Wazuh: build the hard status filter clause used by applyEntityFilters. Missing
// `document.enabled` counts as enabled (mirrors `rule.enabled ?? true` at resource build time).
export const buildStatusFilter = (status?: EntityStatus): any | undefined => {
  if (status === 'disabled') {
    return { term: { 'document.enabled': false } };
  }
  if (status === 'enabled') {
    return {
      bool: {
        should: [
          { term: { 'document.enabled': true } },
          { bool: { must_not: { exists: { field: 'document.enabled' } } } },
        ],
        minimum_should_match: 1,
      },
    };
  }
  if (status) {
    // Wazuh: an unrecognized status value is still an active filter — it must
    // match zero entities (mirrors the integration filter's empty-ids => zero-results
    // behavior), not silently fall back to unfiltered.
    return { bool: { must_not: { match_all: {} } } };
  }
  return undefined;
};

// Wazuh: compose the incoming (untouched) search query with hard AND filters
// (status, integration ids, ...) without diluting its `should`/`minimum_should_match`
// semantics. The incoming query is nested under `bool.must[0]`; filters are appended
// to `bool.filter`. No filters selected => `filter` is empty and the shape is stable.
export const applyEntityFilters = (
  query: any,
  opts: { status?: EntityStatus; integrationIds?: string[]; levels?: string[] }
): any => {
  const filter: any[] = [];

  const statusFilter = buildStatusFilter(opts.status);
  if (statusFilter) {
    filter.push(statusFilter);
  }

  // Wazuh: `undefined` means "no integration filter active" — an empty array means
  // the filter IS active but resolved to zero ids (e.g. a matched integration with
  // no associated decoders/rules), which must still filter down to zero results,
  // not silently fall back to unfiltered.
  if (opts.integrationIds !== undefined) {
    filter.push({ terms: { 'document.id': opts.integrationIds } });
  }

  // Wazuh: Rules-only Severity filter (field_value_selection, multiSelect 'or') —
  // same "undefined = inactive, empty array = zero results" convention as above.
  if (opts.levels !== undefined) {
    filter.push({ terms: { 'document.level': opts.levels } });
  }

  return { bool: { must: [query], filter } };
};

// This function recieves the crude yaml resource and optional extra params (e.g: integration for kvdbs or space for filters).
// The function formats the yaml to have the structure that the backend expects.
export const buildYamlBody = (resourceYaml: string, params?: Record<string, any>): string => {
  const doc = new YAML.Document();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      doc.set(key, value);
    }
  }
  doc.set('resource', YAML.parseDocument(resourceYaml).contents);
  return doc.toString({ lineWidth: 0 });
};

const asTrimmedString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const extractFromErrorBody = (body: unknown): string | undefined => {
  if (!body) {
    return undefined;
  }
  if (typeof body === 'string') {
    return extractFromStringBody(body);
  }
  if (typeof body !== 'object') {
    return undefined;
  }
  const { error: nested, message } = body as { error?: unknown; message?: unknown };
  if (nested && typeof nested === 'object') {
    const { reason, root_cause: rootCause } = nested as { reason?: unknown; root_cause?: unknown };
    const reasonMessage =
      asTrimmedString(reason) ??
      (Array.isArray(rootCause)
        ? rootCause.map((cause) => asTrimmedString(cause?.reason)).find(Boolean)
        : undefined);
    if (reasonMessage) {
      return reasonMessage;
    }
  }
  return asTrimmedString(message) ?? asTrimmedString(nested);
};

const extractFromStringBody = (raw: string): string | undefined => {
  const trimmed = asTrimmedString(raw);
  if (!trimmed) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === 'object' ? extractFromErrorBody(parsed) : undefined;
  } catch (_e) {
    // not JSON
  }
  try {
    const parsed = YAML.parse(trimmed);
    if (parsed && typeof parsed === 'object') {
      const extracted = extractFromErrorBody(parsed);
      if (extracted) {
        return extracted;
      }
    }
  } catch (_e) {
    // not YAML either
  }
  return trimmed;
};

export const extractErrorMessage = (
  error: any,
  fallback: string = 'An unexpected error occurred.'
): string => {
  try {
    return (
      extractFromErrorBody(error?.body) ??
      extractFromErrorBody(error?.response) ??
      asTrimmedString(error?.message) ??
      fallback
    );
  } catch (_e) {
    return fallback;
  }
};

// Wazuh: mechanism only, no policy. The caller supplies its own status map so
// one endpoint's error semantics never leak into another's.
export const extractErrorKind = (
  error: any,
  kindByStatus: Readonly<Record<number, ServerErrorKind>>
): ServerErrorKind | undefined => {
  try {
    const status = error?.statusCode;
    return typeof status === 'number' ? kindByStatus[status] : undefined;
  } catch (_e) {
    return undefined;
  }
};
