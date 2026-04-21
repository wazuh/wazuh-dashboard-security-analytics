/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { dump, load } from 'js-yaml';
import {
  FilterCheck,
  FilterCheckListItem,
  FilterDocument,
  FilterResource,
} from '../../../../types/Filters';

export interface FilterFormModel {
  name: string;
  type: string;
  check: string;
  enabled: boolean;
  author: string;
  description: string;
  documentation: string;
  references: string[];
  supports: string[];
}

export const filterFormDefaultValue: FilterFormModel = {
  name: '',
  type: 'pre-filter',
  check: '',
  enabled: true,
  author: '',
  description: '',
  documentation: '',
  references: [],
  supports: [],
};

const isCheckListItem = (value: unknown): value is FilterCheckListItem =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isCheckList = (value: unknown): value is FilterCheckListItem[] =>
  Array.isArray(value) && value.every(isCheckListItem);

export const checkToYamlString = (check: FilterCheck | undefined): string => {
  if (check === undefined || check === null) return '';
  if (typeof check === 'string') return check;
  if (!Array.isArray(check)) return '';
  try {
    return dump(check).trimEnd();
  } catch {
    return '';
  }
};

export type FilterCheckParseResult =
  | { ok: true; value: FilterCheck }
  | { ok: false; error: string };

export const parseCheckYaml = (yamlText: string): FilterCheckParseResult => {
  const text = yamlText ?? '';
  if (!text.trim()) {
    return { ok: false, error: 'Check is required' };
  }
  let parsed: unknown;
  try {
    parsed = load(text);
  } catch (err) {
    return { ok: false, error: `Invalid YAML: ${(err as Error).message}` };
  }
  if (typeof parsed === 'string') {
    return { ok: true, value: parsed };
  }
  if (isCheckList(parsed)) {
    return { ok: true, value: parsed };
  }
  if (Array.isArray(parsed)) {
    return {
      ok: false,
      error:
        'Each list item must be a field/value pair (e.g. "- host.os.platform: ubuntu"), not a plain value.',
    };
  }
  if (isCheckListItem(parsed)) {
    const keys = Object.keys(parsed);
    if (keys.length === 1 && keys[0] === 'check') {
      return {
        ok: false,
        error:
          'Do not include the "check:" key; write only its value (an expression or a YAML list).',
      };
    }
    return {
      ok: false,
      error:
        'Check cannot be a single object. Use an expression string or a YAML list (each item prefixed with "- ").',
    };
  }
  return {
    ok: false,
    error: 'Check must be an expression string or a YAML list of field/value items.',
  };
};

export const mapFilterToForm = (document: FilterDocument): FilterFormModel => {
  const author = document.metadata?.author;
  return {
    name: document.name ?? '',
    type: document.type ?? '',
    check: checkToYamlString(document.check),
    enabled: document.enabled ?? true,
    author: typeof author === 'string' ? author : author?.name ?? '',
    description: document.metadata?.description ?? '',
    documentation: document.metadata?.documentation ?? '',
    references: document.metadata?.references ?? [],
    supports: document.metadata?.supports ?? [],
  };
};

export const mapFormToFilterResource = (values: FilterFormModel): FilterResource => {
  const now = new Date().toISOString();
  const parsed = parseCheckYaml(values.check);
  const check: FilterCheck = parsed.ok ? parsed.value : values.check;
  return {
    name: values.name,
    type: values.type,
    check,
    enabled: values.enabled,
    metadata: {
      title: values.name,
      author: values.author?.trim() ?? '',
      date: now,
      modified: now,
      description: values.description || '',
      documentation: values.documentation || '',
      references: values.references,
      supports: values.supports,
    },
  };
};
