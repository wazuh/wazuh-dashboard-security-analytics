/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import YAML from 'yaml';
import { LosslessNumber } from 'lossless-json';
import { KVDBDocument, KVDBMetadata, KVDBResource } from '../../../../types/KVDBs';
import { ContentEntry } from '../components/KVDBContentEditor';

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

/**
 * Convert from API document to form model (for edit mode)
 */
export const mapKVDBToForm = (document: KVDBDocument): KVDBFormModel => {
  const metadata = document.metadata;
  const refs = metadata?.references;
  const references = Array.isArray(refs) ? refs : refs ? [refs] : [];

  const contentEntries: ContentEntry[] = [];
  if (document.content && typeof document.content === 'object') {
    for (const [key, value] of Object.entries(document.content)) {
      contentEntries.push({
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value, null, 2),
      });
    }
  }

  const supportsRaw = metadata?.supports;
  const supports = Array.isArray(supportsRaw) ? supportsRaw : supportsRaw ? [supportsRaw] : [];

  return {
    title: metadata?.title || '',
    author: metadata?.author || '',
    description: metadata?.description || '',
    documentation: metadata?.documentation || '',
    references,
    supports,
    enabled: document.enabled ?? true,
    contentEntries,
  };
};

/**
 * Convert content entries back to an object for the API payload.
 */
const entriesToContentObject = (entries: ContentEntry[]): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const entry of entries) {
    const key = entry.key.trim();
    if (!key) continue;

    const trimmed = entry.value.trim();
    if (trimmed[0] === '{' || trimmed[0] === '[') {
      try {
        result[key] = JSON.parse(trimmed);
        continue;
      } catch {
        // invalid JSON, store as string
      }
    }
    result[key] = entry.value;
  }
  return result;
};

/**
 * Convert from form model to API resource payload.
 * Note: date and modified are set by the indexer; do not send them.
 */
export const mapFormToKVDBResource = (values: KVDBFormModel): KVDBResource => {
  return {
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
  };
};

/**
 * Serialize a form model to a YAML string for display in the YAML editor.
 */
export const mapFormToYaml = (values: KVDBFormModel): string => {
  return YAML.stringify(mapFormToKVDBResource(values), { lineWidth: 0 });
};

/**
 * Parse a YAML string into a form model.
 * Uses LosslessNumber to preserve exact numeric string representations
 * (e.g. 3.14159265358979323846 stays as that string, not a JS float).
 */
export const mapYamlToForm = (yamlStr: string): KVDBFormModel => {
  const doc = YAML.parseDocument(yamlStr);

  YAML.visit(doc, {
    Scalar(_, node) {
      if (typeof node.value === 'number') {
        let rawText: string;
        if (node.range && node.range.length >= 2) {
          rawText = yamlStr.slice(node.range[0], node.range[1]).trim();
        } else {
          rawText = String(node.value);
          if (!rawText.includes('.')) rawText += '.0';
        }
        node.value = new LosslessNumber(rawText);
      }
    },
  });

  const parsed = doc.toJS() as KVDBResource | null;
  if (!parsed) return kvdbFormDefaultValue;

  const metadata = (parsed.metadata || {}) as KVDBMetadata;
  const refs = metadata.references;
  const references = Array.isArray(refs) ? refs : refs ? [refs] : [];
  const supportsRaw = metadata.supports;
  const supports = Array.isArray(supportsRaw) ? supportsRaw : supportsRaw ? [supportsRaw] : [];

  const contentEntries: ContentEntry[] = Object.entries(parsed.content ?? {}).map(
    ([key, value]) => ({
      key,
      value:
        value instanceof LosslessNumber
          ? value.toString()
          : typeof value === 'string'
          ? value
          : JSON.stringify(value, null, 2),
    })
  );

  return {
    title: metadata.title || '',
    author: metadata.author || '',
    description: metadata.description || '',
    documentation: metadata.documentation || '',
    references,
    supports,
    enabled: parsed.enabled ?? true,
    contentEntries,
  };
};
