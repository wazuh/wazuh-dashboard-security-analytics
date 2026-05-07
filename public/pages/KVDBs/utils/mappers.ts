/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import YAML from 'yaml';
import { LosslessNumber, stringify as LosslessStringify } from 'lossless-json';
import { KVDBDocument, KVDBMetadata, KVDBResource } from '../../../../types/KVDBs';
import { ContentEntry } from '../components/KVDBContentEditor';
import { mapYamlToLosslessObject } from '../../../components/YamlForm';

export interface KVDBFormModel {
  title: string;
  author: string;
  description: string;
  documentation: string;
  references: string[];
  supports: string[];
  enabled: boolean;
  contentEntries: ContentEntry[];
}

export const kvdbFormDefaultValue: KVDBFormModel = {
  title: '',
  author: '',
  description: '',
  documentation: '',
  references: [],
  supports: [],
  enabled: true,
  contentEntries: [],
};

// ── Private helpers ──────────────────────────────────────────────────────────

const normalizeStringArray = (value: string | string[] | undefined): string[] =>
  Array.isArray(value) ? value : value ? [value] : [];

/** Converts any content value to a display string for a form entry. */
const contentValueToString = (value: unknown): string => {
  if (value instanceof LosslessNumber) return value.toString();
  if (typeof value === 'string') return value;
  return LosslessStringify(value, null, 2) ?? JSON.stringify(value, null, 2);
};

/** Extracts shared metadata fields from a KVDBMetadata object into form fields. */
const metadataToFormFields = (metadata: KVDBMetadata | undefined) => ({
  title: metadata?.title || '',
  author: metadata?.author || '',
  description: metadata?.description || '',
  documentation: metadata?.documentation || '',
  references: normalizeStringArray(metadata?.references),
  supports: normalizeStringArray(metadata?.supports),
});

/** Converts a content object into form entries. */
const contentToEntries = (content: Record<string, unknown> | undefined): ContentEntry[] =>
  Object.entries(content ?? {}).map(([key, value]) => ({ key, value: contentValueToString(value) }));

/** Parses a single content entry value into its natural type for YAML serialization. */
const parseContentValue = (value: string): unknown => {
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (trimmed[0] === '{' || trimmed[0] === '[') {
    try {
      return JSON.parse(trimmed);
    } catch {
      // not valid JSON — fall through
    }
  }
  try {
    const parsed = YAML.parse(trimmed);
    if (typeof parsed === 'number' || typeof parsed === 'boolean') return parsed;
    if (parsed === null && (trimmed === 'null' || trimmed === '~')) return null;
  } catch {
    // not a scalar YAML value — keep as string
  }
  return value;
};

/** Converts content form entries back to an object for the API payload. */
const entriesToContentObject = (entries: ContentEntry[]): Record<string, unknown> =>
  Object.fromEntries(
    entries
      .filter(({ key }) => key.trim())
      .map(({ key, value }) => [key.trim(), parseContentValue(value)])
  );

// ── Public mappers ───────────────────────────────────────────────────────────

/** API document → form model (edit mode). */
export const mapKVDBToForm = (document: KVDBDocument): KVDBFormModel => ({
  ...metadataToFormFields(document.metadata),
  enabled: document.enabled ?? true,
  contentEntries: contentToEntries(document.content),
});

/** Form model → API resource payload. date/modified are set by the indexer. */
export const mapFormToKVDBResource = (values: KVDBFormModel): KVDBResource => ({
  metadata: {
    title: values.title,
    author: values.author,
    description: values.description,
    documentation: values.documentation,
    references: values.references,
    supports: values.supports,
  },
  enabled: values.enabled,
  content: entriesToContentObject(values.contentEntries),
});

/** Form model → YAML string (for display in the YAML editor). */
export const mapFormToYaml = (values: KVDBFormModel): string =>
  YAML.stringify(mapFormToKVDBResource(values), { lineWidth: 0 });

/** YAML string → form model. Delegates lossless numeric parsing to the shared helper. */
export const mapYamlToForm = (yamlStr: string): KVDBFormModel => {
  const parsed = mapYamlToLosslessObject<KVDBResource | null>(yamlStr);
  if (!parsed) return kvdbFormDefaultValue;
  return {
    ...metadataToFormFields(parsed.metadata),
    enabled: parsed.enabled ?? true,
    contentEntries: contentToEntries(parsed.content),
  };
};
