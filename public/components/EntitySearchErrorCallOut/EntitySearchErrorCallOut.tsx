/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { classifyEntitySearchError } from '../../utils/entitySearchBarFilters';

export interface EntitySearchErrorCallOutProps {
  /**
   * The EuiSearchBar parse error with the text that produced it, or null when the
   * query parsed. Renders nothing when there is no error.
   */
  error: { message?: string; queryText?: string } | null;
  /** The strict schema the search bar parsed against, to tell a field rejection apart. */
  schema: { fields: Record<string, unknown> };
  /**
   * The fields the free text matches, as they read in a sentence, for example
   * `id, title or author`. Named so the user learns what to type instead.
   */
  searchableFields: string;
  /**
   * The toolbar selectors this list offers, as they read in a sentence, for example
   * `Status and Integration`. Rules adds `Rule level`, so this cannot be hardcoded.
   */
  filterSelectors: string;
}

// Wazuh: ENTITY_SEARCH_SCHEMA is strict, so `document.id:<value>` is rejected as an
// unknown field. The bare rejection names no way forward, though the same value
// matches as free text. Shared by Rules, Decoders and KVDBs to word that once.
//
// The guidance renders only for a field rejection. A grammar error (a bare `or`, an
// unbalanced quote) carries its own fix in EUI's message and renders alone; adding
// "type the value on its own" there points at the field, which parsed fine.
export const EntitySearchErrorCallOut: React.FC<EntitySearchErrorCallOutProps> = ({
  error,
  schema,
  searchableFields,
  filterSelectors,
}) => {
  if (!error) {
    return null;
  }

  const isUnsupportedField =
    classifyEntitySearchError(error.queryText ?? '', schema).kind === 'unknown_field';

  return (
    <>
      <EuiCallOut
        color="warning"
        title={`Invalid search: ${error.message}`}
        data-test-subj="entitySearchErrorCallOut"
      >
        {isUnsupportedField && (
          <EuiText size="s" data-test-subj="entitySearchErrorCallOutGuidance">
            <p>
              Type the value on its own to search by {searchableFields}. Use the {filterSelectors}{' '}
              selectors to filter by those fields.
            </p>
          </EuiText>
        )}
      </EuiCallOut>
      <EuiSpacer size="l" />
    </>
  );
};
