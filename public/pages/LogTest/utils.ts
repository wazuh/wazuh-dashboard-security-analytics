/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { METADATA_FIELDS } from './constants';

export interface MetadataEntry {
  key: string;
  value: string;
}

/** Converts a flat array of {key, value} dotted path entries into a nested object.
 *  Number-typed fields are cast to number. Empty keys/values are skipped.
 *  e.g. [{ key: 'agent.id', value: '1' }] => { agent: { id: 1 } }
 */
export function buildMetadataObject(
  entries: MetadataEntry[]
): Record<string, string | number | object> {
  const result: Record<string, any> = {};

  for (const { key, value } of entries) {
    if (!key || value === '') continue;

    const parts = key.split('.');
    let cursor = result;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!cursor[parts[i]] || typeof cursor[parts[i]] !== 'object') {
        cursor[parts[i]] = {};
      }
      cursor = cursor[parts[i]];
    }

    const leaf = parts[parts.length - 1];
    const fieldDef = METADATA_FIELDS.find((f) => f.key === key);
    cursor[leaf] = fieldDef?.type === 'number' ? Number(value) : value;
  }

  return result;
}

/** Counts the leaves of a normalized output object, so nested fields are not counted twice. */
export function countNormalizedFields(output: unknown): number {
  if (!output || typeof output !== 'object') return 0;
  if (Array.isArray(output)) return output.length ? 1 : 0;

  return Object.values(output as Record<string, unknown>).reduce<number>((total, value) => {
    const isPlainObject = !!value && typeof value === 'object' && !Array.isArray(value);
    return total + (isPlainObject ? countNormalizedFields(value) : 1);
  }, 0);
}

export interface LogTestVerdict {
  /** Plain-language outcome, replacing the engine's raw status code. */
  text: string;
  color: 'success' | 'warning' | 'danger';
}

/**
 * Wazuh: the engine returns a status code, which said nothing to the user. The wording
 * follows the published docs, which define the tool as validating that an event "is
 * correctly parsed by active decoders" and then testing "detection logic".
 */
export function buildLogTestVerdict(args: {
  normalizationStatus?: string;
  detectionStatus?: string;
  fieldCount: number;
  rulesMatched: number;
}): LogTestVerdict {
  const { normalizationStatus, detectionStatus, fieldCount, rulesMatched } = args;

  if (normalizationStatus === 'error') {
    return { text: 'Not parsed by active decoders', color: 'danger' };
  }

  const parsed = `Parsed by active decoders into ${fieldCount} ${
    fieldCount === 1 ? 'field' : 'fields'
  }`;

  if (detectionStatus === 'error') {
    return { text: `${parsed}, detection logic failed`, color: 'danger' };
  }

  if (detectionStatus === 'skipped') {
    return { text: `${parsed}, detection logic skipped`, color: 'warning' };
  }

  if (rulesMatched > 0) {
    return {
      text: `${parsed}, ${rulesMatched} ${rulesMatched === 1 ? 'rule' : 'rules'} matched`,
      color: 'success',
    };
  }

  return { text: `${parsed}, no rules matched`, color: 'warning' };
}
