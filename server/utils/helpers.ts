/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Props, schema } from '@osd/config-schema';
import YAML from 'yaml';

export function createQueryValidationSchema(fieldSchemaObj?: Props) {
  return schema.object({
    ...fieldSchemaObj,
    dataSourceId: schema.maybe(schema.string()),
  });
}

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
