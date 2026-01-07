/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export const DECODER_SEARCH_FIELDS = [
  'document.name',
  'document.metadata.title',
  'document.metadata.module',
  'document.metadata.description',
  'document.metadata.compatibility',
  'document.metadata.versions',
];

export const buildDecodersSearchQuery = (searchText: string) => {
  const trimmed = searchText.trim();
  if (!trimmed) {
    return { match_all: {} };
  }

  return {
    simple_query_string: {
      query: trimmed,
      fields: DECODER_SEARCH_FIELDS,
      default_operator: 'and',
    },
  };
};
