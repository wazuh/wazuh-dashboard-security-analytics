/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { buildEntitySearchQuery } from '../../../utils/entitySearchQuery';

// Wazuh: cti-decoders maps `document.metadata.title` as `keyword`, like the id, name
// and author, so it belongs in this group and not in the text one.
const KEYWORD_SEARCH_FIELDS = [
  'document.id',
  'document.name',
  'document.metadata.title',
  'document.metadata.author',
];

const TEXT_SEARCH_FIELDS = ['document.metadata.description'];

// Wazuh: fields the free text matches, worded for the search error callout. Keep in
// step with KEYWORD_SEARCH_FIELDS.
export const DECODERS_SEARCHABLE_FIELDS_LABEL = 'id, name, title or author';

export const decoderFormDefaultValue: string = `name: decoder/<name>/<version>
enabled: true
metadata:
  title: Placeholder Decoder
  description: This is a placeholder decoder. Please update the fields accordingly.
  author: User
  references: []
  documentation: ''
  supports: []`;

export const buildDecodersSearchQuery = (searchText: string) =>
  buildEntitySearchQuery(searchText, {
    keywordFields: KEYWORD_SEARCH_FIELDS,
    textFields: TEXT_SEARCH_FIELDS,
  });
