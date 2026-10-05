/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { dump, load } from 'js-yaml';

export interface MitreEntry {
  id: string;
  name: string;
}

export interface MitreState {
  tactic: MitreEntry[];
  technique: MitreEntry[];
  subtechnique: MitreEntry[];
}

export interface MitreSection {
  field: keyof MitreState;
  title: string;
  idPlaceholder: string;
  namePlaceholder: string;
  addButtonName: string;
}

export const MITRE_SECTIONS: MitreSection[] = [
  {
    field: 'tactic',
    title: 'Tactics',
    idPlaceholder: 'e.g. TA0001',
    namePlaceholder: 'e.g. Initial Access',
    addButtonName: 'Add tactic',
  },
  {
    field: 'technique',
    title: 'Techniques',
    idPlaceholder: 'e.g. T1078',
    namePlaceholder: 'e.g. Valid Accounts',
    addButtonName: 'Add technique',
  },
  {
    field: 'subtechnique',
    title: 'Sub-techniques',
    idPlaceholder: 'e.g. T1078.001',
    namePlaceholder: 'e.g. Default Accounts',
    addButtonName: 'Add sub-technique',
  },
];

export const MITRE_CATEGORIES = MITRE_SECTIONS.map((section) => section.field);

export interface MitreParseResult {
  state: MitreState;
  errors: string[];
}

function emptyMitreState(): MitreState {
  return { tactic: [], technique: [], subtechnique: [] };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isScalar(value: unknown): boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

// A single value is valid shorthand for a one-entry list: the indexer accepts it and
// prepackaged content relies on it (the SCA rules use '{{check.mitre.tactic.id}}').
function toList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [value];
}

function parseMitreColumn(
  category: string,
  key: 'id' | 'name',
  raw: unknown,
  errors: string[]
): string[] {
  return toList(raw).map((item, index) => {
    if (!isScalar(item)) {
      errors.push(`'mitre.${category}.${key}[${index}]' must be a single value.`);
      return '';
    }
    const text = String(item).trim();
    if (!text) {
      errors.push(`'mitre.${category}.${key}[${index}]' cannot be empty.`);
    }
    return text;
  });
}

interface CategoryParseResult {
  entries: MitreEntry[];
  errors: string[];
}

function parseMitreCategory(category: string, value: unknown): CategoryParseResult {
  if (!isPlainObject(value)) {
    return {
      entries: [],
      errors: [`'mitre.${category}' must be an object with 'id' and 'name' lists.`],
    };
  }

  const errors: string[] = [];

  const unsupported = Object.keys(value).filter((key) => key !== 'id' && key !== 'name');
  if (unsupported.length) {
    errors.push(
      `'mitre.${category}' contains unsupported key(s) [${unsupported.join(
        ', '
      )}]; expected 'id' and/or 'name'.`
    );
  }

  const hasId = value.id !== undefined;
  const hasName = value.name !== undefined;
  if (!hasId && !hasName) {
    errors.push(`'mitre.${category}' must define both 'id' and 'name'.`);
    return { entries: [], errors };
  }
  if (!hasId) {
    errors.push(`'mitre.${category}.id' is required when 'name' is present.`);
  }
  if (!hasName) {
    errors.push(`'mitre.${category}.name' is required when 'id' is present.`);
  }

  const ids = hasId ? parseMitreColumn(category, 'id', value.id, errors) : [];
  const names = hasName ? parseMitreColumn(category, 'name', value.name, errors) : [];

  if (hasId && hasName && ids.length !== names.length) {
    errors.push(
      `'mitre.${category}.id' and 'mitre.${category}.name' must have the same number of ` +
        `entries (got ${ids.length} and ${names.length}).`
    );
  }

  const length = Math.max(ids.length, names.length);
  const entries = Array.from({ length }, (_, i) => ({ id: ids[i] ?? '', name: names[i] ?? '' }));

  return { entries, errors };
}

/**
 * Parse the `mitre` YAML block, reporting every structural problem instead of
 * silently discarding what does not fit the expected shape.
 */
export function parseMitreYmlWithErrors(yml: string): MitreParseResult {
  let parsed: unknown;
  try {
    parsed = yml ? load(yml) : null;
  } catch (error: any) {
    return {
      state: emptyMitreState(),
      errors: [`'mitre' is not valid YAML: ${error?.message ?? 'parse error'}`],
    };
  }

  if (parsed === null || parsed === undefined || parsed === '') {
    return { state: emptyMitreState(), errors: [] };
  }

  if (!isPlainObject(parsed)) {
    return {
      state: emptyMitreState(),
      errors: [`'mitre' must be an object containing 'tactic', 'technique' and/or 'subtechnique'.`],
    };
  }

  const errors: string[] = [];

  const unsupported = Object.keys(parsed).filter(
    (key) => !MITRE_CATEGORIES.includes(key as keyof MitreState)
  );
  if (unsupported.length) {
    errors.push(
      `'mitre' contains unsupported ${
        unsupported.length > 1 ? 'categories' : 'category'
      } [${unsupported.join(', ')}]; expected one of [${MITRE_CATEGORIES.join(', ')}].`
    );
  }

  const state = emptyMitreState();
  for (const category of MITRE_CATEGORIES) {
    if (parsed[category] === undefined) continue;
    const result = parseMitreCategory(category, parsed[category]);
    state[category] = result.entries;
    errors.push(...result.errors);
  }

  return { state, errors };
}

export function parseMitreYml(yml: string): MitreState {
  return parseMitreYmlWithErrors(yml).state;
}

export function dumpMitreYml(state: MitreState): string {
  const obj: Record<string, { id: string[]; name: string[] }> = {};
  for (const key of ['tactic', 'technique', 'subtechnique'] as const) {
    const entries = state[key].filter((e) => e.id || e.name);
    if (entries.length) {
      obj[key] = {
        id: entries.map((e) => e.id),
        name: entries.map((e) => e.name),
      };
    }
  }
  return Object.keys(obj).length ? dump(obj) : '';
}
