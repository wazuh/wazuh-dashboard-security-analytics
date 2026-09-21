/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

// Wazuh: free-text matching for the server-side lists (Rules/Decoders/KVDBs), in
// one builder so the three stay in sync.

export interface EntitySearchFields {
  /**
   * Fields mapped as `keyword` in the index. Matched as a case-insensitive
   * substring, so a fragment of the value the user sees is enough.
   */
  keywordFields: string[];
  /**
   * Fields mapped as `text` in the index. Matched with `match_phrase`, because a
   * substring `wildcard` against an analyzed field compares whole tokens.
   */
  textFields?: string[];
}

// Wazuh: `*` stays live so `apache*log` works. `?` and `\` are escaped: they carry
// no meaning here and occur in ordinary titles and descriptions.
const escapeWildcard = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/\?/g, '\\?');

/**
 * Build the free-text portion of an entity list query. Returns `match_all` when
 * there is no text, so callers can pass the box's contents straight through.
 *
 * Check the index mapping before moving a field between the two groups: matching
 * a `keyword` field with `match_phrase` only ever matches the full value.
 */
export const buildEntitySearchQuery = (
  searchText: string,
  { keywordFields, textFields = [] }: EntitySearchFields
) => {
  const trimmed = (searchText ?? '').trim();
  if (!trimmed) {
    return { match_all: {} };
  }

  return {
    bool: {
      should: [
        ...keywordFields.map((field) => ({
          wildcard: {
            [field]: {
              value: `*${escapeWildcard(trimmed)}*`,
              case_insensitive: true,
            },
          },
        })),
        ...textFields.map((field) => ({
          match_phrase: {
            [field]: trimmed,
          },
        })),
      ],
      minimum_should_match: 1,
    },
  };
};
