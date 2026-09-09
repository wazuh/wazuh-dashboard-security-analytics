/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Raised when a document parses as YAML but is not shaped like a rule. Kept
 * apart from a parse failure so the editor can say which of the two happened.
 */
export class RuleShapeError extends Error {}

// Descriptive fields live under `metadata` across every catalog resource, and the
// indexer rejects a document without it. Naming them here keeps the editor's
// message specific about where they belong.
export const RULE_METADATA_FIELDS = [
  'title',
  'author',
  'description',
  'references',
  'documentation',
  'supports',
  'date',
  'modified',
] as const;

export const assertRuleShape = (obj: unknown): Record<string, any> => {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    throw new RuleShapeError('The rule must be a YAML mapping of rule fields.');
  }

  const source = obj as Record<string, any>;
  const misplaced = RULE_METADATA_FIELDS.filter((field) => source[field] !== undefined);

  if (misplaced.length) {
    throw new RuleShapeError(`These fields belong under metadata: ${misplaced.join(', ')}.`);
  }

  return source;
};
